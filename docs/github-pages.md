# GitHub Pages 운영 가이드

이 저장소는 정적 웹사이트이므로 GitHub Pages에서 바로 운영할 수 있다.

## 배포 URL

레포가 `zangangel/kospi-kosdaq-accumulation-dashboard` 이름으로 생성되면 기본 URL은 아래와 같다.

```text
https://zangangel.github.io/kospi-kosdaq-accumulation-dashboard/
```

## 최초 설정

1. GitHub에 새 레포 생성
   - Owner: `zangangel`
   - Repository name: `kospi-kosdaq-accumulation-dashboard`
   - Public 또는 Private 선택
2. 로컬에서 push

```bash
git push -u origin main
```

3. GitHub 레포에서 Pages 설정
   - `Settings` → `Pages`
   - `Build and deployment` → `Source`를 `GitHub Actions`로 선택

이후 `main` 브랜치에 push될 때마다 `.github/workflows/pages.yml`이 테스트를 실행하고 통과하면 Pages로 자동 배포한다.

## 로컬 검증

```bash
npm test
npm run serve
```

브라우저에서 `http://localhost:5173` 접속.

## 운영 시 주의

- 실제 거래원/증권사별 원자료는 CSV로 업로드한다.
- 이 대시보드는 공개 설명 기반 근사 모델이며 비공개 매집 엔진을 복제하지 않는다.
- 투자 판단은 가격 추세, 거래대금, 수급 주체, 공시/뉴스, 리스크와 함께 별도 검토한다.
