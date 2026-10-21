const mongoose = require("mongoose");
const Wishlist = require("../../models/Wishlist");
const Product = require("../../models/Product");
const { presentProduct } = require("../../services/productPricing");

const sendError = (res, status, message) =>
  res.status(status).json({ meta: { code: status, message } });

const productQuery = (key, activeOnly = false) => ({
  ...(activeOnly ? { isActive: true } : {}),
  $or: [
    { slug: key },
    ...(mongoose.isValidObjectId(key) ? [{ _id: key }] : []),
  ],
});

const serializeItems = (items = []) => items
  .filter((item) => item.productId)
  .map((item) => ({ ...presentProduct(item.productId), addedAt: item.addedAt }))
  .sort((left, right) => new Date(right.addedAt) - new Date(left.addedAt));

exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.authUserId }).populate({
      path: "items.productId",
      match: { isActive: true },
    });
    return res.json({
      data: { items: serializeItems(wishlist?.items) },
      meta: { code: 200, message: "Wishlist loaded" },
    });
  } catch (error) {
    return next(error);
  }
};

exports.addWishlistItem = async (req, res, next) => {
  try {
    const key = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    if (!key) return sendError(res, 400, "A product ID or slug is required.");

    const product = await Product.findOne(productQuery(key, true));
    if (!product) return sendError(res, 404, "This game is no longer available.");

    await Wishlist.findOneAndUpdate(
      { userId: req.authUserId },
      { $setOnInsert: { userId: req.authUserId } },
      { upsert: true, new: true },
    );
    await Wishlist.updateOne(
      { userId: req.authUserId, "items.productId": { $ne: product._id } },
      { $push: { items: { productId: product._id, addedAt: new Date() } } },
    );

    return res.json({
      data: { item: presentProduct(product) },
      meta: { code: 200, message: "Game added to wishlist" },
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeWishlistItem = async (req, res, next) => {
  try {
    const key = req.params.productId;
    const product = await Product.findOne(productQuery(key));
    if (product) {
      await Wishlist.updateOne(
        { userId: req.authUserId },
        { $pull: { items: { productId: product._id } } },
      );
    }
    return res.json({
      data: { removed: true },
      meta: { code: 200, message: "Game removed from wishlist" },
    });
  } catch (error) {
    return next(error);
  }
};
