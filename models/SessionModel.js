//* SESSION's STORED TO REDIS
import { model, Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 4 * 3600,
    },
  },
  {
    strict: "throw",
  }
);

const Session = model("Session", sessionSchema);

export default Session;
