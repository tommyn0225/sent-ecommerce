import { NextResponse } from "next/server";

const SENT_API_KEY = process.env.SENT_DM_API_KEY;
const SENT_API_URL = "https://api.sent.dm/v3/messages";

// Store OTP codes in memory (move to Supabase later)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Send the OTP via Sent API with sandbox mode enabled
    const response = await fetch(SENT_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": SENT_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sandbox: true,
        to: [phone],
        template: {
          id: "sent_Verify_Code_2",
          name: "sent_Verify_Code_2",
          parameters: { "0": code },
        },
      }),
    });

    const data = await response.json();
    console.log("Sent API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Sent API error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send OTP" },
        { status: response.status }
      );
    }

    // Store the code with a 5-minute expiration
    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      sandbox: true,
      otp: code, // Only exposing because of sandbox mode
    });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

export { otpStore };