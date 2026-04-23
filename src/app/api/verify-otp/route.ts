import { NextResponse } from "next/server";
import { otpStore } from "../send-otp/route";

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json(
      { error: "Phone and code are required" },
      { status: 400 }
    );
  }

  const stored = otpStore.get(phone);

  if (!stored) {
    return NextResponse.json(
      { error: "No code found. Request a new one." },
      { status: 400 }
    );
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return NextResponse.json(
      { error: "Code expired. Request a new one." },
      { status: 400 }
    );
  }

  if (stored.code !== code) {
    return NextResponse.json(
      { error: "Invalid code. Try again." },
      { status: 400 }
    );
  }

  // Code is correct — clean up
  otpStore.delete(phone);

  return NextResponse.json({ success: true, verified: true });
}