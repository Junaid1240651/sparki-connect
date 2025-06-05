import express from "express";
import userController from "../controllers/user.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.get("/getProfile", verifyUser, userController.getProfile);
router.patch("/updateProfile", verifyUser, userController.updateProfile);
router.delete("/deleteAccount", verifyUser, userController.deleteAccount);
router.post("/forgotPassword", userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);
router.post("/verify_otp", userController.verifyOtpAndCompleteSignup);
router.post("/resend_otp", userController.resentOTP);

export default router;
