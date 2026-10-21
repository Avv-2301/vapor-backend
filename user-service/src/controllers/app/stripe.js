const User = require("../../models/auth");
const Transaction = require("../../models/transaction");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Library = require("../../models/Library");
const crypto = require("crypto");
const {
  createCheckoutSession,
  getCheckoutSession,
} = require("../../services/stripeIntegration");

const getPrice = (product) =>
  Number(
    product.isDiscountActive &&
      product.discountPrice != null &&
      product.discountPrice < product.price
      ? product.discountPrice
      : product.price
  );

// Match the existing admin and wallet order ID format: 16 uppercase hex characters.
const createTransactionId = () => crypto.randomBytes(8).toString("hex").toUpperCase();

exports.createCheckout = async (req, res, next) => {
  try {
    const purpose = req.body?.purpose;
    const user = await User.findById(req.authUserId).select("email").lean();
    if (!user)
      return res
        .status(404)
        .json({ meta: { code: 404, message: "User not found." } });

    if (purpose === "top-up") {
      const amount = Number(req.body?.amount);
      if (
        !Number.isFinite(amount) ||
        amount < 100 ||
        amount > 500 ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
      ) {
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message:
                "Enter an amount between ₹100 and ₹500, with up to two decimal places.",
            },
          });
      }
      const session = await createCheckoutSession({
        userId: req.authUserId,
        email: user.email,
        purpose,
        amount,
      });
      return res.json({
        data: { checkoutUrl: session.url, sessionId: session.id },
        meta: { code: 200, message: "Stripe checkout created." },
      });
    }

    if (purpose !== "purchase")
      return res
        .status(400)
        .json({
          meta: {
            code: 400,
            message: "Choose a supported Stripe payment type.",
          },
        });
    const cart = await Cart.findOne({ userId: req.authUserId }).populate({
      path: "items.productId",
      match: { isActive: true },
    });
    const products = (cart?.items || [])
      .map((item) => item.productId)
      .filter(Boolean);
    if (!products.length)
      return res
        .status(400)
        .json({ meta: { code: 400, message: "Your cart is empty." } });
    if (products.length !== cart.items.length)
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message: "One or more games in your cart are no longer available.",
          },
        });
    const library = await Library.findOne({ userId: req.authUserId })
      .select("games.gameId")
      .lean();
    const ownedIds = new Set(
      (library?.games || []).map((entry) => String(entry.gameId))
    );
    if (products.some((product) => ownedIds.has(String(product._id))))
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message:
              "Your cart contains a game that is already in your library.",
          },
        });
    const items = products.map((product) => ({
      name: product.name,
      amount: getPrice(product),
    }));
    if (items.some((item) => !Number.isFinite(item.amount) || item.amount <= 0))
      return res
        .status(400)
        .json({
          meta: { code: 400, message: "The cart contains an invalid price." },
        });

    const session = await createCheckoutSession({
      userId: req.authUserId,
      email: user.email,
      purpose,
      items,
    });
    return res.json({
      data: { checkoutUrl: session.url, sessionId: session.id },
      meta: { code: 200, message: "Stripe checkout created." },
    });
  } catch (error) {
    return next(error);
  }
};

