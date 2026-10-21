const User = require("../../models/auth");
const Transaction = require("../../models/transaction");
const GiftCard = require("../../models/giftCard");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Library = require("../../models/Library");
const crypto = require("crypto");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findGiftCardCode = (code) => {
  const flexibleCode = code.split("").map(escapeRegex).join("-*");
  return GiftCard.findOne({ "codes.code": new RegExp(`^${flexibleCode}$`, "i") });
};

exports.getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId).select("balance").lean();
    if (!user) {
      return res.status(404).json({
        meta: { code: 404, message: "User not found" },
      });
    }

    const transactions = await Transaction.find({
      userId: req.authUserId,
      status: { $in: ["success", "refund"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "orderId transactionType reason spentType amount status createdAt"
      )
      .lean();

    let runningBalance = Number.isFinite(user.balance) ? user.balance : 0;
    const ledger = transactions.map((transaction) => {
      const amount =
        ["withdrawal", "purchase"].includes(transaction.transactionType)
          ? -Math.abs(transaction.amount)
          : Math.abs(transaction.amount);
      const entry = {
        id: String(transaction._id),
        orderId: transaction.orderId || "",
        description:
          transaction.reason || transaction.spentType || "Wallet transaction",
        type: transaction.spentType || transaction.transactionType,
        amount,
        balance: runningBalance,
        status: transaction.status,
        createdAt: transaction.createdAt,
      };
      runningBalance -= amount;
      return entry;
    });

    return res.json({
      data: {
        balance: Number.isFinite(user.balance) ? user.balance : 0,
        currency: "INR",
        transactions: ledger,
      },
      meta: { code: 200, message: "Wallet loaded" },
    });
  } catch (error) {
    return next(error);
  }
};

exports.redeemGiftCard = async (req, res, next) => {
  const code = String(req.body?.code || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!code) {
    return res.status(400).json({ meta: { code: 400, message: "Enter a valid gift card code." } });
  }

  try {
    const giftCard = await findGiftCardCode(code);
    if (!giftCard) {
      return res.status(404).json({ meta: { code: 404, message: "Gift card code was not found." } });
    }

    const cardCode = giftCard.codes.find((entry) => {
      const normalizedStoredCode = entry.code.replace(/[^a-z0-9]/gi, "").toUpperCase();
      return normalizedStoredCode === code;
    });
    if (!cardCode) {
      return res.status(404).json({ meta: { code: 404, message: "Gift card code was not found." } });
    }
    if (cardCode.redeemedAt || cardCode.redeemedBy) {
      return res.status(409).json({ meta: { code: 409, message: "This gift card has already been redeemed." } });
    }

    const now = new Date();
    if (giftCard.expiresAt && new Date(giftCard.expiresAt) <= now) {
      return res.status(410).json({ meta: { code: 410, message: "This gift card code has expired." } });
    }

    const claimedCard = await GiftCard.findOneAndUpdate(
      {
        _id: giftCard._id,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        codes: { $elemMatch: { code: cardCode.code, redeemedAt: null, redeemedBy: null } },
      },
      { $set: { "codes.$.redeemedBy": req.authUserId, "codes.$.redeemedAt": now } },
      { new: true },
    );

    if (!claimedCard) {
      const currentCard = await findGiftCardCode(code);
      const currentCode = currentCard?.codes.find((entry) => entry.code === cardCode.code);
      if (currentCode?.redeemedAt || currentCode?.redeemedBy) {
        return res.status(409).json({ meta: { code: 409, message: "This gift card has already been redeemed." } });
      }
      if (currentCard?.expiresAt && new Date(currentCard.expiresAt) <= new Date()) {
        return res.status(410).json({ meta: { code: 410, message: "This gift card code has expired." } });
      }
      return res.status(409).json({ meta: { code: 409, message: "This gift card could not be redeemed. Please try again." } });
    }

    let walletCredited = false;
    try {
      const user = await User.findByIdAndUpdate(
        req.authUserId,
        { $inc: { balance: giftCard.amount } },
        { new: true, projection: { balance: 1 } },
      );
      if (!user) throw new Error("User not found while redeeming gift card.");
      walletCredited = true;

      await Transaction.create({
        userId: req.authUserId,
        transactionType: "deposit",
        reason: "Gift card redemption",
        spentType: "top-up",
        paymentMethod: "manual",
        amount: giftCard.amount,
        status: "success",
      });

      return res.json({
        data: { amount: giftCard.amount, balance: user.balance, currency: "INR" },
        meta: { code: 200, message: "Gift card redeemed successfully." },
      });
    } catch (error) {
      if (walletCredited) {
        await User.updateOne({ _id: req.authUserId }, { $inc: { balance: -giftCard.amount } }).catch(() => {});
      }
      await GiftCard.updateOne(
        { _id: giftCard._id, "codes.code": cardCode.code, "codes.redeemedBy": req.authUserId },
        { $set: { "codes.$.redeemedBy": null, "codes.$.redeemedAt": null } },
      ).catch(() => {});
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

exports.purchaseWithWallet = async (req, res, next) => {
  let chargedAmount = 0;
  let purchasedGameIds = [];
  let transactionId = null;
  let salesUpdated = false;
  try {
    const cart = await Cart.findOne({ userId: req.authUserId }).populate({ path: "items.productId", match: { isActive: true } });
    const products = (cart?.items || []).map((item) => item.productId).filter(Boolean);
    if (!products.length) return res.status(400).json({ meta: { code: 400, message: "Your cart is empty." } });
    if (products.length !== (cart?.items || []).length) return res.status(409).json({ meta: { code: 409, message: "One or more games in your cart are no longer available." } });

    const total = products.reduce((sum, product) => {
      const discounted = product.isDiscountActive && product.discountPrice != null && product.discountPrice < product.price;
      return sum + Number(discounted ? product.discountPrice : product.price);
    }, 0);
    if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ meta: { code: 400, message: "The cart total is invalid." } });

    const currentLibrary = await Library.findOne({ userId: req.authUserId });
    const ownedIds = new Set((currentLibrary?.games || []).map((entry) => String(entry.gameId)));
    if (products.some((product) => ownedIds.has(String(product._id))))
      return res.status(409).json({ meta: { code: 409, message: "Your cart contains a game that is already in your library." } });

    const user = await User.findOneAndUpdate(
      { _id: req.authUserId, balance: { $gte: total } },
      { $inc: { balance: -total } },
      { new: true, projection: { balance: 1 } },
    );
    if (!user) return res.status(400).json({ meta: { code: 400, message: "Your Vapor Wallet balance does not cover this purchase." } });
    chargedAmount = total;

    const library = currentLibrary || await Library.create({ userId: req.authUserId, games: [], totalGames: 0, totalPlayTime: 0 });
    purchasedGameIds = products.map((product) => product._id);
    products.forEach((product) => {
      const pricePaid = product.isDiscountActive && product.discountPrice != null && product.discountPrice < product.price ? product.discountPrice : product.price;
      library.games.push({ gameId: product._id, gameName: product.name, purchaseDate: new Date(), purchasePrice: pricePaid, discountApplied: Math.max(0, Number(product.price) - Number(pricePaid)), purchaseSource: "purchase", status: "active", playTime: 0, isInstalled: false });
    });
    library.totalGames = library.games.length;
    await library.save();

    const orderId = crypto.randomBytes(8).toString("hex").toUpperCase();
    const transaction = await Transaction.create({ userId: req.authUserId, gameId: products.length === 1 ? products[0]._id : null, orderId, transactionType: "purchase", reason: `Purchase of ${products.length} game${products.length === 1 ? "" : "s"}`, spentType: "purchase", paymentMethod: "wallet", amount: total, status: "success" });
    transactionId = transaction._id;
    await Product.bulkWrite(products.map((product) => ({ updateOne: { filter: { _id: product._id }, update: { $inc: { totalSales: 1 } } } })));
    salesUpdated = true;
    await Cart.updateOne({ userId: req.authUserId }, { $set: { items: [] } });

    return res.json({ data: { orderId, balance: user.balance, total, currency: "INR", games: products.map((product) => ({ id: String(product._id), slug: product.slug, name: product.name })) }, meta: { code: 200, message: "Purchase completed and games added to your library." } });
  } catch (error) {
    if (transactionId) await Transaction.deleteOne({ _id: transactionId }).catch(() => {});
    if (purchasedGameIds.length) {
      const library = await Library.findOne({ userId: req.authUserId }).catch(() => null);
      if (library) {
        library.games = library.games.filter((entry) => !purchasedGameIds.some((id) => String(id) === String(entry.gameId)));
        library.totalGames = library.games.length;
        await library.save().catch(() => {});
      }
    }
    if (salesUpdated) await Product.bulkWrite(purchasedGameIds.map((id) => ({ updateOne: { filter: { _id: id }, update: { $inc: { totalSales: -1 } } } }))).catch(() => {});
    if (chargedAmount > 0) await User.updateOne({ _id: req.authUserId }, { $inc: { balance: chargedAmount } }).catch(() => {});
    return next(error);
  }
};
