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
    console.error("User registration failed:", error);
    const errStr = "Internal Server Error: User registration failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  USER LOGIN
export const loginUser = async (req, res) => {
  try {
    const { success, data, error } = loginSchema.safeParse(req.body);
    if (!success) return customErr(res, 400, "Invalid Credentials");

    const { email, password } = data;

    const user = await UserModel.findOne({ email });
    if (!user) return customErr(res, 400, "Invalid Credentials");

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return customErr(res, 400, "Invalid Credentials");

    const sessionID = new Types.ObjectId();
    const redisKey = `session:${sessionID}`;
    await redisClient.json.set(redisKey, "$", {
      userID: user._id,
    });
    await redisClient.expire(redisKey, 60 * 60);

    res.cookie("sessionID", sessionID, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      signed: true,
      maxAge: 60 * 60 * 1000,
    });

    return customResp(res, 200, "User login successful");
  } catch (error) {
    console.error("User login failed:", error);
    const errStr = "Internal Server Error: User login failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  GET USER DETAILS (SHOULD RE-EDIT)
export const getUserDetails = async (req, res) => {
  try {
    const { name, email, picture, maxStorageInBytes, rootID } = req.user;
    const rootDir = await DirectoryModel.findById(rootID);

    const usedStorageInBytes = rootDir.size;
    return res
      .status(200)
      .json({ name, email, picture, usedStorageInBytes, maxStorageInBytes });
  } catch (error) {
    console.error("Fetching user details failed:", error);
    const errStr = "Internal Server Error: Fetching user details failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  USER LOGOUT
export const logoutUser = async (req, res) => {
  try {
    const { sessionID } = req.signedCookies;

    const redisKey = `session:${sessionID}`;
    await redisClient.del(redisKey);

    res.clearCookie("sessionID");
    return res.status(204).end();
  } catch (error) {
    console.error("User logout failed:", error);
    const errStr = "Internal Server Error: User logout failed";
    return customErr(res, 500, errStr);
  }
};
