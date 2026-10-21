const router = require("express").Router();
const { getWallet, redeemGiftCard, purchaseWithWallet } = require("../../controllers/app/wallet");
const { createCheckout, confirmCheckout } = require("../../controllers/app/stripe");

router.get("/me", getWallet);
router.post("/redeem", redeemGiftCard);
router.post("/purchase", purchaseWithWallet);
router.post("/stripe/checkout", createCheckout);
router.post("/stripe/confirm", confirmCheckout);

module.exports = router;
