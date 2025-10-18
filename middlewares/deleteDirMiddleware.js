import FileModel from "../models/FileModel.js";
import DirectoryModel from "../models/DirectoryModel.js";

export async function deleteDirContents(
  folderID,
  s3Deletes,
  filesList,
  foldersList
) {
  //*===============>  S3 Deletes
  const s3Files = await FileModel.find({ folderID }, { _id: 1, extension: 1 });
  s3Deletes.push(
    ...s3Files.map(({ _id, extension }) => {
      return { Key: `${_id.toString()}${extension}` };
    })
  );

  //*===============>  DB Files
  const filesFound = await FileModel.find({ folderID }, { _id: 1 });
  filesList.push(...filesFound.map((file) => file._id));

  //*===============>  DB Folders
  const foldersFound = await DirectoryModel.find(
    {
      parentFID: folderID,
    },
    { _id: 1 }
  );
  foldersList.push(...foldersFound.map((folder) => folder._id));

  //*===============>  Recursion
  for (const { _id } of foldersFound) {
    // console.log(_id);
    await deleteDirContents(_id, s3Deletes, filesList, foldersList);
  }
}
