import { Types, mongoose } from "mongoose";
import UserModel from "../models/UserModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import OTPModel from "../models/OTPModel.js";
import { loginSchema, registerSchema } from "../zodModels/authSchema.js";
import { redisClient } from "../config/redisConfig.js";
import { customErr, customResp } from "../utils/customReturn.js";

//*===============>  REGISTERING USER
export const registerUser = async (req, res) => {
  try {
    const { success, data, error } = registerSchema.safeParse(req.body);
    if (!success) return customErr(res, 400, error.issues[0].message);

    const { name, email, password, otp } = data;

    const emailCopy = await UserModel.findOne({ email }).lean();
    if (emailCopy) return customErr(res, 400, "Sorry, User email exists");

    const otpRecord = await OTPModel.findOne({ email, otp });
    if (!otpRecord) return customErr(res, 400, "Invalid or Expired OTP");
    await otpRecord.deleteOne();

    const session = await mongoose.startSession();
    session.startTransaction();
    const rootID = new Types.ObjectId();
    const userID = new Types.ObjectId();
    await UserModel.insertOne(
      {
        _id: userID,
        name,
        email,
        password,
        rootID,
      },
      { session }
    );
    await DirectoryModel.insertOne(
      {
        _id: rootID,
        name: `root-${email}`,
        parentFID: null,
        userID,
        path: rootID,
      },
      { session }
    );
    session.commitTransaction();
    return customResp(res, 201, "User registration complete");
  } catch (error) {
    console.error("User registration failure:", error);
    const errStr = "Internal Server Error: User registration failure";
    return customErr(res, 500, errStr);
  }
};

//*===============>  USER LOGIN
export const loginUser = async (req, res) => {
  try {
    //*===============>  ZOD VALIDATION
    const { success, data, error } = loginSchema.safeParse(req.body);
    if (!success) {
      console.log({ zodError: error.issues[0].message });
      return customErr(res, 400, invalidCreds);
    }
    const { email, password } = data;

    //*===============>  VERIFYING USER CREDENTIALS
    let user;
    try {
      user = await UserModel.findOne({ email });
    } catch (error) {
      console.log(`Error_55:${error}`);
      return customErr(res, 500, INS);
    }
    if (!user) return customErr(res, 400, invalidCreds);

    //*===============>  PASSWORD VERIFICATION
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return customErr(res, 400, invalidCreds);

    /* //*===============>  CHECKING USER's PREVIOUS SESSION
    let allSessions;
    if (allSessions.length >= 2) {
      await allSessions[0].deleteOne();
    } */

    const sessionID = new Types.ObjectId();
    //*===============>  SESSION CREATION
    const redisKey = `session:${sessionID}`;
    await redisClient.json.set(redisKey, "$", {
      userID: user._id,
    });
    await redisClient.expire(redisKey, 60 * 60);

    //*===============>  SENDING COOKIE
    res.cookie("sessionID", sessionID, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      signed: true,
      maxAge: 60 * 60 * 1000,
    });

    return customResp(res, 200, userLoginSuccess);
  } catch (error) {
    console.log(`User login failure:${error}`);
    return customErr(res, 500, "Internal Server Error: User login failure");
  }
};

//*===============>  GET USER DETAILS
export const getUserDetails = async (req, res) => {
  try {
    const { name, email, picture, maxStorageInBytes, rootID } = req.user;
    let rootDir;
    try {
      rootDir = await DirectoryModel.findById(rootID);
    } catch (error) {
      console.log(`Error_59:${error}`);
      return customErr(res, 500, INS);
    }
    const usedStorageInBytes = rootDir.size;
    return res
      .status(200)
      .json({ name, email, picture, usedStorageInBytes, maxStorageInBytes });
  } catch (error) {
    console.log(`Error_60:${error}`);
    return customErr(res, 500, INS);
  }
};

//*===============>  USER LOGOUT
export const logoutUser = async (req, res) => {
  try {
    //*===============>  DELETING THE SESSION CREATED DUE TO LOGIN
    const { sessionID } = req.signedCookies;
    try {
      const redisKey = `session:${sessionID}`;
      await redisClient.del(redisKey);
    } catch (error) {
      console.log(`Error_61:${error}`);
      return customErr(res, 500, INS);
    }
    //*===============>  CLEARING COOKIE
    res.clearCookie("sessionID");
    //*===============>  Status 204 : DOES NOT SUPPORT VALUES
    return res.status(204).end();
  } catch (error) {
    console.log(`Error_62:${error}`);
    return customErr(res, 500, INS);
  }
};
