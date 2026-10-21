const router = require("express").Router();
const proxy = require("../services/proxyFactory");
const { userService, adminService } = require("../config/services");
router.use((req, res, next) => {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];
  next();
});
router.use("/admin", proxy(adminService, "/admin"));
for (const prefix of ["/auth", "/users", "/profiles", "/library", "/wallet", "/cart", "/wishlist", "/products", "/reviews", "/banners"]) {
  router.use(prefix, proxy(userService));
}
module.exports = router;
