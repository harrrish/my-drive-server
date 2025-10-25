import express from "express";
import checkAuth from "../auth.js";
import {
  getUserDetails,
  getUserStorage,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/userController.js";

const userRouter = express.Router();

//*===============>  REGISTER USERS
userRouter.post("/user/register", registerUser);

//*===============>  LOGIN USER
userRouter.post("/user/login", loginUser);

//*===============>  USER PROFILE
userRouter.get("/user/profile", checkAuth, getUserDetails);

//*===============>  USER STORAGE
userRouter.get("/user/storage-details", checkAuth, getUserStorage);

//*===============>  USER LOGOUT
userRouter.post("/user/logout", checkAuth, logoutUser);

export default userRouter;
