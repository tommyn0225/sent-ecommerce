import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json(
      { error: "Phone and code are required" },
      { status: 400 }
    );
  }

  // Look up the stored code for this phone number
  const { data, error: dbError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .single();

  if (dbError || !data) {
    return NextResponse.json(
      { error: "No code found. Request a new one." },
      { status: 400 }
    );
  }

  // Check if the code has expired
  if (new Date() > new Date(data.expires_at)) {
    await supabase.from("otp_codes").delete().eq("phone", phone);
    return NextResponse.json(
      { error: "Code expired. Request a new one." },
      { status: 400 }
    );
  }

  // Compare the submitted code against the hash
  const isValid = await bcrypt.compare(code, data.code_hash);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid code. Try again." },
      { status: 400 }
    );
  }

  // Code is correct — delete it so it can't be reused
  await supabase.from("otp_codes").delete().eq("phone", phone);

  return NextResponse.json({ success: true, verified: true });
}