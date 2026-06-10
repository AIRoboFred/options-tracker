import { google } from 'googleapis'
import { getAuthedClient } from './google-auth'
import type { StockQuote, OptionQuote } from './providers'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

// The tab/sheet name within the spreadsheet. We resolve the first tab's actual
// title at runtime (default Google sheets are named "Sheet1", not "Data"), so
// the app works no matter what the user's tab is called. Cached after first lookup.
let cachedSheetName: string | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSheetName(sheets: any): Promise<string> {
  if (cachedSheetName) return cachedSheetName
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const title = meta.data.sheets?.[0]?.properties?.title
  if (!title) throw new Error('No sheets/tabs found in the spreadsheet')
  cachedSheetName = title
  return title
}

const HEADERS = [
  'timestamp',
  'ticker',
  'stock_price',
  'opt1_expiry', 'opt1_strike', 'opt1_type', 'opt1_symbol', 'opt1_bid', 'opt1_ask', 'opt1_last', 'opt1_iv', 'opt1_delta', 'opt1_oi', 'opt1_volume',
  'opt2_expiry', 'opt2_strike', 'opt2_type', 'opt2_symbol', 'opt2_bid', 'opt2_ask', 'opt2_last', 'opt2_iv', 'opt2_delta', 'opt2_oi', 'opt2_volume',
  'opt3_expiry', 'opt3_strike', 'opt3_type', 'opt3_symbol', 'opt3_bid', 'opt3_ask', 'opt3_last', 'opt3_iv', 'opt3_delta', 'opt3_oi', 'opt3_volume',
  'opt4_expiry', 'opt4_strike', 'opt4_type', 'opt4_symbol', 'opt4_bid', 'opt4_ask', 'opt4_last', 'opt4_iv', 'opt4_delta', 'opt4_oi', 'opt4_volume',
  'opt5_expiry', 'opt5_strike', 'opt5_type', 'opt5_symbol', 'opt5_bid', 'opt5_ask', 'opt5_last', 'opt5_iv', 'opt5_delta', 'opt5_oi', 'opt5_volume',
  'opt6_expiry', 'opt6_strike', 'opt6_type', 'opt6_symbol', 'opt6_bid', 'opt6_ask', 'opt6_last', 'opt6_iv', 'opt6_delta', 'opt6_oi', 'opt6_volume',
  'opt7_expiry', 'opt7_strike', 'opt7_type', 'opt7_symbol', 'opt7_bid', 'opt7_ask', 'opt7_last', 'opt7_iv', 'opt7_delta', 'opt7_oi', 'opt7_volume',
  'opt8_expiry', 'opt8_strike', 'opt8_type', 'opt8_symbol', 'opt8_bid', 'opt8_ask', 'opt8_last', 'opt8_iv', 'opt8_delta', 'opt8_oi', 'opt8_volume',
  'opt9_expiry', 'opt9_strike', 'opt9_type', 'opt9_symbol', 'opt9_bid', 'opt9_ask', 'opt9_last', 'opt9_iv', 'opt9_delta', 'opt9_oi', 'opt9_volume',
]

function optionRow(o: OptionQuote): (string | number | null)[] {
  return [o.expiration, o.strike, o.type, o.symbol, o.bid, o.ask, o.last, o.iv, o.delta, o.openInterest, o.volume]
}

export async function ensureHeaders(): Promise<void> {
  const auth = await getAuthedClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const sheetName = await getSheetName(sheets)

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:A1`,
  })

  if (!res.data.values?.[0]?.[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    })
  }
}

export async function appendPollRow(stock: StockQuote, options: OptionQuote[]): Promise<void> {
  const auth = await getAuthedClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const sheetName = await getSheetName(sheets)

  const row: (string | number | null)[] = [
    new Date().toISOString(),
    stock.ticker,
    stock.price,
    ...options.flatMap(optionRow),
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  })
}
