import UserModel from "../models/UserModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import { customErr } from "../utils/customReturn.js";

export const checkFileSize = async (req, res, next) => {
  try {
    const { id, rootID } = req.user;
    const { name, size, folderID } = req.body;
    if (!name || !size) return customErr(res, 400, "Invalid file details");

    const currentDirID = folderID ? folderID : rootID;

    if (rootID.toString() !== currentDirID.toString())
      validateMongoID(res, currentDirID);

    const currentDir = await DirectoryModel.findOne({
      _id: currentDirID,
      userID: id,
    });
    if (!currentDir)
      return customErr(res, 404, "Folder deleted or Access denied");

    const reqUser = await UserModel.findById(id);

    const rootDir = await DirectoryModel.findById(rootID);

    const remainingSpace = reqUser.maxStorageInBytes - rootDir.size;

    if (size > remainingSpace) {
      customErr(res, 507, insufficientStorage);
      return res.destroy();
    }

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
    console.error("Failed to verify file details:", error);
    const errStr = "Internal Server Error: Failed to verify file details";
    return customErr(res, 500, errStr);
  }
};
