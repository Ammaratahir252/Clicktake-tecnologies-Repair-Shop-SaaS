// src/lib/chatThreadKey.ts
// DM thread summaries (see chatThread.model.ts) are stored once per unordered
// pair of participants — this picks a deterministic "who is userA" so the
// same two people always resolve to the same document no matter who's asking.
export function canonicalPair(idA: string, idB: string): { userA: string; userB: string; callerIsUserA: boolean } {
  const [userA, userB] = [idA, idB].sort();
  return { userA, userB, callerIsUserA: idA === userA };
}
