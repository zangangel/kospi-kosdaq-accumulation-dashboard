export function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      current = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])));
}

export function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/[,₩\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRows(rows) {
  return rows.map((row) => {
    const buy = toNumber(row.buy);
    const sell = toNumber(row.sell);
    const netBuy = row.net_buy === '' || row.net_buy === undefined ? buy - sell : toNumber(row.net_buy);
    const floatShares = toNumber(row.float_shares, toNumber(row.listed_shares));
    return {
      date: row.date,
      period: row.period || '',
      source: row.source || '',
      ticker: row.ticker,
      name: row.name || row.ticker,
      market: row.market || '',
      broker: row.broker || 'UNKNOWN',
      buy,
      sell,
      netBuy,
      floatShares,
      listedShares: toNumber(row.listed_shares),
      marketCapKrw: toNumber(row.market_cap_krw),
      close: toNumber(row.close),
    };
  }).filter((r) => r.ticker && r.date && r.broker);
}

export function gradeA1(score) {
  if (score >= 300) return 'A';
  if (score >= 200) return 'B';
  if (score >= 130) return 'C';
  return 'D';
}

export function gradeRatio(percent) {
  if (percent >= 5) return 'A';
  if (percent >= 3) return 'B';
  if (percent >= 1.5) return 'C';
  return 'D';
}

export function marketCapBand(marketCapKrw) {
  if (!marketCapKrw) return { label: '시총 미입력', focus: '유통주식수와 거래대금 확인 필요' };
  if (marketCapKrw >= 10_000_000_000_000) return { label: '대형주/주도주', focus: 'A1 매수강도 중심 + 수급 지속성 확인' };
  if (marketCapKrw >= 1_000_000_000_000) return { label: '1조~10조 중형주', focus: 'A1 + A2 동시 확인' };
  if (marketCapKrw <= 500_000_000_000) return { label: '5천억 이하/저유통 후보', focus: 'A3 집중도와 급등락 리스크 동시 확인' };
  return { label: '중소형주', focus: 'A2/A3와 거래대금 증가 확인' };
}

export function calculateStock(rows) {
  const totalBuy = rows.reduce((sum, r) => sum + r.buy, 0);
  const totalSell = rows.reduce((sum, r) => sum + r.sell, 0);
  const byBroker = new Map();
  for (const r of rows) {
    const prev = byBroker.get(r.broker) || { broker: r.broker, buy: 0, sell: 0, netBuy: 0 };
    prev.buy += r.buy;
    prev.sell += r.sell;
    prev.netBuy += r.netBuy;
    byBroker.set(r.broker, prev);
  }
  const brokers = [...byBroker.values()].sort((a, b) => b.netBuy - a.netBuy);
  const positive = brokers.filter((b) => b.netBuy > 0);
  const positiveNet = positive.reduce((sum, b) => sum + b.netBuy, 0);
  const top3Net = positive.slice(0, 3).reduce((sum, b) => sum + b.netBuy, 0);
  const latest = rows.toSorted((a, b) => a.date.localeCompare(b.date)).at(-1);
  const floatShares = latest.floatShares || latest.listedShares || 0;
  const a1 = totalSell > 0 ? (totalBuy / totalSell) * 100 : totalBuy > 0 ? 999 : 0;
  const a2 = floatShares > 0 ? (positiveNet / floatShares) * 100 : 0;
  const a3 = floatShares > 0 ? (top3Net / floatShares) * 100 : 0;
  const band = marketCapBand(latest.marketCapKrw);
  return {
    ticker: latest.ticker,
    period: latest.period,
    source: latest.source,
    name: latest.name,
    market: latest.market,
    close: latest.close,
    marketCapKrw: latest.marketCapKrw,
    floatShares,
    totalBuy,
    totalSell,
    netBuy: totalBuy - totalSell,
    a1,
    a2,
    a3,
    grades: `${gradeA1(a1)}${gradeRatio(a2)}${gradeRatio(a3)}`,
    gradeParts: [gradeA1(a1), gradeRatio(a2), gradeRatio(a3)],
    band,
    brokers,
    topBrokers: positive.slice(0, 3),
  };
}

export function calculateDashboard(rows, { startDate = '', endDate = '', query = '' } = {}) {
  const normalized = normalizeRows(rows).filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${row.ticker} ${row.name} ${row.market}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const grouped = new Map();
  for (const row of normalized) {
    if (!grouped.has(row.ticker)) grouped.set(row.ticker, []);
    grouped.get(row.ticker).push(row);
  }
  return [...grouped.values()].map(calculateStock).sort((a, b) => {
    const gradeRank = (g) => ({ A: 4, B: 3, C: 2, D: 1 }[g] || 0);
    const rankA = a.gradeParts.reduce((s, g) => s + gradeRank(g), 0);
    const rankB = b.gradeParts.reduce((s, g) => s + gradeRank(g), 0);
    return rankB - rankA || b.a3 - a.a3;
  });
}

export function formatKrw(value) {
  if (!value) return '-';
  if (value >= 1_0000_0000_0000) return `${(value / 1_0000_0000_0000).toFixed(1)}조원`;
  if (value >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(0)}억원`;
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function formatPriceManwon(value) {
  if (!value) return '-';
  return `${(value / 10000).toFixed(value < 10000 ? 2 : 1)}만원`;
}
