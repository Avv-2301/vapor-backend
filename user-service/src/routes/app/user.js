const router = require("express").Router();
const { getUserData, getBillingAddress, saveBillingAddress } = require("../../controllers/app/userData");
router.get("/me/billing", getBillingAddress);
router.put("/me/billing", saveBillingAddress);
router.get("/me", getUserData);
router.get("/:id", getUserData);
module.exports = router;
