import { NextResponse } from 'next/server';

const LLM_BRIDGE_URL = process.env.LLM_BRIDGE_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/health`);
    const data = await response.json();
    return NextResponse.json({ available: data.status === 'ok' });
  } catch {
    return NextResponse.json({ available: false });
  }
}
