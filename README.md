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

UI 텍스트는 영문으로만 작성합니다.

## 디자인 검수

`scripts/audit.mjs`가 실행 중인 dev 서버를 여러 뷰포트로 렌더링해
`getBoundingClientRect()` / `getComputedStyle()` 실측값을 Figma 스펙과 대조합니다.
0.75px 이상 벗어나면 실패로 종료합니다.

```bash
npm run dev                       # 다른 터미널에서
npm run audit:design -- ./shots   # 스크린샷 경로는 선택
```

화면을 추가할 때는 spec 함수 하나와 `RUNS` 항목을 함께 추가합니다.

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
