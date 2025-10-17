import path from "node:path";
import FileModel from "../models/FileModel.js";
import DirectoryModel from "../models/DirectoryModel.js";
import {
  customErr,
  customResp,
  errorSession,
  fileDeleteSuccess,
  fileErr,
  fileNameErr,
  fileRenameSuccess,
  fileUploadError,
  fileUploadSuccess,
  INS,
} from "../utils/customReturn.js";
import {
  createGetSignedUrl,
  createUploadSignedUrl,
  deleteS3File,
  getS3FileMetaData,
} from "../config/s3.js";
import { validateMongoID } from "../utils/validateMongoID.js";
import mime from "mime";
import { editFolderSize } from "../utils/EditFolderSize.js";

//* INITIATE FILE UPLOAD
export const uploadInitiate = async (req, res) => {
  try {
    const filename = req.filename;
    const filesize = req.filesize;
    const currentDirID = req.currentDirID;
    const currentDirPath = req.currentDirPath;
    const userID = req.userID;
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);

    let insertedFile;
    try {
      //* Creating the file data in MongoDB
      insertedFile = await FileModel.create({
        extension,
        name: filename,
        basename,
        size: filesize,
        folderID: currentDirID,
        userID: userID,
        isUploading: true,
        path: { dirPath: currentDirPath, name: filename },
      });
    } catch (error) {
      console.log(`Error_08:${error}`);
      return customErr(res, 500, INS);
    }

    let uploadSignedUrl;
    try {
      const contentType = mime.getType(filename) || "application/octet-stream";
      //* Generate pre-signed S3 upload URL
      uploadSignedUrl = await createUploadSignedUrl({
        key: `${insertedFile._id}${extension}`,
        contentType,
      });
    } catch (error) {
      console.log(`Error_09:${error}`);
      return customErr(res, 500, INS);
    }

    return res.status(200).json({ uploadSignedUrl, fileID: insertedFile.id });
  } catch (error) {
    console.log(`Error_10:${error}`);
    return customErr(res, 500, INS);
  }
};

//* UPDATE FILE UPLOAD COMPLETE
export const uploadComplete = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const { fileID, size } = req.body;

    if (!fileID || !size) {
      // console.log({ fileID, size });
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    if (fileID) validateMongoID(res, fileID);

    let file;
    try {
      file = await FileModel.findOne({ _id: fileID, userID });
    } catch (error) {
      console.log(`Error_11:${error}`);
      return customErr(res, 500, INS);
    }

    if (!file) {
      return customErr(res, 404, fileErr);
    }

    let fileHeadData;
    try {
      fileHeadData = await getS3FileMetaData(`${file.id}${file.extension}`);
    } catch (error) {
      console.log(`Error_12:${error}`);
      return customErr(res, 500, INS);
    }

    if (!fileHeadData) {
      await file.deleteOne();
      res.clearCookie("sessionID");
      return customErr(res, 400, fileUploadError);
    }

    if (fileHeadData.ContentLength !== size) {
      await file.deleteOne();
      res.clearCookie("sessionID");
      return customErr(res, 404, errorSession);
    }

    try {
      file.isUploading = false;
      await file.save();
    } catch (error) {
      console.log(`Error_13:${error}`);
      return customErr(res, 500, INS);
    }

    let parentFolder;
    try {
      parentFolder = await DirectoryModel.findById(file.folderID);
    } catch (error) {
      console.log(`Error_14:${error}`);
      return customErr(res, 500, INS);
    }

    if (!parentFolder) {
      res.clearCookie("sessionID");
      return customErr(res, 401, dirErr);
    }

    try {
      parentFolder.filesCount += 1;
      await parentFolder.save();
    } catch (error) {
      console.log(`Error_15:${error}`);
      return customErr(res, 500, INS);
    }
    editFolderSize(res, parentFolder, size, "inc");

    return customResp(res, 200, fileUploadSuccess);
  } catch (error) {
    console.log(`Error_16:${error}`);
    return customErr(res, 500, INS);
  }
};

//* GET FILE CONTENT
export const getFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;

    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    if (fileID) validateMongoID(res, fileID);

    let fileData;
    try {
      fileData = await FileModel.findOne({ _id: fileID, userID });
    } catch (error) {
      console.log(`Error_17:${error}`);
      return customErr(res, 500, INS);
    }

    if (!fileData) {
      return customErr(res, 400, fileErr);
    }

    const { name, extension } = fileData;

    try {
      const download = req.query.action === "download";
      const fileUrl = await createGetSignedUrl({
        key: `${fileID}${extension}`,
        download,
        filename: name,
      });
      return res.redirect(fileUrl);
    } catch (error) {
      console.log(`Error_18:${error}`);
      return customErr(res, 500, INS);
    }
  } catch (error) {
    console.log(`Error_19:${error}`);
    return customErr(res, 500, INS);
  }
};

