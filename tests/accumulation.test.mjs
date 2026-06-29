import assert from 'node:assert/strict';
import { parseCsv, calculateDashboard, gradeA1, gradeRatio, formatPriceManwon } from '../src/accumulation.js';

const csv = `date,ticker,name,market,broker,buy,sell,net_buy,float_shares,listed_shares,market_cap_krw,close
2026-06-01,ABC,테스트,KOSDAQ,A증권,300,50,250,1000,1000,400000000000,5200
2026-06-01,ABC,테스트,KOSDAQ,B증권,300,50,250,1000,1000,400000000000,5200
2026-06-01,ABC,테스트,KOSDAQ,C증권,300,50,250,1000,1000,400000000000,5200
2026-06-01,ABC,테스트,KOSDAQ,D증권,10,200,-190,1000,1000,400000000000,5200`;

const rows = parseCsv(csv);
assert.equal(rows.length, 4);
const [result] = calculateDashboard(rows);
assert.equal(result.ticker, 'ABC');
assert.equal(result.grades, 'BAA');
assert.equal(Math.round(result.a1), 260);
assert.equal(result.a2, 75);
assert.equal(result.a3, 75);
assert.equal(gradeA1(299.9), 'B');
assert.equal(gradeRatio(2.99), 'C');
assert.equal(formatPriceManwon(5200), '0.52만원');
console.log('accumulation tests passed');
