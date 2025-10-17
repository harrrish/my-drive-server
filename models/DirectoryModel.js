import { model, Schema } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a Folder name"],
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    filesCount: {
      type: Number,
      default: 0,
    },
    foldersCount: {
      type: Number,
      default: 0,
    },
    userID: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentFID: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Directory",
    },
    path: [
      {
        type: Schema.Types.ObjectId,
        ref: "Directory",
      },
    ],
  },
  {
    strict: "throw",
    timestamps: true,
  }
);

const Directory = model("Directory", directorySchema);

export default Directory;
