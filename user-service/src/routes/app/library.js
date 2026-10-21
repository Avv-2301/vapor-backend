const router = require("express").Router();
const c = require("../../controllers/app/library");
router.get("/ownership/:productKey", c.isGameOwned);
router.get("/", c.getLibraryByUserId);
router.get("/user/:userId", (req, res, next) => {
  if (req.params.userId !== req.authUserId) return res.status(403).json({ meta: { code: 403, message: "Access denied" } });
  next();
}, c.getLibraryByUserId);
router.get("/:id", c.getLibraryById);
router.post("/add-game", c.addGame);
router.post("/remove-game", c.removeGame);
router.post("/update-playtime", c.updateGamePlayTime);
module.exports = router;
