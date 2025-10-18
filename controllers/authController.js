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
  try {
    const { success, data, error } = otpRequestSchema.safeParse(req.body);
    if (!success) return customErr(res, 400, error.issues[0].message);

    const { email } = data;
    const emailExists = await UserModel.findOne({ email });
    if (emailExists) return customErr(res, 400, emailDuplicate);

    await sendOTP(data.email);
    return customResp(res, 201, `OTP sent to ${data.email} !`);
  } catch (error) {
    console.error("OTP request failure:", error);
    const errStr = "Internal Server Error: OTP request failure";
    return customErr(res, 500, errStr);
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
    console.error("OTP verification failure:", error);
    const errStr = "Internal Server Error: OTP verification failure";
    return customErr(res, 500, errStr);
  }
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    const userData = await verifyToken(idToken);
    const { name, picture, email, sub } = userData;
    let user;
    try {
      user = await UserModel.findOne({ email }).select("-__v").lean();
    } catch (error) {
      console.log(`Error_67:${error}`);
      return customErr(res, 500, INS);
    }
    //*===============>  For newUser
    if (!user) {
      const mongooseSession = await mongoose.startSession();
      try {
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
        //*===============>  SESSION CREATION
        const sessionID = new Types.ObjectId();
        //*===============>  SESSION CREATION
        try {
          const redisKey = `session:${sessionID}`;
          await redisClient.json.set(redisKey, "$", {
            userID: user._id,
          });
          await redisClient.expire(redisKey, 60 * 60);
        } catch (error) {
          console.log(`Error_75:${error}`);
          return customErr(res, 500, INS);
        }

        //*===============>  SENDING COOKIE
        res.cookie("sessionID", sessionID, {
          httpOnly: true,
          sameSite: "none",
          secure: true, // false for development
          signed: true,
          maxAge: 60 * 60 * 1000,
        });
        mongooseSession.commitTransaction();
        return customResp(res, 201, userLoginSuccess);
      } catch (error) {
        console.log(`Error_68:${error}`);
        return customErr(res, 500, INS);
      }
    } else if (user.isDeleted) return customErr(res, 403, userDeleted);
    else {
      /*       let allSessions;
      try {
      } catch (error) {
        console.log(`Error_69:${error}`);
        return customErr(res, 500, INS);
      }
      if (allSessions && allSessions.length >= 2) {
        await allSessions[0].deleteOne();
      } */
      const sessionID = new Types.ObjectId();
      //*===============>  SESSION CREATION
      try {
        const redisKey = `session:${sessionID}`;
        await redisClient.json.set(redisKey, "$", {
          userID: user._id,
        });
        await redisClient.expire(redisKey, 60 * 60);
      } catch (error) {
        console.log(`Error_70:${error}`);
        return customErr(res, 500, INS);
      }
      //*===============>  SENDING COOKIE
      res.cookie("sessionID", sessionID, {
        httpOnly: true,
        sameSite: "Lax",
        signed: true,
        maxAge: 60 * 60 * 1000,
      });
      return customResp(res, 201, userLoginSuccess);
    }
  } catch (error) {
    console.log(`Error_71:${error}`);
    return customErr(res, 500, INS);
  }
};
