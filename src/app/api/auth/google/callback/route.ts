import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/google-auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }
  try {
    await exchangeCodeForTokens(code)
    return NextResponse.redirect(new URL('/?google=authed', req.url))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(msg)}`, req.url))
  }
}
