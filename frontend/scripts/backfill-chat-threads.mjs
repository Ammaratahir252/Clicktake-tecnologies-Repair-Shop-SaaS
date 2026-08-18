/**
 * One-shot: seeds the ChatThread summary table from existing DirectMessage
 * history. Needed exactly once, right after deploying the ChatThread model —
 * GET /api/chat/contacts now reads ChatThread instead of aggregating
 * DirectMessage on every request, so any DM pair that hasn't exchanged a NEW
 * message or read-receipt since deploy would otherwise show up in the
 * sidebar with no last-message preview / unread count until it does.
 *
 * Safe to re-run: each pair is fully recomputed (upsert with $set, not $inc),
 * so re-running just re-derives the same summary from the message log.
 *
 * Run from the `frontend/` directory:
 *   node scripts/backfill-chat-threads.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let MONGODB_URI = "";
try {
  const envFile = readFileSync(envPath, "utf-8");
  const match = envFile.match(/^MONGODB_URI=(.+)$/m);
  if (match) MONGODB_URI = match[1].trim();
} catch {
  console.error("❌  Cannot read .env.local");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}

const directMessageSchema = new mongoose.Schema(
  {
    tenantId: mongoose.Schema.Types.ObjectId,
    senderId: mongoose.Schema.Types.ObjectId,
    recipientId: mongoose.Schema.Types.ObjectId,
    message: String,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
const DirectMessage = mongoose.models.DirectMessage ?? mongoose.model("DirectMessage", directMessageSchema, "directmessages");

const chatThreadSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  userA: mongoose.Schema.Types.ObjectId,
  userB: mongoose.Schema.Types.ObjectId,
  lastMessage: String,
  lastSenderId: mongoose.Schema.Types.ObjectId,
  lastAt: Date,
  unreadA: Number,
  unreadB: Number,
});
const ChatThread = mongoose.models.ChatThread ?? mongoose.model("ChatThread", chatThreadSchema, "chatthreads");

function canonicalPair(idA, idB) {
  const [userA, userB] = [String(idA), String(idB)].sort();
  return { userA, userB };
}

async function main() {
  console.log("⏳  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected.\n");

  // One aggregation, run ONCE (not per-request) — this is exactly the pipeline
  // /api/chat/contacts used to run on every poll tick; here it's fine.
  const pairs = await DirectMessage.aggregate([
    {
      $group: {
        _id: {
          tenantId: "$tenantId",
          pairKey: {
            $cond: [
              { $lt: ["$senderId", "$recipientId"] },
              { userA: "$senderId", userB: "$recipientId" },
              { userA: "$recipientId", userB: "$senderId" },
            ],
          },
        },
        lastMessage: { $last: "$message" },
        lastSenderId: { $last: "$senderId" },
        lastAt: { $max: "$createdAt" },
        docs: { $push: { senderId: "$senderId", recipientId: "$recipientId", readAt: "$readAt" } },
      },
    },
  ]);

  console.log(`Found ${pairs.length} distinct DM thread(s) to backfill.\n`);

  let n = 0;
  for (const p of pairs) {
    const { tenantId } = p._id;
    const { userA, userB } = p._id.pairKey;

    let unreadA = 0;
    let unreadB = 0;
    for (const d of p.docs) {
      if (d.readAt) continue;
      const recipient = String(d.recipientId);
      if (recipient === String(userA)) unreadA++;
      else if (recipient === String(userB)) unreadB++;
    }

    await ChatThread.updateOne(
      { tenantId, userA, userB },
      {
        $set: {
          tenantId,
          userA,
          userB,
          lastMessage: p.lastMessage,
          lastSenderId: p.lastSenderId,
          lastAt: p.lastAt,
          unreadA,
          unreadB,
        },
      },
      { upsert: true }
    );
    n++;
  }

  console.log(`✅  Backfilled ${n} thread summary row(s).\n`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
