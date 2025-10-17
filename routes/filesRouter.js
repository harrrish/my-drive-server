import express from "express";
import {
  deleteFile,
  getFile,
  renameFile,
  uploadComplete,
} from "../controllers/filesController.js";
import { checkFileSize } from "../middlewares/checkFileSizeMiddleware.js";
import { uploadInitiate } from "../controllers/filesController.js";

const filesRouter = express.Router();

//* INITIATE FILE UPLOAD
filesRouter.post("/upload/initiate", checkFileSize, uploadInitiate);

//* UPDATE FILE UPLOAD COMPLETE
filesRouter.post("/upload/complete", uploadComplete);

//* GET FILE CONTENT
filesRouter.get("/:fileID", getFile);

//* RENAME FILE
filesRouter.patch("/:fileID", renameFile);

//* DELETE FILE
filesRouter.delete("/:fileID", deleteFile);

export default filesRouter;