//* RENAME FILE
export const renameFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;

    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    if (fileID) validateMongoID(res, fileID);

    const { newName, basename } = req.body;
    if (!basename.trim()) return customErr(res, 400, fileNameErr);

    try {
      await FileModel.updateOne(
        { _id: fileID, userID },
        { $set: { name: newName, basename } }
      );
    } catch (error) {
      console.log(`Error_20:${error}`);
      return customErr(res, 500, INS);
    }
    return customResp(res, 201, fileRenameSuccess);
  } catch (error) {
    console.log(`Error_21:${error}`);
    return customErr(res, 500, INS);
  }
};

//* DELETE FILE
export const deleteFile = async (req, res) => {
  try {
    const { _id: userID } = req.user;
    const fileID = req.params.fileID;

    if (!fileID) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    if (fileID) validateMongoID(res, fileID);

    let fileData;
    try {
      fileData = await FileModel.findOne({ _id: fileID, userID });
    } catch (error) {
      console.log(`Error_23:${error}`);
      return customErr(res, 500, INS);
    }

    if (!fileData) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    const { _id, folderID, extension, size } = fileData;

    try {
      const resp = await deleteS3File(`${fileData.id}${extension}`);
      if (resp.$metadata.httpStatusCode !== 204) {
        return customErr(res, 404, fileErr);
      }
    } catch (error) {
      console.log(`Error_24:${error}`);
      return customErr(res, 500, INS);
    }

    let isFileDeleted;
    try {
      isFileDeleted = await FileModel.deleteOne({ _id, userID });
    } catch (error) {
      console.log(`Error_25:${error}`);
      return customErr(res, 500, INS);
    }

    if (!isFileDeleted.acknowledged) {
      res.clearCookie("sessionID");
      return customErr(res, 401, errorSession);
    }

    let parentFolder;
    try {
      parentFolder = await DirectoryModel.findById(folderID);
    } catch (error) {
      console.log(`Error_26:${error}`);
      return customErr(res, 500, INS);
    }

    if (!parentFolder) {
      res.clearCookie("sessionID");
      return customErr(res, 401, dirErr);
    }

    try {
      parentFolder.filesCount -= 1;
      await parentFolder.save();
    } catch (error) {
      console.log(`Error_27:${error}`);
      return customErr(res, 500, INS);
    }

    editFolderSize(res, parentFolder, size, "dec");

    return customResp(res, 201, fileDeleteSuccess);
  } catch (error) {
    console.log(`Error_28:${error}`);
    return customErr(res, 500, INS);
  }
};

//* UPLOAD CANCEL
// export const uploadCancel = async (req, res) => {
//   const { _id: userID } = req.user;
//   const { fileID, size } = req.body;

//   if (!fileID || !size) {
//     res.clearCookie("sessionID");
//     return customErr(res, 400, badRequest);
//   }

//   if (fileID) validateMongoID(res, fileID);

//   let file;
//   try {
//     file = await FileModel.findOne({ _id: fileID, userID });
//   } catch (dbError) {
//     console.log({ dbError });
//     return customErr(res, 500, internalServerErr);
//   }

//   if (!file) {
//     res.clearCookie("sessionID");
//     return customErr(res, 404, fileErr);
//   }

//   let fileHeadData;
//   try {
//     fileHeadData = await getS3FileMetaData(`${file.id}${file.extension}`);
//   } catch (s3Error) {
//     await file.deleteOne();
//     console.log({ s3Error });
//     return customErr(res, 500, fileUploadError);
//   }

//   if (!fileHeadData) {
//     await file.deleteOne();
//     res.clearCookie("sessionID");
//     return customErr(res, 404, fileUploadError);
//   }

//   if (fileHeadData.ContentLength !== size) {
//     await file.deleteOne();
//     res.clearCookie("sessionID");
//     return customErr(res, 404, fileSizeMatchFailed);
//   }

//   try {
//     file.isUploading = false;
//     await file.save();
//   } catch (dbError) {
//     console.log({ dbError });
//     return customErr(res, 500, internalServerErr);
//   }

//   let parentFolder;
//   try {
//     parentFolder = await DirectoryModel.findById(file.folderID);
//   } catch (dbError) {
//     console.log({ dbError });
//     return customErr(res, 500, internalServerErr);
//   }

//   if (!parentFolder) {
//     res.clearCookie("sessionID");
//     return customErr(res, 401, dirErr);
//   }

//   try {
//     parentFolder.filesCount += 1;
//     await parentFolder.save();
//   } catch (dbError) {
//     console.log({ dbError });
//     return customErr(res, 500, internalServerErr);
//   }

//   return customResp(res, 200, fileUploadSuccess);
// };
