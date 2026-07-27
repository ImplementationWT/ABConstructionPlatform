import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error(
    "Usage: node scripts/create-admin.mjs \"Full Name\" you@company.com password"
  );
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

async function main() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.error(`A user with the email ${email} already exists`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "admin",
  });

  console.log(`Admin user created: ${email}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
