import DirectoryModel from "../models/DirectoryModel.js";
import { customErr } from "./customReturn.js";

export const editFolderSize = async (res, parentFolder, size, type) => {
  while (parentFolder !== null) {
    // console.log(parentFolder.id);
    if (type === "inc") {
      parentFolder.size += size;
    } else if (type === "dec") {
      parentFolder.size -= size;
    }
    try {
      await parentFolder.save();
      const newParentFolder = await DirectoryModel.findOne({
        _id: parentFolder.parentFID,
      });
      parentFolder = newParentFolder;
    } catch (error) {
      console.error("Failed to edit size:", error);
      return customErr(
        res,
        500,
        "Internal Server Error: Failed to edit folder size"
      );
    }
  }
};
