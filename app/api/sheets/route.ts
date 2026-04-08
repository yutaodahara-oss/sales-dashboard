import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID = '16ly8jrTrlgC4DHJ9uIjvSVRL9yFYcmrTzZcLM2tKoP8';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sheet = searchParams.get('sheet') || '';
  const gid   = searchParams.get('gid')   || '';

  const base = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  const url = gid
    ? `${base}&gid=${encodeURIComponent(gid)}`
    : `${base}&sheet=${encodeURIComponent(sheet)}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'text/plain' },
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: response.status });
    }
    const text = await response.text();
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
