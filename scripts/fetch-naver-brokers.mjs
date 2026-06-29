import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateDashboard, parseCsv } from '../src/accumulation.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WATCHLIST = `${ROOT}/data/watchlist.csv`;
const OUT_JSON = `${ROOT}/data/auto/latest.json`;
const OUT_CSV = `${ROOT}/data/auto/latest.csv`;
const PERIODS = [1, 5, 20, 60];
const NAVER_URL = 'https://finance.naver.com/item/frgn.naver';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function toNumber(value) { return Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0; }
function stripTags(html) { return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim(); }
function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

async function fetchNaverHtml(ticker, period) {
  const url = `${NAVER_URL}?code=${ticker}&page=1&trader_day=${period}`;
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' } });
  if (!response.ok) throw new Error(`Naver ${ticker}/${period} HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  return new TextDecoder('euc-kr').decode(buffer);
}

function parseBrokerTable(html) {
  const sectionStart = html.indexOf('<caption>거래원정보</caption>');
  if (sectionStart < 0) throw new Error('거래원정보 table not found');
  const sectionEnd = html.indexOf('</table>', sectionStart);
  const section = html.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : sectionStart + 20000);
  const rowPattern = /<tr>[\s\S]*?<td class="title bg01">([\s\S]*?)<\/td>[\s\S]*?<td class="num bg01">([\s\S]*?)<\/td>[\s\S]*?<td class="title bg02">([\s\S]*?)<\/td>[\s\S]*?<td class="num bg02">([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  const brokers = new Map();
  let match;
  while ((match = rowPattern.exec(section))) {
    const sellBroker = stripTags(match[1]);
    const sell = toNumber(stripTags(match[2]));
    const buyBroker = stripTags(match[3]);
    const buy = toNumber(stripTags(match[4]));
    if (sellBroker && sell) {
      const row = brokers.get(sellBroker) || { broker: sellBroker, buy: 0, sell: 0 };
      row.sell += sell;
      brokers.set(sellBroker, row);
    }
    if (buyBroker && buy) {
      const row = brokers.get(buyBroker) || { broker: buyBroker, buy: 0, sell: 0 };
      row.buy += buy;
      brokers.set(buyBroker, row);
    }
  }
  return [...brokers.values()].filter((row) => row.buy || row.sell);
}

function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function buildRowsForStock(stock, period, brokers, date) {
  return brokers.map((broker) => ({
    date,
    period: String(period),
    ticker: stock.ticker,
    name: stock.name,
    market: stock.market,
    broker: broker.broker,
    buy: broker.buy,
    sell: broker.sell,
    net_buy: broker.buy - broker.sell,
    float_shares: stock.float_shares || stock.listed_shares || '',
    listed_shares: stock.listed_shares || '',
    market_cap_krw: stock.market_cap_krw || '',
    close: stock.close || '',
    source: 'naver-finance-broker-table',
  }));
}

async function collect() {
  const watchlist = parseCsv(await readFile(WATCHLIST, 'utf8'));
  const date = kstDateString();
  const rows = [];
  const errors = [];

  for (const stock of watchlist) {
    for (const period of PERIODS) {
      try {
        const html = await fetchNaverHtml(stock.ticker, period);
        const brokers = parseBrokerTable(html);
        if (!brokers.length) throw new Error('No broker rows parsed');
        rows.push(...buildRowsForStock(stock, period, brokers, date));
        console.log(`${stock.ticker} ${period}d brokers=${brokers.length}`);
      } catch (error) {
        const message = `${stock.ticker} ${period}d ${error.message}`;
        errors.push(message);
        console.warn(message);
      }
      await sleep(600);
    }
  }

  const dashboards = Object.fromEntries(PERIODS.map((period) => [String(period), calculateDashboard(rows.filter((row) => row.period === String(period)))]));
  const payload = {
    updatedAt: new Date().toISOString(),
    updatedDateKst: date,
    source: 'Naver Finance 거래원정보, 20분 지연, 상위 거래원 기반 근사치',
    periods: PERIODS.map(String),
    watchlistCount: watchlist.length,
    rowCount: rows.length,
    errors,
    dashboards,
    rows,
  };

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const headers = ['date','period','ticker','name','market','broker','buy','sell','net_buy','float_shares','listed_shares','market_cap_krw','close','source'];
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n') + '\n';
  await writeFile(OUT_CSV, csv, 'utf8');
  console.log(`wrote ${OUT_JSON} rows=${rows.length} errors=${errors.length}`);
  if (!rows.length) throw new Error('No rows collected from Naver');
}

collect().catch((error) => {
  console.error(error);
  process.exit(1);
});
