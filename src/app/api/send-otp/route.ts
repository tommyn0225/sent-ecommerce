import { NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Store OTP codes in memory
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await client.messages.create({
      body: `${code} is your verification code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`OTP sent to ${phone}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

export { otpStore };