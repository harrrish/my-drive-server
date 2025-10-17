import { model, Schema } from "mongoose";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a File name"],
      trim: true,
    },
    basename: {
      type: String,
    },
    extension: {
      type: String,
    },
    size: {
      type: Number,
    },
    userID: {
      type: Schema.Types.ObjectId,
      required: [true, "userID is not mentioned !"],
      ref: "User",
    },
    folderID: {
      type: Schema.Types.ObjectId,
      required: [true, "Parent Directory ID is not mentioned !"],
      ref: "Directory",
    },
    path: {
      dirPath: [
        {
          type: Schema.Types.ObjectId,
          ref: "Directory",
        },
      ],
      name: String,
    },
    isUploading: {
      type: Boolean,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  }
);

const File = model("File", fileSchema);

export default File;
