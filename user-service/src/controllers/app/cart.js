const mongoose = require("mongoose");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Library = require("../../models/Library");
const { presentProduct } = require("../../services/productPricing");

const sendError = (res, status, message) =>
  res.status(status).json({ meta: { code: status, message } });

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.authUserId }).populate({
      path: "items.productId",
      match: { isActive: true },
    });
    const library = await Library.findOne({ userId: req.authUserId }).select("games.gameId").lean();
    const ownedIds = (library?.games || []).map((entry) => entry.gameId).filter(Boolean);
    const ownedIdStrings = new Set(ownedIds.map(String));
    const items = (cart?.items || [])
      .filter((item) => item.productId)
      .filter((item) => !ownedIdStrings.has(String(item.productId._id)))
      .map((item) => ({ ...presentProduct(item.productId), addedAt: item.addedAt }));
    if (ownedIds.size) await Cart.updateOne({ userId: req.authUserId }, { $pull: { items: { productId: { $in: [...ownedIds] } } } });
    return res.json({ data: { items }, meta: { code: 200, message: "Cart loaded" } });
  } catch (error) {
    return next(error);
  }
};

exports.addCartItem = async (req, res, next) => {
  try {
    const { productId } = req.body || {};
    if (typeof productId !== "string" || !productId.trim())
      return sendError(res, 400, "A product ID or slug is required.");

    const product = await Product.findOne({
      isActive: true,
      $or: [
        { slug: productId.trim() },
        ...(mongoose.isValidObjectId(productId) ? [{ _id: productId }] : []),
      ],
    });
    if (!product) return sendError(res, 404, "This game is no longer available.");

    const alreadyOwned = await Library.exists({ userId: req.authUserId, "games.gameId": product._id });
    if (alreadyOwned) return sendError(res, 409, "This game is already in your library.");

    const cart = await Cart.findOneAndUpdate(
      { userId: req.authUserId },
      { $setOnInsert: { userId: req.authUserId }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true },
    );
    if (!cart.items.some((item) => item.productId.equals(product._id))) {
      cart.items.push({ productId: product._id });
      await cart.save();
    }
    return res.json({ data: { item: presentProduct(product) }, meta: { code: 200, message: "Game added to cart" } });
  } catch (error) {
    return next(error);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const key = req.params.productId;
    const product = await Product.findOne({
      $or: [
        { slug: key },
        ...(mongoose.isValidObjectId(key) ? [{ _id: key }] : []),
      ],
    }).select("_id");
    if (product) {
      await Cart.updateOne(
        { userId: req.authUserId },
        { $pull: { items: { productId: product._id } } },
      );
    }
    return res.json({ data: { removed: true }, meta: { code: 200, message: "Cart item removed" } });
  } catch (error) {
    return next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    await Cart.updateOne({ userId: req.authUserId }, { $set: { items: [] } });
    return res.json({ data: { cleared: true }, meta: { code: 200, message: "Cart cleared" } });
  } catch (error) {
    return next(error);
  }
};
