import OTP from "../models/OTPModel.js";
import nodemailer from "nodemailer";

export async function sendOTP(email) {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const html = `<div style="font-family:monospace">
                    <h2>Your OTP is: ${otp}</h2>
                    <p>OTP is valid for 1 minute !</p>
                </div>`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587, //*===============>  default port
      auth: {
        user: "harrrish19aws@gmail.com",
        pass: process.env.GOOGLE_AUTH_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `My Drive`,
      to: `${email}`,
      subject: "OTP Verification",
      html,
    });
    // console.log("OTP sent: %s", info.messageId);
    return { success: true };
  } catch (error) {
    console.log(`OTP generation failed:${error}`);
    return { success: false, error: "OTP generation failed" };
  }
}
