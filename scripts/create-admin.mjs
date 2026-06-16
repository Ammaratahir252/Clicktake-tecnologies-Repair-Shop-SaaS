/**
 * One-shot script: creates (or resets) the platform super_admin account.
 *
 * Run from the repo root:
 *   node scripts/create-admin.mjs
 *
 * Uses the MONGODB_URI from frontend/.env.local — no extra config needed.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Load MONGODB_URI from frontend/.env.local ────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = resolve(__dirname, "../frontend/.env.local");

let MONGODB_URI = "";
try {
  const envFile = readFileSync(envPath, "utf-8");
  const match   = envFile.match(/^MONGODB_URI=(.+)$/m);
  if (match) MONGODB_URI = match[1].trim();
} catch {
  console.error("❌  Could not read frontend/.env.local");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in frontend/.env.local");
  process.exit(1);
}

// ── Admin credentials ────────────────────────────────────────────────────────
const ADMIN_EMAIL    = "dibnowrepair@gmail.com";
const ADMIN_PASSWORD = "admin12";
const ADMIN_NAME     = "Dibnow Admin";

// ── Minimal user schema (mirrors frontend/src/models/user.model.ts) ──────────
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

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("⏳  Connecting to MongoDB Atlas…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected.\n");

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    // Reset password + ensure role is super_admin
    existing.password            = hash;
    existing.role                = "super_admin";
    existing.isActive            = true;
    existing.failedLoginAttempts = 0;
    existing.lockoutUntil        = undefined;
    existing.tokenVersion        = (existing.tokenVersion ?? 0) + 1; // invalidate old sessions
    await existing.save();
    console.log(`🔄  Existing user updated.`);
  } else {
    await User.create({
      name:                ADMIN_NAME,
      email:               ADMIN_EMAIL,
      password:            hash,
      role:                "super_admin",
      isActive:            true,
      failedLoginAttempts: 0,
      tokenVersion:        0,
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
