import { redisClient } from "./config/redisConfig.js";
import { customErr } from "./utils/customReturn.js";
import { validateMongoID } from "./utils/validateMongoID.js";
import UserModel from "./models/UserModel.js";

export default async function checkAuth(req, res, next) {
  try {
    const { sessionID } = req.signedCookies;
    if (!sessionID) {
      res.clearCookie("sessionID");
      console.log("User logged out_1");
      return customErr(res, 401, "Expired or Invalid Session");
    }
    validateMongoID(res, sessionID);
    const redisKey = `session:${sessionID}`;
    const session = await redisClient.json.get(redisKey);
    if (!session) {
      res.clearCookie("sessionID");
      console.log("User logged out_2");
      return customErr(res, 401, "Expired or Invalid Session");
    }
    const user = await UserModel.findById({ _id: session.userID });
    if (!user) {
      res.clearCookie("sessionID");
      console.log("User logged out_3");
      return customErr(res, 401, "Expired or Invalid Session");
    }
    //*===============> id, rootID, name, email, maxStorageInBytes, role, isDeleted
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication failed:", error);
    const errStr = "Internal Server Error: Authentication failed";
    return customErr(res, 500, errStr);
  }
}
