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
userRouter.post("/register", registerUser);

//*===============>  LOGIN USER
userRouter.post("/login", loginUser);

//*===============>  USER PROFILE
userRouter.get("/profile", checkAuth, getUserDetails);

//*===============>  USER STORAGE
userRouter.get("/storage-details", checkAuth, getUserStorage);

//*===============>  USER LOGOUT
userRouter.post("/logout", checkAuth, logoutUser);

export default userRouter;
