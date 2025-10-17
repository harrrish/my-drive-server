import UserModel from "../models/UserModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import {
  customErr,
  fileDetailsErr,
  INS,
  insufficientStorage,
  userRootDirError,
} from "../utils/customReturn.js";

export const checkFileSize = async (req, res, next) => {
  try {
    //* user ID, root ID
    const { id, rootID } = req.user;

    //* Getting name, size and folderID from user.
    const { name, size, folderId: folderID } = req.body;
    if (!name || !size) {
      return customErr(res, 400, fileDetailsErr);
    }
    const currentDirID = folderID ? folderID : rootID;

    //* Checking if the req body has a valid mongoID
    if (rootID.toString() !== currentDirID.toString()) {
      validateMongoID(res, currentDirID);
    }

    //* Finding the current directory of user
    let currentDir;
    try {
      currentDir = await DirectoryModel.findOne({
        _id: currentDirID,
        userID: id,
      });
    } catch (error) {
      console.log(`Error_04:${error}`);
      return customErr(res, 500, INS);
    }
    if (!currentDir) {
      return customErr(res, 404, dirErr);
    }

    //* Getting user data
    let reqUser;
    try {
      reqUser = await UserModel.findById(id);
    } catch (error) {
      console.log(`Error_05:${error}`);
      return customErr(res, 500, INS);
    }

    //* Getting root directory
    let rootDir;
    try {
      rootDir = await DirectoryModel.findById(rootID);
    } catch (error) {
      console.log(`Error_06:${error}`);
      return customErr(res, 500, INS);
    }
    if (!rootDir) {
      res.clearCookie("sessionID");
      return customErr(res, 401, userRootDirError);
    }

    //* Checking the space left to upload the file
    const remainingSpace = reqUser.maxStorageInBytes - rootDir.size;

    if (size > remainingSpace) {
      customErr(res, 507, insufficientStorage);
      return res.destroy();
    }

    //* Attaching necessary info to request
    req.filename = name;
    req.filesize = size;
    req.userID = id;
    req.user = reqUser;
    req.userRootDirID = rootID;
    req.userRootDir = rootDir;
    req.currentDirID = currentDirID;
    req.currentDir = currentDir;
    req.currentDirPath = currentDir.path;

    next();
  } catch (error) {
    console.log(`Error_07:${error}`);
    return customErr(res, 500, INS);
  }
};
