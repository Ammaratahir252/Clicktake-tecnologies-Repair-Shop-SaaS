import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Delete the token cookie server-side
  // This is the only reliable way — client-side Cookies.remove() can race with middleware
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0), // immediately expired
    path: '/',
  });

  return response;
}
