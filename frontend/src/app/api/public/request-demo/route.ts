import { NextRequest, NextResponse } from 'next/server';
import { sendPlatformEmail } from '@/lib/email/send';
import { emailDemoRequest } from '@/lib/notifications';

const DEMO_RECIPIENT = 'nowdib@gmail.com';

// POST /api/public/request-demo — unauthenticated marketing-site "Book a Demo" form.
// Emails the platform team; never exposes provider/send failures to the visitor.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const shopName = String(body?.shopName || '').trim();
    const phone = String(body?.phone || '').trim();
    const preferredDate = String(body?.preferredDate || '').trim();
    const message = String(body?.message || '').trim();

    if (!name || !email.includes('@') || !shopName) {
      return NextResponse.json({ success: false, message: 'Name, work email, and shop name are required.' }, { status: 400 });
    }

    await sendPlatformEmail(
      DEMO_RECIPIENT,
      `New Demo Request — ${shopName}`,
      emailDemoRequest(name, email, shopName, phone, preferredDate, message)
    );

    return NextResponse.json({ success: true, message: 'Demo request received.' });
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
