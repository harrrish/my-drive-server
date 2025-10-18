export const customErr = (res, status, value) => {
  return res.status(status).json({ error: `${value}` });
};

export const customResp = (res, status, value) => {
  return res.status(status).json({ message: `${value}` });
};

/* 
return customErr(res, 400, "Invalid Credentials");
return customResp(res, 200, "User logged in");
*/
