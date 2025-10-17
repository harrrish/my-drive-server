//* SERVER ERRORS
export const INS = "Internal Server Error !";

//* USER ERRORS
export const errorSession = "Authentication failed OR Expired session !";
export const fileDetailsErr = "Invalid file details or Corrupt file !";
export const dirErr = "Missing or unauthorized directory";
export const userRootDirError = "User root directory does not exists";
export const fileUploadError = "File Upload failed";

//* ---------------- ---------------- ----------------

export const internalServerErr = "Internal server error";

//* ---------------- USER REGISTRATION ----------------
export const userDuplicateCheckFailure = "SE: Unable to check email duplicate";
export const emailDuplicate = "User email exists";
export const OTPCheckFailure = "SE: Unable to verify OTP for user";
export const invalidOTP = "Expired or invalid OTP";
export const OTPDeletionFailed = "SE: Unable to delete OTP for user";
export const userRegistrationFailed = "SE: Unable to register user";
//* ---------------- USER LOGIN ----------------

//* ---------------- AUTH ----------------
export const serverErrorSessionCheck = "SE: Unable to find user session";
export const serverErrorUserCheck = "SE: Unable to find user";

//* ---------------- MIDDLEWARE ----------------
export const invalidFileType = "Invalid file, upload failed";
export const serverUserDirCheck = "SE: Unable to find user directory";
export const serverRootDirCheck = "SE: Unable to user root directory";
export const insufficientStorage = "Insufficient storage, Buy Premium !";

//* ---------------- FILE UPLOAD ----------------
export const serverFileUploadError = "SE: Unable to upload file";
export const cloudFileUploadError = "SE: Unable to upload file to cloud";
export const serverFileCheck = "SE: Unable to find user file";
export const fileErr = "Missing or unauthorized file";
export const fileSizeMatchFailed = "File size tampered";
export const serverFileStatusUploadError = "SE: Unable to upload file status";
export const serverParentDirErr = "SE: Unable to find parent folder";
export const serverDirCountErr = "SE: Unable to increase parent folder count";
export const serverDirSizeErr = "SE: Unable to edit parent folder size";

//* ---------------- GET FILE ----------------
export const serverFetchFileErr = "SE: Unable to fetch file";
export const serverCloudFetch = "SE: Unable to fetch file from cloud";

//* ---------------- RENAME FILE ----------------
export const fileNameErr = "Please provide a valid file name";
export const serverRenameFileErr = "SE: Unable to rename file";

//* ---------------- AUTHENTICATION & AUTHORIZATION ERRORS ----------------
export const error401 = "Unauthenticated user";
export const error403 = "Unauthorized access";
export const invalidCreds = "Invalid Credentials";
export const missingCreds = "Credentials missing or OTP";
export const userLoginFailed = "Login attempt failed";
export const userDeleted = "Account no longer active";
//* ---------------- SERVER & REQUEST ERRORS ----------------
export const serverError = "Server error, request failed";
export const badRequest = "Invalid or malformed request";
export const invalidEmail = "Invalid email address";
//* ---------------- DIRECTORY & FILE ERRORS ----------------

export const serverErrSession = "SE: while fetching session";
export const serverUserSession = "SE: while fetching details";

export const dirFetchErr = "SE: while fetching folder contents";
export const pathFetchErr = "SE: while folder path";
export const dirContentFetchErr = "Server while fetching sub folders";
export const fileContentFetchErr = "Server while fetching folder file";

export const folderCreateErr = "SE: while creating folder";
export const folderPathErr = "SE: while updating folder path";
export const folderCountErr = "SE: while increasing folder count";

export const folderRenameErr = "SE: while renaming folder";
export const folderNameUpdateErr = "SE: while updating folder name";

export const folderDeleteErr = "SE: while deleting folder";
export const folderS3DeleteErr = "SE: while deleting folder from cloud";
export const folderMongoDeleteErr = "SE: while deleting folder from database";
export const folderDeleteUpdateErr = "SE: while updating folder name";

export const fileDeleteErr = "SE: while deleting the file";
export const fileDeleteUpdateErr =
  "SE: while updating deleting the file details";

//* ---------------- SUCCESS RESPONSES ----------------
export const userRegSuccess = "Registration successful";
export const userLoginSuccess = "Login successful";
export const dirCreatedSuccess = "New Directory created";
export const dirRenamedSuccess = "Directory renamed";
export const dirDeletedSuccess = "Directory deleted";
export const fileRenameSuccess = "File renamed";
export const fileDeleteSuccess = "File deleted";
export const otpVerified = "OTP verified";
export const fileUploadSuccess = "File Upload success";

export const customErr = (res, status, value) => {
  return res.status(status).json({ error: `${value}` });
};

export const customResp = (res, status, value) => {
  return res.status(status).json({ message: `${value}` });
};

/* 
return customErr(res, 400, "Invalid Credentials !");
return customResp(res, 200, "User logged in !");
*/
