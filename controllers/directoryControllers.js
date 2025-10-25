import DirectoryModel from "../models/DirectoryModel.js";
import FileModel from "../models/FileModel.js";
import { deleteDirContents } from "../middlewares/deleteDirMiddleware.js";
import { folderSchema } from "../zodModels/authSchema.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import { deleteS3Files } from "../config/s3.js";
import { editFolderSize } from "../utils/EditFolderSize.js";
import { customErr, customResp } from "../utils/customReturn.js";

//*===============>  GET DIRECTORY ITEMS
export const getDirectoryContents = async (req, res, next) => {
  try {
    const { id: userID, rootID } = req.user;
    const folderID = req.params.id;
    let currentDirID = folderID ? folderID : rootID;
    if (currentDirID !== folderID) validateMongoID(res, currentDirID);

    const currentFolder = await DirectoryModel.findOne({
      _id: currentDirID,
      userID,
    });

    if (!currentFolder)
      return customErr(res, 404, "Folder deleted or Access denied");

    const folders = await DirectoryModel.find({
      userID,
      parentFID: currentDirID,
    });

    const files = await FileModel.find({
      folderID: currentDirID,
      userID,
      isUploading: false,
    });

    const { filesCount, foldersCount, path } = currentFolder;
    let pathData;
    if (path.length > 0) {
      pathData = await Promise.all(
        path.map(async (dirId) => {
          const dir = await DirectoryModel.findById(dirId).select("name");
          return dir ? { id: dir.id, name: dir.name } : null;
        })
      );
    }
    return res.status(200).json({
      folders,
      files,
      filesCount,
      foldersCount,
      path: pathData,
    });
  } catch (error) {
    console.error("Failed to fetch folder content:", error);
    const errStr = "Internal Server Error: Failed to fetch folder content";
    return customErr(res, 500, errStr);
  }
};

//*===============>  CREATE A DIRECTORY
export const createDirectory = async (req, res, next) => {
  try {
    const { id: userID, rootID } = req.user;
    const folderID = req.params.id;
    let currentDirID = folderID ? folderID : rootID;
    if (rootID.toString() !== currentDirID.toString())
      validateMongoID(res, currentDirID);

    const { success, data, error } = folderSchema.safeParse(req.body);
    if (!success) return customErr(res, 400, error.issues[0].message);

    const { folderName } = data;

    const parentDir = await DirectoryModel.findOne({
      _id: currentDirID,
      userID,
    });

    const createdDir = await DirectoryModel.create({
      name: folderName,
      parentFID: parentDir.id,
      userID,
      path: parentDir.path,
    });

    createdDir.path.push(createdDir.id);
    await createdDir.save();

    parentDir.foldersCount += 1;
    await parentDir.save();

    return customResp(res, 201, `Folder "${folderName}" created`);
  } catch (error) {
    console.error("Folder creation failed:", error);
    const errStr = "Internal Server Error: Folder creation failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  RENAME DIRECTORY
export const renameDirectory = async (req, res, next) => {
  try {
    const { id: userID } = req.user;
    const folderID = req.params.id;
    if (!folderID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "Invalid folder ID");
    }
    validateMongoID(res, folderID);

    const { success, data, error } = folderSchema.safeParse(req.body);
    if (!success) return customErr(res, 400, error.issues[0].message);

    const { folderName } = data;

    const renamed = await DirectoryModel.findOneAndUpdate(
      { _id: folderID, userID },
      { $set: { name: folderName } }
    );
    if (!renamed) {
      res.clearCookie("sessionID");
      return customErr(res, 400, "Folder deleted or Access denied");
    } else {
      return customResp(
        res,
        201,
        `Folder renamed from "${renamed.name}" to "${folderName}"`
      );
    }
  } catch (error) {
    console.error("Folder rename failed:", error);
    const errStr = "Internal Server Error: Folder rename failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  DELETE DIRECTORY
export const deleteDirectory = async (req, res, next) => {
  try {
    const folderID = req.params.id;
    if (!folderID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "Invalid folder ID");
    }
    validateMongoID(res, folderID);

    const folder = await DirectoryModel.findById(folderID);
    if (!folder) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "Folder deleted or Access denied");
    }

    const { _id, parentFID } = folder;

    const parentFolder = await DirectoryModel.findById(parentFID);

    parentFolder.foldersCount -= 1;
    await parentFolder.save();

    const s3Deletes = [];
    const innerFiles = [];
    const innerFolders = [];
    innerFolders.push(_id);

    await deleteDirContents(folderID, s3Deletes, innerFiles, innerFolders);
    // console.log({ innerFiles }, { innerFolders });

    if (s3Deletes.length > 0) await deleteS3Files(s3Deletes);

    await Promise.all([
      DirectoryModel.deleteMany({ _id: { $in: innerFolders } }),
      FileModel.deleteMany({ _id: { $in: innerFiles } }),
    ]);

    editFolderSize(res, parentFolder, folder.size, "dec");

    return customResp(res, 201, `Folder "${folder.name}" deleted`);
  } catch (error) {
    console.error("Folder deletion failed:", error);
    const errStr = "Internal Server Error: Folder deletion failed";
    return customErr(res, 500, errStr);
  }
};
