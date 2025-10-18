import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name field is required"],
      minLength: [3, "User name must be minimum of 4 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email field is required"],
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/,
        "Invalid Email ID",
      ],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    rootID: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
    },
    sub: {
      type: String,
    },
    picture: {
      type: String,
      default:
        "https://t3.ftcdn.net/jpg/07/24/59/76/360_F_724597608_pmo5BsVumFcFyHJKlASG2Y2KpkkfiYUU.jpg",
    },
    maxStorageInBytes: {
      type: Number,
      default: 1 * 1024 ** 3,
    },
    role: {
      type: String,
      enum: ["Owner", "Admin", "Manager", "User"],
      default: "User",
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

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  // console.log(await bcrypt.compare(candidatePassword, this.password));
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

export default User;
