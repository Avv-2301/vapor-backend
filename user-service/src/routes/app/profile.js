const router = require("express").Router();
const c = require("../../controllers/app/profile");
router.get("/me", c.getProfile);
router.put("/me", c.updateProfile);
router.post("/create-profile", c.createProfile);
module.exports = router;
