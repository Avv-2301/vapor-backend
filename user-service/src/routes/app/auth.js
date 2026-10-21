const router = require("express").Router();
const auth = require("../../controllers/app/auth");
const { userAuth } = require("../../middleware/userAuth");
router.post("/register", auth.userSignUp);
router.post("/login", auth.login);
router.post("/check-password-strength", auth.checkPasswordStrength);
router.post("/logout", userAuth, auth.logout);
module.exports = router;
