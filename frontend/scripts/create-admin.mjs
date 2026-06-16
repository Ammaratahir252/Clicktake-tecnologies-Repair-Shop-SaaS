/**
 * One-shot: creates (or resets) the platform super_admin account.
 * Run from the `frontend/` directory:
 *   node scripts/create-admin.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = resolve(__dirname, "../.env.local");

let MONGODB_URI = "";
try {
  const envFile = readFileSync(envPath, "utf-8");
  const match   = envFile.match(/^MONGODB_URI=(.+)$/m);
  if (match) MONGODB_URI = match[1].trim();
} catch {
  console.error("❌  Cannot read .env.local");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Set these via env or edit locally — never commit real passwords
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "dibnowrepair@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "Dibnow Admin";

const userSchema = new mongoose.Schema(
  {
    name:                String,
    email:               { type: String, lowercase: true, trim: true },
    password:            String,
    role:                { type: String, default: "customer" },
    tenantId:            mongoose.Schema.Types.ObjectId,
    isActive:            { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil:        Date,
    tokenVersion:        { type: Number, default: 0 },
    phone:               String,
  },
  { timestamps: true }
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema, "users");

async function main() {
  console.log("⏳  Connecting to MongoDB Atlas…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected.\n");

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    existing.password            = hash;
    existing.role                = "super_admin";
    existing.isActive            = true;
    existing.failedLoginAttempts = 0;
    existing.lockoutUntil        = undefined;
    existing.tokenVersion        = (existing.tokenVersion ?? 0) + 1;
    await existing.save();
    console.log(`🔄  Existing user updated → role set to super_admin, password reset.`);
  } else {
    await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hash,
      role:     "super_admin",
      isActive: true,
    });
    console.log(`🆕  Admin user created.`);
  }

  console.log(`\n  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log(`  Role     : super_admin`);
  console.log(`\n✅  Done. Visit /admin to log in.\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
