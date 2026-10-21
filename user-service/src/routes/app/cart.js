const router = require("express").Router();
const controller = require("../../controllers/app/cart");

router.get("/", controller.getCart);
router.post("/items", controller.addCartItem);
router.delete("/items/:productId", controller.removeCartItem);
router.delete("/", controller.clearCart);

module.exports = router;
