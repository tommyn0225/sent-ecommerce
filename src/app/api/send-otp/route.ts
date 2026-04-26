import { NextResponse } from "next/server";
import twilio from "twilio";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
  const { phone, channel = "sms" } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  // Rate limiting: max 3 OTP requests per phone per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("attempted_at", oneHourAgo);

  if (countError) {
    console.error("Rate limit check failed:", countError);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in an hour." },
      { status: 429 }
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Send OTP via the selected channel
    if (channel === "whatsapp") {
      await twilioClient.messages.create({
        body: `${code} is your verification code.`,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${phone}`,
      });
    } else {
      await twilioClient.messages.create({
        body: `${code} is your verification code.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    // Hash the code before storing
    const codeHash = await bcrypt.hash(code, 10);

    // Delete any existing codes for this phone number
    await supabase.from("otp_codes").delete().eq("phone", phone);

    // Store the hashed code with a 1-minute expiration
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase.from("otp_codes").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to store verification code" },
        { status: 500 }
      );
    }

    // Log the attempt for rate limiting
    await supabase.from("rate_limits").insert({ phone });

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