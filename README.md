# aedi-v Agency Dashboard Demo

Figma 시안([aedi-v 디자인](https://www.figma.com/design/9yvybIE3fvZjLzm0FrCqOO/aedi-v-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=3891-42518))의
에이전시 관리자 대시보드를 구현한 데모입니다. GitHub Pages로 배포됩니다.

가입 퍼널(QR → 가입 폼 → 초대 링크)은 별도 저장소인 `aedi-v_agency_demo`에 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 화면

| 경로 | 화면 | Figma 노드 |
| --- | --- | --- |
| `#/` | Creator Sign-up Report (영문) | `3910:19916` |

데이터는 **실제 오늘 날짜** 기준으로 지난달~오늘의 크리에이터 풀을 생성하고, 선택한
**날짜 범위 `[시작, 종료]`로 필터링**합니다. 기간 버튼(Today/Last 7 days/This Month/
Last Month)은 그 범위를 세팅하는 프리셋이고, 달력에서 임의 범위를 고르면 표·요약·그래프가
모두 그 범위로 다시 계산됩니다(범위가 프리셋과 일치하면 해당 탭이 활성). 달력은 미래
날짜를 막고, 시작이 종료를 넘지 못합니다.

그래프 탭은 **Daily / Weekly** 두 가지입니다 — Daily는 범위 내 실제 일자, Weekly는 주
단위 컬럼이 쭉 나옵니다. 막대 너비는 컬럼 수에 맞춰 동적으로 조절됩니다(적으면 넓게, 많으면 얇게).

UI 텍스트는 영문으로만 작성합니다.

### 상호작용

- **Add Creator**: 임의의 크리에이터가 추가되고 요약 카드·차트·표가 함께 반응합니다.
  새 행은 잠깐 강조되며 "New" 배지가 표시됩니다.
- **Today / Last 7 days / This Month / Last Month**: 해당 기간에 크리에이터가 더 있다고
  가정해 임의의 데이터셋을 생성합니다(표·요약·차트 모두 재구성). 일별 범위는 일 단위,
  월 범위는 주 단위 컬럼으로 그려집니다.
- **Delete**: 해당 행을 제거하고 요약·차트가 함께 반응합니다(그 날 구독자가 0이 되면
  해당 컬럼이 사라집니다).

초기 화면(Last 7 days)은 Figma 시안 값과 정확히 일치하도록 고정되어 있고, 상호작용
시에만 데이터가 생성/변경됩니다. 차트는 데이터가 바뀔 때 막대·선·점이 0.6초 동안
부드럽게 전환됩니다(`prefers-reduced-motion` 존중).

## 디자인 검수

`scripts/audit.mjs`가 실행 중인 dev 서버를 여러 뷰포트로 렌더링해
`getBoundingClientRect()` / `getComputedStyle()` 실측값을 Figma 스펙과 대조합니다.
0.75px 이상 벗어나면 실패로 종료합니다.

```bash
npm run dev                       # 다른 터미널에서
npm run audit:design -- ./shots   # 스크린샷 경로는 선택
```

화면을 추가할 때는 spec 함수 하나와 `RUNS` 항목을 함께 추가합니다.

### 데이터 규칙

- 표에는 결제한 크리에이터(구독자)만 표시되어 `$0`/`-` 같은 0 값 행이 없습니다.
- 그래프의 sign-up 막대는 항상 subscriber 막대보다 큽니다
  (sign-up = subscriber + 일별 유입 여분).
- 구독자가 0인 날은 그래프에서 컬럼이 그려지지 않습니다.

### 작업 규칙

- 토큰 값은 `get_design_context`가 코드에 인라인한 fallback이 아니라
  `get_variable_defs`가 돌려준 실제 변수값을 따릅니다. 둘은 자주 어긋납니다
  (예: `radius/xl`은 20이 아니라 10, `font-size/headline/xxxlarge`는 36이 아니라 32).
- Figma가 내보내는 SVG는 `preserveAspectRatio="none"`에 고유 크기가 없어,
  width와 height를 모두 지정하지 않으면 브라우저 기본값 300x150으로 늘어납니다.
- 파일럿 아트보드는 로고 y=144, 카드 y=252로 **상단 고정**입니다(세로 중앙 정렬 아님).

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 빌드 후 GitHub Pages로 배포합니다.
저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정해야 합니다.

`vite.config.ts`의 `base`는 `'./'`, 라우터는 `HashRouter`라서 저장소 이름과 무관하게
별도 설정 없이 동작합니다.
