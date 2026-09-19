import { NextResponse } from 'next/server';
import { buildProfile } from '../../../../lib/enka';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const uid = String((await params).uid || '').replace(/\D/g, '');
  if (!/^\d{8,10}$/.test(uid)) {
    return NextResponse.json({ error: 'Invalid Genshin UID.' }, { status: 400 });
  }
  try {
    const data = await buildProfile(uid);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Could not reach Enka.network.' },
      { status: Number(error?.status) || 502 }
    );
  }
}