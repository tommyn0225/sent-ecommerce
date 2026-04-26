"use client";

import { useState, useEffect, useCallback } from "react";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [step, setStep] = useState<"phone" | "verify" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Strip everything except digits and leading +
    const cleaned = phone.replace(/[^\d+]/g, "");

    if (cleaned.length < 11 || cleaned.length > 15 || !cleaned.startsWith("+")) {
      setError("Enter a valid phone number with country code (e.g. +14081231234)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setCooldown(30);
      setStep("verify");
    } catch {
      setError("Failed to send code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code");
        return;
      }

      setCooldown(30);
      setCode("");
    } catch {
      setError("Failed to resend code. Try again.");
    } finally {
      setLoading(false);
    }
  }, [cooldown, loading, phone, channel]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setStep("done");
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You&apos;re verified!
          </h1>
          <p className="text-gray-600 mb-6">
            Phone number <span className="font-medium">{phone}</span> has been
            successfully verified.
          </p>
          <button
            onClick={() => {
              setStep("phone");
              setPhone("");
              setCode("");
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enter verification code
          </h1>
          <p className="text-gray-600 mb-6">
            We sent a code via {channel === "whatsapp" ? "WhatsApp" : "SMS"} to <span className="font-medium">{phone}</span>
          </p>
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          <form onSubmit={handleVerifyOTP}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="w-full mt-3 text-blue-600 text-sm hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend code"}
          </button>
          <button
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
              setCooldown(0);
            }}
            className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
          >
            ← Use a different number
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h1>
        <p className="text-gray-600 mb-6">
          Enter your phone number and we&apos;ll send you a verification code.
        </p>
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        <form onSubmit={handleSendOTP}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send code via
          </label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setChannel("sms")}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                channel === "sms"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
              }`}
            >
              SMS
            </button>
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                channel === "whatsapp"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
              }`}
            >
              WhatsApp
            </button>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14081231234"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button
            type="submit"
            disabled={loading || !phone}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      </div>
    </div>
  );
}