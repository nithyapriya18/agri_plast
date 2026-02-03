/**
 * Auth API: check authorized_users, then get-or-create users + user_settings.
 * Returns 403 if email not in authorized_users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : null;
    const name = typeof body?.name === 'string' ? body.name.trim() : null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const authorized = await dbAdapter.isUserAuthorized(email);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Access Denied', message: `The account "${email}" is not authorized to access this application.` },
        { status: 403 }
      );
    }

    const user = await dbAdapter.getOrCreateAppUser(email, name ?? null);
    if (!user) {
      return NextResponse.json({ error: 'Failed to get or create user' }, { status: 500 });
    }

    const response = NextResponse.json({
      authorized: true,
      user: { id: user.id, email: user.email, name: user.name ?? user.email.split('@')[0] },
    });
    const maxAge = 30 * 24 * 60 * 60;
    response.cookies.set('agriplast_user_id', user.id, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });
    console.log('[getOrCreateUser] success, set cookie agriplast_user_id=', user.id, 'path=/ maxAge=', maxAge);
    return response;
  } catch (err) {
    console.error('getOrCreateUser error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
