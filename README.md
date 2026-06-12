# JD 투자 큐 보드 MVP

JD와 김수석의 투자 대화에서 나온 종목 판단을 `신규매수`, `추가매수`, `관망`, `보유관리` 4개 큐로 시각화하는 읽기 전용 로컬 웹 보드입니다.

이 앱은 시세앱, 매매앱, 포트폴리오 손익앱이 아닙니다. 매매 실행/추천 도구가 아니라 김수석 판단 큐 시각화 도구입니다.

주의: 각 카드는 개별 종목명과 티커 기준으로 표시합니다. 여러 종목을 하나의 카드로 합치지 않습니다.

## 실행 방법

```sh
cd jd-investment-queue
python3 -m http.server 8080
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:8080
```

## 파일 구조

```text
jd-investment-queue/
  index.html
  styles.css
  app.js
  investment-queue.json
  README.md
```

## 데이터 원장

`investment-queue.json` 하나를 투자 큐 원장으로 사용합니다. 화면은 이 JSON을 읽어서 렌더링합니다.

이 파일은 전체 보유종목 원장이 아닙니다. 전체 보유 원장은 Obsidian `JD 현재 보유 기준표`가 기준이고, 이 앱은 그중 투자 판단에 필요한 개별 종목/ETF를 보여줍니다.

필수 필드:

```json
{
  "id": "avgo",
  "name": "Broadcom",
  "ticker": "AVGO",
  "market": "US",
  "category": "신규매수",
  "priority": 1,
  "holdingStatus": "미보유",
  "sourceType": "김수석 제안",
  "thesis": "AI ASIC/네트워킹 직접 노출 보강",
  "nextAction": "가격/밸류 확인 후 정찰병 검토",
  "risk": "고밸류 구간 추격 리스크",
  "status": "확정",
  "lastUpdated": "2026-06-12",
  "updatedBy": "김수석 판단",
  "changeReason": "JD 포트에 ASIC/네트워킹 직접축 부족"
}
```

## 운영 방식

김수석이 투자 대화 중 확정된 판단을 `investment-queue.json`에 반영합니다. JD가 직접 보드를 관리하는 구조가 아니라, JD는 보드를 보고 판단하고 김수석이 원장을 운영합니다.

업데이트 기준:

- JD 명시 지시: `updatedBy`를 `JD 지시`로 기록하고 `status`는 보통 `확정`
- 대화 중 김수석 판단 확정: `updatedBy`를 `김수석 판단`으로 기록하고 `status`는 `확정`
- JD 확인이 필요한 판단: `status`를 `제안`
- 정보 부족 또는 가격/실적/수급 확인 전: `status`를 `보류`

출처 기준:

- `JD 언급`: JD가 직접 언급했거나 정정한 종목/섹터
- `김수석 제안`: JD의 대화 맥락에서 김수석이 확장 제안한 후보
- `보유원장 기반`: 현재 보유 원장에서 나온 보유관리 대상

운영 절차:

```sh
jq empty investment-queue.json
node --check app.js
git diff -- investment-queue.json
git add investment-queue.json README.md
git commit -m "Update investment queue data"
git push origin main
```

GitHub Pages 반영에는 보통 수십 초에서 몇 분이 걸릴 수 있습니다.

## 개별 카드 원칙

각 카드는 하나의 개별 종목 또는 ETF입니다. 투자 테마가 같아도 카드와 티커는 분리합니다.

예시:

- KODEX AI전력핵심설비(487240)
- SOL 미국AI전력인프라(486450)
- ACE 미국SMR원자력TOP10(0155M0)
- ACE 미국빅테크TOP7 Plus(465580)
- KODEX 미국AI테크TOP10(485540)

정확성을 위해 카드 수가 늘어나는 것은 허용합니다. 복잡도는 이후 필터와 검색으로 낮춥니다.

## 분류 원칙

각 종목은 반드시 4개 중 하나에만 들어갑니다.

- 신규매수: 미보유이고 지금 매수 검토가 가능한 후보
- 추가매수: 보유 중이고 지금 증액 검토가 가능한 후보
- 관망: 관심은 있지만 가격, 실적, 수급, 밸류 조건이 아직 부족한 후보
- 보유관리: 보유 중이나 지금은 증액보다 thesis 점검, 리스크 관리, 트리거 감시가 우선인 후보

## 구현 범위

- 프레임워크 없는 HTML/CSS/Vanilla JS
- JSON 원장 로딩
- 4개 큐 분류
- 큐 위치 코드 표시: A 신규매수, B 추가매수, C 관망, D 보유관리
- 큐별 종목 수 표시
- 큐별 1순위 종목 표시
- 최근 변경 5개 표시
- priority 낮은 숫자순 정렬
- priority가 없거나 null인 항목은 컬럼 하단 배치
- PC에서는 4컬럼 보드로 표시
- 모바일에서는 요약 아래, 리스트 바로 위에 sticky A/B/C/D 앵커탭과 세로 큐 섹션으로 표시

## 큐 위치 코드

`A-1`, `B-1` 같은 코드는 종목의 고정 ID가 아니라 현재 화면에서의 큐 위치입니다.

- A: 신규매수
- B: 추가매수
- C: 관망
- D: 보유관리

숫자는 각 큐 안에서 정렬된 현재 순번입니다. `investment-queue.json`에는 저장하지 않고, 화면 렌더링 시 `category`와 `priority` 기준으로 자동 계산합니다.

## 제외한 기능

- 실시간 시세
- 차트
- 매매 버튼
- 토스 주문 연동
- 로그인
- 서버 DB
- 뉴스 자동수집
- 종목 자동분석
- 포트폴리오 전체 손익 계산
- 복잡한 필터/검색
- UI에서 데이터 편집/저장
- drag & drop

## 주의

샘플 데이터는 매수 추천이 아니라 판단 큐 예시입니다. 정확한 리스트는 이후 김수석 원장 기준으로 조정합니다.
