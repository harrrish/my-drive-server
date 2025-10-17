import { redisClient } from "./config/redisConfig.js";
import UserModel from "./models/UserModel.js";
import { customErr, errorSession, INS } from "./utils/customReturn.js";
import { validateMongoID } from "./utils/validateMongoID.js";

export default async function checkAuth(req, res, next) {
  try {
    const { sessionID } = req.signedCookies;

    //* CHECKING SESSION PROVIDED BY USER
    if (!sessionID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }
    validateMongoID(res, sessionID);

    //* FINDING THE SESSION IN THE DB
    const redisKey = `session:${sessionID}`;

    let session;
    try {
      session = await redisClient.json.get(redisKey);
    } catch (error) {
      console.log(`Error_01:${error}`);
      return customErr(res, 500, INS);
    }
    if (!session) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* FINDING USER FROM SESSION ID
    let user;
    try {
      user = await UserModel.findById({ _id: session.userID });
    } catch (error) {
      console.log(`Error_02:${error}`);
      return customErr(res, 500, INS);
    }
    if (!user) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* id, rootID, name, email, maxStorageInBytes, role, isDeleted
    req.user = user;
    next();
  } catch (error) {
    console.log(`Error_03:${error}`);
    return customErr(res, 500, INS);
  }
}
