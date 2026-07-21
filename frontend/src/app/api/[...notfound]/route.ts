import { NextResponse } from "next/server";

// Catch-all for any /api/* path that doesn't match a real route. Next.js's
// default behaviour here is to render the app's HTML 404 error page even for
// API requests, which breaks any client that expects every /api/* response
// to be JSON (mobile app, third-party integration). This route only matches
// when nothing more specific does — real routes are always resolved first.
function notFound() {
  return NextResponse.json(
    { success: false, message: "Not found" },
    { status: 404 }
  );
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
