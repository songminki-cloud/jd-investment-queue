# JD 투자 큐 보드 MVP

JD와 김수석의 투자 대화에서 나온 종목 판단을 `신규매수`, `추가매수`, `관망`, `보유관리` 4개 큐로 시각화하는 읽기 전용 로컬 웹 보드입니다.

이 앱은 시세앱, 매매앱, 포트폴리오 손익앱이 아닙니다. 매매 실행/추천 도구가 아니라 김수석 판단 큐 시각화 도구입니다.

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

`investment-queue.json` 하나를 원장으로 사용합니다. 화면은 이 JSON을 읽어서 렌더링합니다.

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
  "thesis": "AI ASIC/네트워킹 직접 노출 보강",
  "nextAction": "가격/밸류 확인 후 정찰병 검토",
  "risk": "고밸류 구간 추격 리스크",
  "status": "확정",
  "lastUpdated": "2026-06-12",
  "updatedBy": "김수석 판단",
  "changeReason": "JD 포트에 ASIC/네트워킹 직접축 부족"
}
```

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
- 모바일에서는 4컬럼을 억지로 축소하지 않고 가로 스크롤 보드로 표시

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
