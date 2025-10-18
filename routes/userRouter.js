import express from "express";
import checkAuth from "../auth.js";
import {
  getUserDetails,
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

//*===============>  USER LOGOUT
userRouter.post("/user/logout", checkAuth, logoutUser);

export default userRouter;
