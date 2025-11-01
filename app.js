import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRouter from "./routes/directoryRouter.js";
import filesRouter from "./routes/filesRouter.js";
import userRouter from "./routes/userRouter.js";
import authRouter from "./routes/authRouter.js";
import checkAuth from "./auth.js";
import { connectDB } from "./config/dbConfig.js";

connectDB();
const PORT = process.env.PORT || 4000;
const env = process.env.NODE_ENV;
const url = process.env.URL;

const app = express();

app.use(
  cors({
    origin: url,
    credentials: true,
  })
);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Welcome to My-Drive" });
});

app.use("/user", userRouter);
app.use("/file", checkAuth, filesRouter);
app.use("/directory", checkAuth, directoryRouter);
app.use("/auth", authRouter);

app.listen(PORT, () =>
  console.log(`Express app running on PORT:${process.env.PORT} `)
);
