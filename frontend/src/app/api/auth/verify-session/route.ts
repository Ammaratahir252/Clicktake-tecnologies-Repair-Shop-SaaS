import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ tokenVersion: 0 });

    await connectDB();
    const user = await User.findById(userId).select('tokenVersion');
    return NextResponse.json({ tokenVersion: user?.tokenVersion || 0 });
  } catch {
    return NextResponse.json({ tokenVersion: 0 });
  }
}
