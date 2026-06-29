import { calculateDashboard, parseCsv, formatKrw, formatPriceManwon } from './src/accumulation.js';

const state = { rawRows: [], results: [], selectedTicker: null };
const $ = (id) => document.getElementById(id);
const pct = (value) => `${value.toFixed(2)}%`;
const num = (value) => Math.round(value).toLocaleString('ko-KR');
const gradeClass = (letter) => `grade grade-${letter}`;

async function loadSample() {
  const res = await fetch('./data/sample-broker-trades.csv');
  const text = await res.text();
  state.rawRows = parseCsv(text);
  $('csvStatus').textContent = `샘플 ${state.rawRows.length}행 로드 완료`;
  render();
}

function render() {
  state.results = calculateDashboard(state.rawRows, {
    startDate: $('startDate').value,
    endDate: $('endDate').value,
    query: $('search').value,
  });
  if (!state.selectedTicker && state.results[0]) state.selectedTicker = state.results[0].ticker;
  renderSummary();
  renderCards();
  renderTable();
  renderDetail();
}

function renderSummary() {
  const total = state.results.length;
  const aaa = state.results.filter((r) => r.grades === 'AAA').length;
  const strongA3 = state.results.filter((r) => r.gradeParts[2] === 'A').length;
  const cautious = state.results.filter((r) => r.grades.includes('D')).length;
  $('summary').innerHTML = `<div><b>${total}</b><span>분석 종목</span></div><div><b>${aaa}</b><span>AAA 후보</span></div><div><b>${strongA3}</b><span>A3 집중 A</span></div><div><b>${cautious}</b><span>D 포함 주의</span></div>`;
}

function renderCards() {
  $('cards').innerHTML = state.results.slice(0, 6).map((r) => `<button class="card ${state.selectedTicker === r.ticker ? 'active' : ''}" data-ticker="${r.ticker}"><div class="card-top"><span>${r.market}</span><strong>${r.grades}</strong></div><h3>${r.name} <small>${r.ticker}</small></h3><p>${r.band.label}</p><div class="metrics"><span>A1 ${r.a1.toFixed(0)}</span><span>A2 ${pct(r.a2)}</span><span>A3 ${pct(r.a3)}</span></div></button>`).join('');
  document.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => { state.selectedTicker = el.dataset.ticker; render(); }));
}

function renderTable() {
  $('resultBody').innerHTML = state.results.map((r) => `<tr data-ticker="${r.ticker}" class="${state.selectedTicker === r.ticker ? 'selected' : ''}"><td><b>${r.name}</b><br><small>${r.ticker} · ${r.market}</small></td><td class="grades">${r.gradeParts.map((g) => `<span class="${gradeClass(g)}">${g}</span>`).join('')}</td><td>${r.a1.toFixed(0)}</td><td>${pct(r.a2)}</td><td>${pct(r.a3)}</td><td>${formatPriceManwon(r.close)}</td><td>${formatKrw(r.marketCapKrw)}</td><td>${num(r.netBuy)}</td></tr>`).join('');
  document.querySelectorAll('#resultBody tr').forEach((el) => el.addEventListener('click', () => { state.selectedTicker = el.dataset.ticker; render(); }));
}

function renderDetail() {
  const r = state.results.find((item) => item.ticker === state.selectedTicker) || state.results[0];
  if (!r) { $('detail').innerHTML = '<p>CSV를 업로드하거나 샘플을 로드하세요.</p>'; return; }
  const minNet = Math.min(0, ...r.brokers.map((x) => x.netBuy));
  const maxNet = Math.max(1, ...r.brokers.map((x) => x.netBuy));
  $('detail').innerHTML = `<div class="detail-head"><div><p class="eyebrow">${r.market} · ${r.band.label}</p><h2>${r.name} (${r.ticker})</h2><p>${r.band.focus}</p></div><div class="big-grade">${r.grades}</div></div><div class="detail-grid"><div><span>A1 매수강도</span><b>${r.a1.toFixed(0)}</b><small>총매수 ${num(r.totalBuy)} / 총매도 ${num(r.totalSell)}</small></div><div><span>A2 전체 순매집</span><b>${pct(r.a2)}</b><small>양수 순매수 합 / 유통주식</small></div><div><span>A3 상위3 집중</span><b>${pct(r.a3)}</b><small>${r.topBrokers.map((b) => b.broker).join(', ') || '-'}</small></div></div><h3>순매수 상위 거래원</h3><div class="broker-list">${r.brokers.map((b) => `<div><span>${b.broker}</span><meter min="${minNet}" max="${maxNet}" value="${b.netBuy}"></meter><b>${num(b.netBuy)}</b></div>`).join('')}</div><p class="notice">해석: 점수는 수급 연구용 보조지표입니다. 가격 추세, 거래대금, 공시/뉴스, 락업, 유동성, 시장 상황과 함께 검토하세요.</p>`;
}

$('sampleBtn').addEventListener('click', loadSample);
$('csvFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  state.rawRows = parseCsv(await file.text());
  state.selectedTicker = null;
  $('csvStatus').textContent = `${file.name} · ${state.rawRows.length}행 로드 완료`;
  render();
});
['startDate', 'endDate', 'search'].forEach((id) => $(id).addEventListener('input', render));
loadSample();
