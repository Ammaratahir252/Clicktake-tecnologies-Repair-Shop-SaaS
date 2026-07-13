import { NextRequest, NextResponse } from 'next/server';
import { sendPlatformEmail } from '@/lib/email/send';
import { emailContactUsMessage } from '@/lib/notifications';

const CONTACT_RECIPIENT = 'nowdib@gmail.com';

// POST /api/public/contact-us — unauthenticated marketing-site "Get in touch" form.
// Emails the platform team; never exposes provider/send failures to the visitor.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();

    if (!name || !email.includes('@') || !message) {
      return NextResponse.json({ success: false, message: 'Name, email, and message are required.' }, { status: 400 });
    }

    await sendPlatformEmail(
      CONTACT_RECIPIENT,
      `New Contact Us Message${subject ? ` — ${subject}` : ''}`,
      emailContactUsMessage(name, email, subject, message)
    );

    return NextResponse.json({ success: true, message: 'Message sent.' });
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
