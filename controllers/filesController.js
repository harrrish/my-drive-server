import path from "node:path";
import FileModel from "../models/FileModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import {
  createGetSignedUrl,
  createUploadSignedUrl,
  deleteS3File,
  getS3FileMetaData,
} from "../config/s3.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import mime from "mime";
import { editFolderSize } from "../utils/EditFolderSize.js";

//*===============>  INITIATE FILE UPLOAD
export const uploadInitiate = async (req, res) => {
  try {
    const filename = req.filename;
    const filesize = req.filesize;
    const currentDirID = req.currentDirID;
    const currentDirPath = req.currentDirPath;
    const userID = req.userID;
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);

    const insertedFile = await FileModel.create({
      extension,
      name: filename,
      basename,
      size: filesize,
      folderID: currentDirID,
      userID: userID,
      isUploading: true,
      path: { dirPath: currentDirPath, name: filename },
    });

    const contentType = mime.getType(filename) || "application/octet-stream";
    const uploadSignedUrl = await createUploadSignedUrl({
      key: `${insertedFile._id}${extension}`,
      contentType,
    });

    return res.status(200).json({ uploadSignedUrl, fileID: insertedFile.id });
  } catch (error) {
    console.error("File upload failed:", error);
    const errStr = "Internal Server Error: File upload failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  UPDATE FILE UPLOAD COMPLETE
export const uploadComplete = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const { fileID, size } = req.body;
    if (!fileID || !size) {
      res.clearCookie("sessionID");
      return customErr(res, 400, "Invalid file upload");
    }
    if (fileID) validateMongoID(res, fileID);

    const file = await FileModel.findOne({ _id: fileID, userID });
    if (!file) return customErr(res, 404, "File Access denied or File deleted");

    const fileHeadData = await getS3FileMetaData(`${file.id}${file.extension}`);
    if (!fileHeadData) {
      await file.deleteOne();
      res.clearCookie("sessionID");
      return customErr(res, 400, "Corrupt/Deleted file");
    }
    if (fileHeadData.ContentLength !== size) {
      await file.deleteOne();
      res.clearCookie("sessionID");
      return customErr(res, 400, "File size altered");
    }

    file.isUploading = false;
    await file.save();

    const parentFolder = await DirectoryModel.findById(file.folderID);

    parentFolder.filesCount += 1;
    await parentFolder.save();
    editFolderSize(res, parentFolder, size, "inc");

    return customResp(res, 200, "File upload complete");
  } catch (error) {
    console.error("File upload failed:", error);
    const errStr = "Internal Server Error: File upload failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  GET FILE CONTENT
export const getFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;

    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    if (fileID) validateMongoID(res, fileID);

    const fileData = await FileModel.findOne({ _id: fileID, userID });

    if (!fileData)
      return customErr(res, 400, "File deleted or File access denied");

    const { name, extension } = fileData;

    const download = req.query.action === "download";
    const fileUrl = await createGetSignedUrl({
      key: `${fileID}${extension}`,
      download,
      filename: name,
    });
    return res.redirect(fileUrl);
  } catch (error) {
    console.error("Failed to fetch file:", error);
    const errStr = "Internal Server Error: Failed to fetch file";
    return customErr(res, 500, errStr);
  }
};

//*===============>  RENAME FILE
export const renameFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;

    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "Invalid file ID");
    }

    if (fileID) validateMongoID(res, fileID);

    const { newName, basename } = req.body;
    if (!basename.trim()) return customErr(res, 400, "Invalid file name");

    const { acknowledged } = await FileModel.updateOne(
      { _id: fileID, userID },
      { $set: { name: newName, basename } }
    );

    if (!acknowledged) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "File Deleted or Access Denied");
    } else return customResp(res, 201, "File name updated");
  } catch (error) {
    console.error("File rename failed:", error);
    const errStr = "Internal Server Error: File rename failed";
    return customErr(res, 500, errStr);
  }
};

//*===============>  DELETE FILE
export const deleteFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;
    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "Invalid file ID");
    }
    if (fileID) validateMongoID(res, fileID);

    const fileData = await FileModel.findOne({ _id: fileID, userID });
    if (!fileData) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "File Deleted or Access Denied");
    }

    const { _id, folderID, extension, size } = fileData;
    const resp = await deleteS3File(`${fileData.id}${extension}`);
    if (resp.$metadata.httpStatusCode !== 204) {
      return customErr(res, 404, "File Deleted or Access Denied");
    }

    const isFileDeleted = await FileModel.deleteOne({ _id, userID });

    if (!isFileDeleted.acknowledged) {
      res.clearCookie("sessionID");
      return customErr(res, 401, "File Deleted or Access Denied");
    } else {
      parentFolder = await DirectoryModel.findById(folderID);
      parentFolder.filesCount -= 1;
      await parentFolder.save();
      editFolderSize(res, parentFolder, size, "dec");
      return customResp(res, 201, fileDeleteSuccess);
    }
  } catch (error) {
    console.error("File deletion failed:", error);
    const errStr = "Internal Server Error: File deletion failed";
    return customErr(res, 500, errStr);
  }
};
