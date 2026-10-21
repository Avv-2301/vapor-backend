const User = require("../../models/auth");
exports.getBillingAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId).select("billingAddress").lean();
    if (!user) return res.status(404).json({ meta: { code: 404, message: "User not found" } });
    return res.json({ data: user.billingAddress || null, meta: { code: 200, message: "Billing address loaded" } });
  } catch (error) { return next(error); }
};

exports.saveBillingAddress = async (req, res, next) => {
  const fields = ["firstName", "lastName", "email", "callingCode", "phone", "street", "unit", "city", "region", "postalCode", "country"];
  const address = {};
  for (const field of fields) {
    const value = String(req.body?.[field] || "").trim();
    if (value.length > 200) return res.status(400).json({ meta: { code: 400, message: "Billing information is too long." } });
    address[field] = value;
  }
  if (!address.firstName || !address.lastName || !/^\S+@\S+\.\S+$/.test(address.email) || !address.street || !address.city || !address.region || !address.postalCode || !address.country)
    return res.status(400).json({ meta: { code: 400, message: "Complete the required billing information before saving." } });
  try {
    const user = await User.findByIdAndUpdate(req.authUserId, { $set: { billingAddress: address } }, { new: true, projection: { billingAddress: 1 } }).lean();
    if (!user) return res.status(404).json({ meta: { code: 404, message: "User not found" } });
    return res.json({ data: user.billingAddress, meta: { code: 200, message: "Billing address saved" } });
  } catch (error) { return next(error); }
};

exports.getUserData = async (req, res, next) => {
  if (req.params.id && req.params.id !== req.authUserId)
    return res
      .status(403)
      .json({ meta: { code: 403, message: "Access denied" } });
  try {
    const user = await User.findById(req.authUserId).select(
      "_id name email role profile verified"
    );
    return res.json({ data: user, meta: { code: 200, message: "User found" } });
  } catch (error) {
    next(error);
  }
};
