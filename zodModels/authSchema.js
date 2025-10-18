import * as z from "zod";

//*===============>  OTP SCHEMA
export const otpRequestSchema = z.object({
  email: z
    .email("Please provide a valid email !")
    .trim()
    .min(1, "Please provide a valid email !"),
});

//*===============>  OTP SCHEMA
export const otpVerifySchema = z.object({
  email: z
    .email("Please provide a valid email !")
    .trim()
    .min(1, "Please provide a valid email !"),
  otp: z
    .string("Invalid OTP !")
    .trim()
    .length(4, "Invalid OTP ! ")
    .regex(/^\d{4}$/, "Invalid OTP !"),
});

//*===============>  REGISTER SCHEMA
export const registerSchema = z.object({
  name: z
    .string("Please provide a valid name !")
    .trim()
    .min(3, "Name must be at least 3 characters !"),
  email: z.email("Please provide a valid email !").trim(),
  otp: z
    .string("Invalid OTP !")
    .trim()
    .length(4, "OTP must be exactly 4 digits !")
    .regex(/^\d{4}$/, "OTP must contain only numbers !"),
  password: z
    .string("Please provide a valid password !")
    .trim()
    .min(1, "Please provide a valid password !")
    .min(8, "Password must be at least 8 characters !"),
});

//*===============>  LOGIN SCHEMA
export const loginSchema = z.object({
  email: z
    .email("Please provide a valid email !")
    .trim()
    .min(1, "Please provide a valid email !"),
  password: z
    .string("Please provide a valid password")
    .trim()
    .min(1, "Please provide a valid password !"),
});

//*===============>  FOLDER SCHEMA
export const folderSchema = z.object({
  folderName: z
    .string("Please provide a valid folder name !")
    .trim()
    .min(1, "Please provide a valid folder name !"),
});
