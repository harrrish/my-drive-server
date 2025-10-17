import DirectoryModel from "../models/DirectoryModel.js";
import FileModel from "../models/FileModel.js";
import { deleteDirContents } from "../middlewares/deleteDirMiddleware.js";
import { folderSchema } from "../zodModels/authSchema.js";
import {
  customErr,
  customResp,
  dirCreatedSuccess,
  dirDeletedSuccess,
  dirErr,
  dirRenamedSuccess,
  INS,
} from "../utils/customReturn.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import { deleteS3Files } from "../config/s3.js";
import { editFolderSize } from "../utils/EditFolderSize.js";

//* GET DIRECTORY ITEMS
export const getDirectoryContents = async (req, res, next) => {
  try {
    //* user ID and root ID
    const { id: userID, rootID } = req.user;

    //* Fetching current folder ID
    const folderID = req.params.id;
    let currentDirID = folderID ? folderID : rootID;

    //* Checking if the req params has a valid mongoID
    if (currentDirID !== folderID) validateMongoID(res, currentDirID);

    let currentFolder;
    try {
      currentFolder = await DirectoryModel.findOne({
        _id: currentDirID,
        userID,
      });
    } catch (error) {
      console.log(`Error_29:${error}`);
      return customErr(res, 500, INS);
    }
    //* If current directory not found
    if (!currentFolder) return customErr(res, 404, dirErr);

    //* Getting count of files, folder and path from the parent folder
    const { filesCount, foldersCount, path } = currentFolder;
    let pathData;
    if (path.length > 0) {
      pathData = await Promise.all(
        path.map(async (dirId) => {
          try {
            const dir = await DirectoryModel.findById(dirId).select("name");
            return dir ? { id: dir.id, name: dir.name } : null;
          } catch (error) {
            console.log(`Error_30:${error}`);
            return customErr(res, 500, INS);
          }
        })
      );
    }

    //* Getting the folders list from the parent directory
    let directories;
    try {
      directories = await DirectoryModel.find({
        userID,
        parentFID: currentDirID,
      });
    } catch (error) {
      console.log(`Error_31:${error}`);
      return customErr(res, 500, INS);
    }

    //* Getting the files list from the parent directory
    let files;
    try {
      files = await FileModel.find({
        folderID: currentDirID,
        userID,
        isUploading: false,
      });
    } catch (error) {
      console.log(`Error_32:${error}`);
      return customErr(res, 500, INS);
    }

    let storageUsed;
    try {
      let rootFolderData = await DirectoryModel.findById(rootID);
      // console.log(rootFolderData.size);
      storageUsed = rootFolderData.size;
    } catch (error) {
      console.log(`Error_33:${error}`);
      return customErr(res, 500, INS);
    }
    return res.status(200).json({
      filesCount,
      files,
      foldersCount,
      directories,
      path: pathData,
      storageUsed,
    });
  } catch (error) {
    console.log(`Error_34:${error}`);
    return customErr(res, 500, INS);
  }
};

//* CREATE A DIRECTORY
export const createDirectory = async (req, res, next) => {
  try {
    //* user ID and root ID
    const { id: userID, rootID } = req.user;

    //* Fetching current folder ID
    const folderID = req.params.id;
    let currentDirID = folderID ? folderID : rootID;

    //* Checking if the req params has a valid mongoID
    if (rootID.toString() !== currentDirID.toString())
      validateMongoID(res, currentDirID);

    //* Fetching folder name from request body
    const { success, data, error } = folderSchema.safeParse(req.body);
    if (!success) {
      // console.log({ error: error.issues[0].message });
      return customErr(res, 400, error.issues[0].message);
    }

    const { folderName } = data;

    //* Checking if parent folder exists to create folder.
    let parentDir;
    try {
      parentDir = await DirectoryModel.findOne({
        _id: currentDirID,
        userID,
      });
    } catch (error) {
      console.log(`Error_35:${error}`);
      return customErr(res, 500, INS);
    }

    if (!parentDir) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* Creating the folder
    let createdDir;
    try {
      createdDir = await DirectoryModel.create({
        name: folderName,
        parentFID: parentDir.id,
        userID,
        path: parentDir.path,
      });
    } catch (error) {
      console.log(`Error_36:${error}`);
      return customErr(res, 500, INS);
    }

    //* Updating the path of the new folder
    try {
      createdDir.path.push(createdDir.id);
      await createdDir.save();
    } catch (error) {
      console.log(`Error_37:${error}`);
      return customErr(res, 500, INS);
    }

    //* Increasing folder count in parent folder
    try {
      parentDir.foldersCount += 1;
      await parentDir.save();
    } catch (error) {
      console.log(`Error_38:${error}`);
      return customErr(res, 500, INS);
    }

    return customResp(res, 201, dirCreatedSuccess);
  } catch (error) {
    console.log(`Error_39:${error}`);
    return customErr(res, 500, INS);
  }
};

