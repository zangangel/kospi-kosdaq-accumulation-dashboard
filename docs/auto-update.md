# 네이버증권 자동 업데이트 1차 구현

이 프로젝트는 `data/watchlist.csv`의 관심종목을 기준으로 네이버증권 거래원정보를 자동 수집한다.

## 데이터 출처

- URL: `https://finance.naver.com/item/frgn.naver?code={ticker}&trader_day={period}`
- 데이터: 거래원정보, 20분 지연
- 기간: 당일, 5일, 20일, 60일
- 성격: 매수/매도 상위 거래원 기반 근사치

## 자동 실행

GitHub Actions 워크플로:

```text
.github/workflows/update-data.yml
```

실행 시점:

```text
평일 한국시간 16:30
```

워크플로는 네이버 데이터를 수집하고, `data/auto/latest.json` / `latest.csv`를 커밋한 뒤 GitHub Pages까지 직접 재배포한다.

수동 실행도 가능하다.

```text
GitHub → Actions → Update Naver broker accumulation data → Run workflow
```

## 관심종목 수정

`data/watchlist.csv`를 수정한다.

```csv
ticker,name,market,float_shares,listed_shares,market_cap_krw,close
005930,삼성전자,KOSPI,5969782550,5969782550,480000000000000,80000
068270,셀트리온,KOSPI,134997805,134997805,27000000000000,204000
```

`float_shares`가 가장 중요하다. 유통주식수를 모르면 일단 `listed_shares`와 같은 값을 넣을 수 있지만, A2/A3는 보수적 근사값이 된다.

## 생성 파일

```text
data/auto/latest.json
data/auto/latest.csv
```

사이트는 `latest.json`을 우선 읽고, 없으면 샘플 CSV를 표시한다.

## 한계

- 네이버 거래원정보는 전체 거래원 원장 데이터가 아니라 상위 거래원 중심 데이터다.
- 따라서 결과는 “정밀 매집비”가 아니라 “네이버 거래원정보 기반 매집비 근사값”이다.
- 네이버 페이지 구조가 바뀌면 파서 수정이 필요하다.
- 과도한 요청은 차단될 수 있으므로 1차는 관심종목 중심으로 운영한다.
