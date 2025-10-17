import { model, Schema } from "mongoose";

const OTPSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      expires: 180,
    },
  },
  {
    strict: "throw",
  }
);

const OTP = model("OTP", OTPSchema);

export default OTP;
