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

/* 
    console.error("OTP generation failure:", error);
    const errStr = "Internal Server Error: OTP generation failure";
    return customErr(res, 500, errStr);
*/
