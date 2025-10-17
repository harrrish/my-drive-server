import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//* ROUTE IMPORTS
import directoryRouter from "./routes/directoryRouter.js";
import filesRouter from "./routes/filesRouter.js";
import userRouter from "./routes/userRouter.js";
import authRouter from "./routes/authRouter.js";
//* UTIL IMPORTS
import checkAuth from "./auth.js";
import { connectDB } from "./config/dbConfig.js";

//* Connecting to Database
connectDB();

//*Express app creation
const app = express();

// //* CORS
app.use(
  cors({
    origin: "https://my-drive-client.onrender.com",
    credentials: true,
  })
);

//* Cookie-Parser
app.use(cookieParser(process.env.COOKIE_SECRET));
//* To parse the json from the request body
app.use(express.json());

//* USER
app.use("/", userRouter);

//* FILE
app.use("/file", checkAuth, filesRouter);

//* DIRECTORY
app.use("/directory", checkAuth, directoryRouter);

//* AUTH
app.use("/auth", authRouter);

app.get("/test", (req, res) => {
  res.cookie("sessionID", sessionID, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    signed: true,
    maxAge: 60 * 60 * 1000,
  });
  return res.send("Hello");
});

app.listen(process.env.PORT, () =>
  console.log(`Express app running on PORT:${process.env.PORT} `)
);
