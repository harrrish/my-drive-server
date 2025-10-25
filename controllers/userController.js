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
    const redisSessionKey = `session:${sessionID}`;
    await redisClient.json.set(redisSessionKey, "$", {
      userID: user._id,
    });
    await redisClient.expire(redisSessionKey, 60 * 60);

    const redisUserDetails = `user:${user.id}`;
    await redisClient.json.set(redisUserDetails, "$", {
      name: user.name,
      email: user.email,
      picture: user.picture,
    });
    await redisClient.expire(redisUserDetails, 60 * 60);

    res.cookie("sessionID", sessionID, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
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

//*===============>  GET USER PROFILE DETAILS
export const getUserDetails = async (req, res) => {
  const redisKey = `user:${req.user.id}`;
  const redisData = await redisClient.json.get(redisKey);
  if (redisData) {
    const { name, email, picture } = redisData;
    return res.status(200).json({ name, email, picture });
  } else {
    try {
      const { name, email, picture } = req.user;
      return res.status(200).json({ name, email, picture });
    } catch (error) {
      console.error("Fetching user details failed:", error);
      const errStr = "Internal Server Error: Fetching user details failed";
      return customErr(res, 500, errStr);
    }
  }
};

//*===============>  GET USER STORAGE DETAILS
export const getUserStorage = async (req, res) => {
  try {
    const { rootID, maxStorageInBytes } = req.user;
    const { size } = await DirectoryModel.findById(rootID).select("size -_id");
    return res.status(200).json({ maxStorageInBytes, size });
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
    const redisUserDetailsKey = `user:${req.user.id}`;
    await redisClient.del(redisUserDetailsKey);

    res.clearCookie("sessionID");
    return res.status(204).end();
  } catch (error) {
    console.error("User logout failed:", error);
    const errStr = "Internal Server Error: User logout failed";
    return customErr(res, 500, errStr);
  }
};
