# Research Notes: 공개 영상 기반 매집비 대시보드 근사

## 원본 링크

- https://www.youtube.com/watch?v=CirLRqtZQ9A&t=1s
- https://www.youtube.com/watch?v=WRVF0C-d6_k
- https://www.youtube.com/watch?v=OtqynTAeqJc
- https://www.youtube.com/watch?v=bkk_i8YkmR0

## 재현 범위

이 저장소는 영상/공개 설명에서 드러난 것으로 정리 가능한 **점수 체계, 임계값, 해석 규칙**만 구현한다. 영상 제작자 또는 서비스의 비공개 로직, 유료 DB, 특허성 거래원 필터링, 세력 판별 엔진은 구현 범위가 아니다.

## 구현한 공개 근사 규칙

1. A1: 기간 전체 매수/매도 강도 — `period_total_buy / period_total_sell * 100`
2. A2: 양수 순매수 거래원 전체의 유통주식 대비 비율 — `sum(max(net_buy, 0)) / float_shares * 100`
3. A3: 양수 순매수 상위 3개 거래원의 유통주식 대비 비율 — `sum(top3 positive net_buy) / float_shares * 100`

## 등급 기준

- A1: A ≥ 300, B ≥ 200, C ≥ 130, D < 130
- A2/A3: A ≥ 5%, B ≥ 3%, C ≥ 1.5%, D < 1.5%

## 향후 개선 아이디어

- 일/주/월 윈도우를 동시에 계산해 최근성 경고 표시
- 가격 추세/거래대금/외국인·기관 수급 결합
- KRX/네이버/키움/대신 등에서 받은 파일별 컬럼 매핑 프리셋
- 종목 마스터 CSV를 붙여 시총·유통주식 자동 보강
