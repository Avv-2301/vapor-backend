const router = require("express").Router();
const controller = require("../../controllers/app/wishlist");

router.get("/", controller.getWishlist);
router.post("/items", controller.addWishlistItem);
router.delete("/items/:productId", controller.removeWishlistItem);

module.exports = router;
