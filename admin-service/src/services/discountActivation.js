const Discount = require("../models/discount");
const Product = require("../models/Product");

let activationTimer;
let activationQueue = Promise.resolve();
let legacyFlagsMigrated = false;

const activeDiscountQuery = (now) => ({
  scope: { $in: ["game", "category"] },
  isPaused: { $ne: true },
  startDate: { $lte: now },
  endDate: { $gt: now },
});

const syncDiscountActivation = async (gameIds) => {
  // Before this feature existed, isDiscountActive represented a manual toggle.
  if (!legacyFlagsMigrated) {
    await Product.collection.updateMany(
      { isDiscountManuallyActive: { $exists: false }, isDiscountActive: true },
      { $set: { isDiscountManuallyActive: true } }
    );
    legacyFlagsMigrated = true;
  }

  const now = new Date();
  const discounts = await Discount.find(activeDiscountQuery(now))
    .select("scope selectedGames selectedCategories")
    .lean();
  const promotedGames = new Set();
  const promotedCategories = new Set();
  for (const discount of discounts) {
    if (discount.scope === "game") {
      for (const gameId of discount.selectedGames || []) promotedGames.add(String(gameId));
    } else {
      for (const category of discount.selectedCategories || []) promotedCategories.add(category);
    }
  }

  const query = gameIds?.length ? { _id: { $in: gameIds } } : {};
  const products = await Product.find(query)
    .select("_id category isDiscountActive isDiscountManuallyActive isDiscountPromotionActive")
    .lean();
  const operations = [];
  for (const product of products) {
    const promotionActive = promotedGames.has(String(product._id)) || promotedCategories.has(product.category);
    const effectiveActive = product.isDiscountManuallyActive === true || promotionActive;
    if (product.isDiscountPromotionActive !== promotionActive || product.isDiscountActive !== effectiveActive) {
      operations.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { isDiscountPromotionActive: promotionActive, isDiscountActive: effectiveActive } },
        },
      });
    }
  }
  if (operations.length) await Product.bulkWrite(operations);
};

const scheduleNextRefresh = async () => {
  clearTimeout(activationTimer);
  const now = new Date();
  const discounts = await Discount.find({
    scope: { $in: ["game", "category"] },
    isPaused: { $ne: true },
    endDate: { $gt: now },
  }).select("startDate endDate").lean();
  const transitions = discounts.flatMap(({ startDate, endDate }) => [startDate, endDate])
    .map((date) => new Date(date).getTime())
    .filter((time) => time > now.getTime());
  const nextTransition = transitions.length ? Math.min(...transitions) : Infinity;
  const delay = Math.max(100, Math.min(60_000, nextTransition - Date.now() + 100));
  const runRefresh = () => {
    refreshDiscountActivation().catch((error) => {
      console.error("Discount activation refresh failed:", error);
      activationTimer = setTimeout(runRefresh, 60_000);
      activationTimer.unref?.();
    });
  };
  activationTimer = setTimeout(runRefresh, delay);
  activationTimer.unref?.();
};

const refreshDiscountActivation = (gameIds) => {
  activationQueue = activationQueue.catch(() => {}).then(async () => {
    await syncDiscountActivation(gameIds);
    await scheduleNextRefresh();
  });
  return activationQueue;
};

const stopDiscountActivation = () => clearTimeout(activationTimer);

module.exports = { refreshDiscountActivation, stopDiscountActivation };
