/**
 * DEPRECATED — this duplicate script has been retired to stop credential drift.
 * The canonical admin-seed script now lives at frontend/scripts/create-admin.mjs
 * (reads ADMIN_EMAIL/ADMIN_PASSWORD from env, defaults to the current admin
 * account, and auto-retires any old super_admin left over from a prior credential
 * set). Run it with:
 *
 *   cd frontend && node scripts/create-admin.mjs
 */

console.log(
  "This script has moved. Run: cd frontend && node scripts/create-admin.mjs"
);
process.exit(1);
