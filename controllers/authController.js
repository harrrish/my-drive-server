import mongoose, { Types } from "mongoose";
import OTP from "../models/OTPModel.js";
import UserModel from "../models/UserModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import { verifyToken } from "../config/googleConfig.js";
import { sendOTP } from "../utils/generateOTP.js";
import {
  customErr,
  customResp,
  emailDuplicate,
  INS,
  invalidEmail,
  invalidOTP,
  missingCreds,
  otpVerified,
  userLoginSuccess,
} from "../utils/customReturn.js";
import { otpRequestSchema, otpVerifySchema } from "../zodModels/authSchema.js";
import { redisClient } from "../config/redisConfig.js";

export const requestOTP = async (req, res) => {
  try {
    const { success, data, error } = otpRequestSchema.safeParse(req.body);
    // console.log(data);
    if (!success) {
      console.log({ error: error.issues[0].message });
      return customErr(res, 400, invalidEmail);
    }
    let emailExists;
    try {
      emailExists = await UserModel.findOne({ email: data.email });
    } catch (error) {
      console.log(`Error_63:${error}`);
      return customErr(res, 500, INS);
    }
    if (emailExists) return customErr(res, 400, emailDuplicate);

    await sendOTP(data.email);
    return customResp(res, 201, `OTP sent to ${data.email} !`);
  } catch (error) {
    console.log(`Error_64:${error}`);
    return customErr(res, 500, INS);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { success, data, error } = otpVerifySchema.safeParse(req.body);
    if (!success) {
      console.log({ error: error.issues[0].message });
      return customErr(res, 400, missingCreds);
    }
    const { email, otp } = data;
    let otpRecord;
    try {
      otpRecord = await OTP.findOne({ email, otp });
    } catch (error) {
      console.log(`Error_65:${error}`);
      return customErr(res, 500, INS);
    }
    if (!otpRecord) return customErr(res, 400, invalidOTP);
    else return customResp(res, 200, otpVerified);
  } catch (error) {
    console.log(`Error_66:${error}`);
    return customErr(res, 500, INS);
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
    //* For newUser
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
        //* SESSION CREATION
        const sessionID = new Types.ObjectId();
        //* SESSION CREATION
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

        //* SENDING COOKIE
        res.cookie("sessionID", sessionID, {
          httpOnly: true,
          sameSite: "Lax",
          signed: true,
          secure: true,
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
      //* SESSION CREATION
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
      //* SENDING COOKIE
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