exports.confirmCheckout = async (req, res, next) => {
  try {
    const sessionId = String(req.body?.sessionId || "");
    if (!sessionId.startsWith("cs_"))
      return res
        .status(400)
        .json({
          meta: { code: 400, message: "Invalid Stripe checkout session." },
        });
    const session = await getCheckoutSession(sessionId);
    if (
      session.payment_status !== "paid" ||
      session.status !== "complete" ||
      session.metadata?.userId !== String(req.authUserId)
    ) {
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message: "This Stripe payment is not complete for your account.",
          },
        });
    }
    const purpose = session.metadata?.purpose;
    const existing = await Transaction.findOne({
      paymentMethod: "stripe",
      status: "success",
      $or: [{ stripeSessionId: session.id }, { orderId: session.id }],
    }).lean();
    if (existing)
      return res.json({
        data: {
          purpose: existing.spentType === "top-up" ? "top-up" : "purchase",
          amount: existing.amount,
          alreadyProcessed: true,
        },
        meta: { code: 200, message: "Payment was already processed." },
      });

    if (purpose === "top-up") {
      const amount = Number(session.metadata?.amount);
      if (
        !Number.isFinite(amount) ||
        Math.round(amount * 100) !== session.amount_total
      )
        return res
          .status(409)
          .json({
            meta: {
              code: 409,
              message: "The Stripe payment amount could not be verified.",
            },
          });
      const user = await User.findByIdAndUpdate(
        req.authUserId,
        { $inc: { balance: amount } },
        { new: true, projection: { balance: 1 } }
      );
      if (!user)
        return res
          .status(404)
          .json({ meta: { code: 404, message: "User not found." } });
      await Transaction.create({
        userId: req.authUserId,
        orderId: createTransactionId(),
        stripeSessionId: session.id,
        transactionType: "deposit",
        reason: "Stripe wallet top-up",
        spentType: "top-up",
        paymentMethod: "stripe",
        amount,
        status: "success",
      });
      return res.json({
        data: { purpose, amount, balance: user.balance },
        meta: { code: 200, message: "Wallet funds added." },
      });
    }

    if (purpose !== "purchase")
      return res
        .status(400)
        .json({
          meta: { code: 400, message: "Unsupported Stripe payment type." },
        });
    const cart = await Cart.findOne({ userId: req.authUserId }).populate({
      path: "items.productId",
      match: { isActive: true },
    });
    const products = (cart?.items || [])
      .map((item) => item.productId)
      .filter(Boolean);
    if (!products.length || products.length !== cart.items.length)
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message: "Your cart changed while payment was being completed.",
          },
        });
    const totalPaise = products.reduce(
      (sum, product) => sum + Math.round(getPrice(product) * 100),
      0
    );
    if (totalPaise !== session.amount_total)
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message:
              "Cart prices changed. Contact support with your Stripe payment receipt.",
          },
        });
    const library =
      (await Library.findOne({ userId: req.authUserId })) ||
      (await Library.create({
        userId: req.authUserId,
        games: [],
        totalGames: 0,
        totalPlayTime: 0,
      }));
    const ownedIds = new Set(
      library.games.map((entry) => String(entry.gameId))
    );
    if (products.some((product) => ownedIds.has(String(product._id))))
      return res
        .status(409)
        .json({
          meta: {
            code: 409,
            message:
              "A game in this paid order is already in your library. Contact support for help.",
          },
        });

    const total = totalPaise / 100;
    products.forEach((product) => {
      const price = getPrice(product);
      library.games.push({
        gameId: product._id,
        gameName: product.name,
        purchaseDate: new Date(),
        purchasePrice: price,
        discountApplied: Math.max(0, Number(product.price) - price),
        purchaseSource: "purchase",
        status: "active",
        playTime: 0,
        isInstalled: false,
      });
    });
    library.totalGames = library.games.length;
    await library.save();
    await Transaction.create({
      userId: req.authUserId,
      gameId: products.length === 1 ? products[0]._id : null,
      orderId: createTransactionId(),
      stripeSessionId: session.id,
      transactionType: "purchase",
      reason: `Stripe purchase of ${products.length} game${
        products.length === 1 ? "" : "s"
      }`,
      spentType: "purchase",
      paymentMethod: "stripe",
      amount: total,
      status: "success",
    });
    await Product.bulkWrite(
      products.map((product) => ({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { totalSales: 1 } },
        },
      }))
    );
    await Cart.updateOne({ userId: req.authUserId }, { $set: { items: [] } });
    return res.json({
      data: {
        purpose,
        total,
        games: products.map((product) => ({
          id: String(product._id),
          slug: product.slug,
          name: product.name,
        })),
      },
      meta: { code: 200, message: "Purchase completed." },
    });
  } catch (error) {
    return next(error);
  }
};