//* RENAME DIRECTORY
export const renameDirectory = async (req, res, next) => {
  try {
    //* user ID
    const { id: userID } = req.user;
    const folderID = req.params.id;

    //* Checking if a non-empty param id
    if (!folderID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* Validating folderID from the user
    validateMongoID(res, folderID);

    //* Finding the folder
    let directoryData;
    try {
      directoryData = await DirectoryModel.findOne({ _id: folderID, userID });
    } catch (error) {
      console.log(`Error_40:${error}`);
      return customErr(res, 500, INS);
    }

    if (!directoryData) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* Fetching the new folder name
    const { success, data, error } = folderSchema.safeParse(req.body);
    if (!success) {
      // console.log(error.issues[0].message);
      return customErr(res, 400, error.issues[0].message);
    }
    const { folderName } = data;

    //* Updating the folder name
    try {
      await DirectoryModel.updateOne(
        { _id: folderID, userID },
        { $set: { name: folderName } },
        { new: true }
      );
    } catch (error) {
      console.log(`Error_41:${error}`);
      return customErr(res, 500, INS);
    }

    return customResp(res, 201, dirRenamedSuccess);
  } catch (error) {
    console.log(`Error_42:${error}`);
    return customErr(res, 500, INS);
  }
};

//* DELETE DIRECTORY
export const deleteDirectory = async (req, res, next) => {
  try {
    //* Get directoryID from the user
    const folderID = req.params.id;

    //* Checking if a non-empty param id
    if (!folderID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* Validate the ID
    validateMongoID(res, folderID);

    //* Checking the folder exists
    let folder;
    try {
      folder = await DirectoryModel.findById(folderID);
    } catch (error) {
      console.log(`Error_43:${error}`);
      return customErr(res, 500, INS);
    }

    if (!folder) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    const { _id, parentFID } = folder;

    //* Finding the parent folder to reduce folder count
    let parentFolder;
    try {
      parentFolder = await DirectoryModel.findById(parentFID);
    } catch (error) {
      console.log(`Error_44:${error}`);
      return customErr(res, 500, INS);
    }

    if (!parentFolder) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    //* Reducing the folder count
    try {
      parentFolder.foldersCount -= 1;
      await parentFolder.save();
    } catch (error) {
      console.log(`Error_45:${error}`);
      return customErr(res, 500, INS);
    }

    //* Delete folder contents
    const s3Deletes = [];
    const innerFiles = [];
    const innerFolders = [];
    innerFolders.push(_id);

    try {
      await deleteDirContents(folderID, s3Deletes, innerFiles, innerFolders);
    } catch (error) {
      console.log(`Error_46:${error}`);
      return customErr(res, 500, INS);
    }

    //* Running the S3 delete only if there are files
    if (s3Deletes.length > 0) {
      try {
        await deleteS3Files(s3Deletes);
      } catch (error) {
        console.log(`Error_47:${error}`);
        return customErr(res, 500, INS);
      }
    }

    //* Deleting all folders and files in DB
    try {
      await Promise.all([
        DirectoryModel.deleteMany({ _id: { $in: innerFolders } }),
        FileModel.deleteMany({ folderID: { $in: innerFiles } }),
      ]);
    } catch (error) {
      console.log(`Error_48:${error}`);
      return customErr(res, 500, INS);
    }

    editFolderSize(res, parentFolder, folder.size, "dec");

    return customResp(res, 201, dirDeletedSuccess);
  } catch (error) {
    console.log(`Error_49:${error}`);
    return customErr(res, 500, INS);
  }
};
