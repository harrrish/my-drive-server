import mongoose from "mongoose";
import { customErr } from "../utils/customReturn.js";

export const validateMongoID = (res, mongoID) => {
  if (!mongoose.Types.ObjectId.isValid(mongoID)) {
    res.clearCookie("sessionID");
    return customErr(res, 401, "Invalid session ID");
  }
};
