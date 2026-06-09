import { google } from 'googleapis'
import { kv } from '@vercel/kv'

const REFRESH_TOKEN_KEY = 'google:refresh_token'

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  if (!tokens.refresh_token) throw new Error('No refresh token returned — ensure prompt=consent')
  await kv.set(REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export async function getAuthedClient() {
  const refreshToken = await kv.get<string>(REFRESH_TOKEN_KEY)
  if (!refreshToken) throw new Error('Google not authenticated — visit /auth/google')
  const client = createOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function isGoogleAuthed(): Promise<boolean> {
  const token = await kv.get<string>(REFRESH_TOKEN_KEY)
  return !!token
}
