import express from "express";
import {
  loginWithGoogle,
  requestOTP,
  verifyOTP,
} from "../controllers/authController.js";

const authRouter = express.Router();

//*===============>  SENDING OTP
authRouter.post("/send-otp", requestOTP);

//*===============>  VERIFYING OTP
authRouter.post("/verify-otp", verifyOTP);

//*===============>  GOOGLE AUTH
authRouter.post("/google", loginWithGoogle);

export default authRouter;
