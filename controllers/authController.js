import mongoose, { Types } from "mongoose";
import OTP from "../models/OTPModel.js";
import UserModel from "../models/UserModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import { verifyToken } from "../config/googleConfig.js";
import { sendOTP } from "../utils/generateOTP.js";
import { otpRequestSchema, otpVerifySchema } from "../zodModels/authSchema.js";
import { redisClient } from "../config/redisConfig.js";
import { customErr, customResp } from "../utils/customReturn.js";

export const requestOTP = async (req, res) => {
  const { success, data, error } = otpRequestSchema.safeParse(req.body);
  // console.log({ success }, { data }, { error });

  if (!success) return customErr(res, 400, "Invalid credentials");

  const { email } = data;
  const emailExists = await UserModel.findOne({ email });
  if (emailExists) return customErr(res, 400, "Sorry, user email exists");

  const otpSent = await sendOTP(data.email);
  if (otpSent.success) {
    return customResp(res, 201, `OTP sent to ${data.email} !`);
  } else {
    return customErr(res, 500, otpSent.error);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { success, data, error } = otpVerifySchema.safeParse(req.body);
    if (!success) return customErr(res, 400, "Invalid OTP or Credentials");

    const { email, otp } = data;
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) return customErr(res, 400, invalidOTP);
    else return customResp(res, 200, "OTP verification completed");
  } catch (error) {
    console.error("OTP verification failed:", error);
    const errStr = "Internal Server Error: OTP verification failed";
    return customErr(res, 500, errStr);
  }
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    const userData = await verifyToken(idToken);
    const { name, picture, email, sub } = userData;
    const user = await UserModel.findOne({ email }).select("-__v").lean();

    if (!user) {
      const mongooseSession = await mongoose.startSession();

      mongooseSession.startTransaction();
      const rootID = new Types.ObjectId();
      const userID = new Types.ObjectId();
      await UserModel.insertOne(
        {
          _id: userID,
          name,
          email,
          rootID,
          picture,
          sub,
        },
        { mongooseSession }
      );
      await DirectoryModel.insertOne(
        {
          _id: rootID,
          name: `root-${email}`,
          parentFID: null,
          userID,
          path: rootID,
        },
        { mongooseSession }
      );
      const sessionID = new Types.ObjectId();

      const redisKey = `session:${sessionID}`;
      await redisClient.json.set(redisKey, "$", {
        userID: user._id,
      });
      await redisClient.expire(redisKey, 60 * 60);

      res.cookie("sessionID", sessionID, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        signed: true,
        maxAge: 60 * 60 * 1000,
      });
      mongooseSession.commitTransaction();
      return customResp(res, 201, "User signup complete");
    } else {
      const sessionID = new Types.ObjectId();

      const redisKey = `session:${sessionID}`;
      await redisClient.json.set(redisKey, "$", {
        userID: user._id,
      });
      await redisClient.expire(redisKey, 60 * 60);

      res.cookie("sessionID", sessionID, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        signed: true,
        maxAge: 60 * 60 * 1000,
      });
      return customResp(res, 201, "User login complete");
    }
  } catch (error) {
    console.error("Login failed using Google:", error);
    const errStr = "Internal Server Error: Login failed using Google";
    return customErr(res, 500, errStr);
  }
};
