const configuredSaleQuery = {
  isDiscountActive: true,
  discountPrice: { $ne: null },
  $expr: { $lt: ["$discountPrice", "$price"] },
};

const presentProduct = (product) => {
  const data = product.toObject ? product.toObject() : { ...product };
  delete data.isDiscountManuallyActive;
  delete data.isDiscountPromotionActive;
  if (data.isDiscountActive !== true || data.discountPrice == null || data.discountPrice >= data.price) {
    data.discountPrice = null;
    data.discountPercentage = 0;
  }
  return data;
};

module.exports = { configuredSaleQuery, presentProduct };
