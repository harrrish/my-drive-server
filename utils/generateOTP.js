import OTP from "../models/OTPModel.js";
import nodemailer from "nodemailer";

export async function sendOTP(email) {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.log(`Error_72:${error}`);
    return customErr(res, 500, INS);
  }

  const html = `<div style="font-family:monospace">
                    <h2>Your OTP is: ${otp}</h2>
                    <p>OTP is valid for 1 minute !</p>
                </div>`;

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587, //* default port
      auth: {
        user: "harrrish19aws@gmail.com",
        pass: process.env.GOOGLE_AUTH_PASSWORD,
      },
    });
  } catch (error) {
    console.log(`Error_73:${error}`);
    return customErr(res, 500, INS);
  }

  let info;
  try {
    info = await transporter.sendMail({
      from: `Harish S <haridir150@gmail.com>`,
      to: `${email}`,
      subject: "OTP Verification",
      html,
    });
    return true;
  } catch (error) {
    console.log(`Error_74:${error}`);
    return customErr(res, 500, INS);
  }

  console.log("OTP sent: %s", info.messageId);
}
