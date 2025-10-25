import OTP from "../models/OTPModel.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTP(email) {
  // console.log(email) //* email is replaced by "haridir150@gmail.com" since Resend does not support other email ID's in free version.
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const html = `<div style="font-family:monospace">
                    <h2>Your OTP is: ${otp}</h2>
                    <p>PS: OTP is valid for 3 minutes !</p>
                </div>`;

    const { data, error } = await resend.emails.send({
      from: "My Drive <onboarding@resend.dev>",
      to: "haridir150@gmail.com",
      subject: "Resend: My Drive OTP Verification",
      html,
    });

    // console.log(data, error);

    if (data.id) {
      return { success: true };
    } else {
      return { success: false, error: "Resend failed to generate OTP" };
    }
  } catch (error) {
    console.log(`OTP generation failed:${error}`);
    return { success: false, error: "OTP generation failed" };
  }
}
