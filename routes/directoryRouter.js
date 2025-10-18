import express from "express";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryContents,
  renameDirectory,
} from "../controllers/directoryControllers.js";

const directoryRouter = express.Router();

//*===============>  CREATING A NEW DIRECTORY
directoryRouter.post("{/:id}", createDirectory);

//*===============>  GETTING FOLDERS & FILES
directoryRouter.get("{/:id}", getDirectoryContents);

//*===============>  RENAME A DIRECTORY
directoryRouter.patch("/:id", renameDirectory);

//*===============>  DELETE A DIRECTORY
directoryRouter.delete("/:id", deleteDirectory);

export default directoryRouter;
