import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import {
  PasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from "@/models/PasswordResetToken";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { sendPasswordResetEmail } from "@/lib/notify";

const RESEND_COOLDOWN_SECONDS = 60;

function genericResponse() {
  return NextResponse.json({
    message: "If an account exists for that email, we've sent a password reset link.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email address", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const email = parsed.data.email.toLowerCase().trim();
  const user = await User.findOne({ email });

  // Always return the same response whether or not the account exists,
  // so this endpoint can't be used to enumerate registered emails.
  if (!user) {
    return genericResponse();
  }

  const recentToken = await PasswordResetToken.findOne({ userId: user._id }).sort({
    createdAt: -1,
  });
  if (recentToken) {
    const secondsSinceLastRequest =
      (Date.now() - recentToken.createdAt.getTime()) / 1000;
    if (secondsSinceLastRequest < RESEND_COOLDOWN_SECONDS) {
      return genericResponse();
    }
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
  );

  // Only the latest requested link should be valid.
  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });

  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }

  return genericResponse();
}
