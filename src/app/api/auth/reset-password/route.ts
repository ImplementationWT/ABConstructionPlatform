import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const tokenHash = crypto
    .createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");
  const resetToken = await PasswordResetToken.findOne({ tokenHash });

  if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  await User.findByIdAndUpdate(resetToken.userId, {
    $set: { password: hashedPassword },
  });
  await PasswordResetToken.deleteOne({ _id: resetToken._id });

  return NextResponse.json({ success: true });
}
