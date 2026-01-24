# [starbucks-renewal-winter](https://jaejun0617.github.io/frontend-learning/html-css/starbucks-renewal-winter/) (새 탭에서 열기)
# Starbucks Korea Renewal: Winter Full-page Responsive Multi-page

**Date:** 2026-01-10 ~ 2026-01-24
**Topic:** HTML / CSS (Advanced Layout & Architecture)  
**Goal:** 스타벅스 코리아 웹사이트를 레퍼런스로 삼아, **겨울 시즌 무드의 완전 리뉴얼 멀티 페이지**를 설계/구현

---

> **※ Disclaimer**  
> 본 프로젝트는 학습 및 포트폴리오 목적의 리뉴얼 과제이며, **실제 스타벅스 코리아의 공식 웹사이트가 아닙니다.**  
> 사용된 모든 이미지는 **AI를 통해 생성된 가상 이미지**이며, 실제 브랜드의 사진 자산을 사용하지 않았습니다.

---

## 📌 프로젝트 개요

이 프로젝트는 Day 1 ~ Day 13까지 학습한 HTML / CSS 핵심 개념을 종합 적용하여 **스타벅스 기반의 “완전 리뉴얼” 멀티 페이지 사이트**를 제작하는 퍼블리셔 과제입니다.

단순 클론 코딩이 아닌, 브랜드의 핵심 가치를 유지하면서도 **(Grid, Flex, Modern Selectors)을 활용해 유지보수 가능한 아키텍처를 설계**하는 데 중점을 두었습니다.

### 🔄 왜 '리뉴얼'인가? (Project Philosophy)

기존 웹사이트를 그대로 복사(Clone)하는 것은 구조적 고민을 생략하게 만듭니다. 저는 가장 익숙한 공간인 스타벅스를 **퍼블리셔의 시선으로 재해석**했습니다.

1. **정보 구조(IA) 재설계:** 복잡한 메뉴를 직관적인 흐름으로 정리
2. **Strategic JS Usage (Minimal & Effective):** 네비게이션, 탭 등 핵심 로직은 CSS로 처리하되, **터치 감도가 중요한 슬라이더에만 Swiper.js를 도입**하여 성능과 효율성의 균형을 맞춤
3. **Design Token System:** 컬러, 간격, 타이포그래피를 변수화하여 일관성 유지
4. **Responsive Layout:** 단순 축소가 아닌, 디바이스 환경에 맞춘 레이아웃 재배치

---

## 🏗️ UX/UI 설계 및 섹션별 구현 상세

이 프로젝트는 각 섹션마다 명확한 **기획 의도**와 **기술적 구현 목표**를 가지고 설계되었습니다.

### 🏗️ Section 00 — Global Header (Navigation)

**"JS 없는 완전한 반응형 네비게이션"**

- **기획 의도**
   - **브랜드 진입점:** 사이트의 첫인상을 결정짓는 탐색의 시작점입니다.
   - **UX 차별화:** 데스크톱에서는 정보의 밀도를 높이고, 모바일에서는 몰입형 경험을 제공합니다.
   - **기술적 도전:** **최소한의 라이브러리 / CSS만으로 완전한 인터랙션**이 가능함을 증명합니다.
- **구현 방향**
   - **구조:** 로고 / 메뉴(6) / 아이콘(3)의 3단 분할 구조, `position: sticky` 적용.
   - **반응형 분기 (640px):**
      - _Desktop:_ 모든 메뉴 한 줄 노출.
      - _Mobile:_ 햄버거 버튼 + 우측 슬라이드 사이드바(280px).
   - **인터랙션:** `checkbox hack` + `:checked` 가상 클래스로 상태 제어.
   - **애니메이션:** 햄버거 아이콘 ↔ 'X' 버튼 트랜지션 (0.3s).
   - **레이어:** Header(1001) > Sidebar(1000) > Overlay(998).
- **설계 이유**
   - JS 로딩 전에도 메뉴가 즉시 동작하여 **성능과 안정성**을 확보했습니다.
   - Overlay에 `opacity`와 `visibility`를 함께 제어하여 닫힌 상태에서의 클릭 오작동을 방지했습니다.

### ❄️ Section 01 — Hero (Winter Swiper)

**"감정을 전달하는 오프닝: Swiper 라이브러리의 전략적 활용"**

- **기획 의도**
   - **감정적 설득:** 첫 화면에서 정보 전달보다 "겨울의 분위기"와 "머무름"의 가치를 전달합니다.
   - **미니멀리즘:** 이벤트, 제품, CTA를 배제하여 시각적 피로도를 낮춥니다.
- **구현 방향**
   - **슬라이더:** **Swiper.js 라이브러리**를 활용하되, 복잡한 기능은 덜어내고 **Fade 효과 + 5초 자동 전환**만 적용하여 정적인 무드 유지.
   - **UI 최소화:** 네비게이션 화살표 제거, Pagination만 노출.
   - **콘텐츠:** 이미지 위 중앙 정렬 카피 (Slide 1: 공간, Slide 2: 머무름, Slide 3: 태도).
- **설계 이유**
   - 역동적인 모션보다 서서히 스며드는 Fade 효과가 겨울 시즌의 정적인 감성과 어울립니다.
   - 터치 디바이스에서의 부드러운 스와이프 경험(UX)을 위해 CSS Scroll Snap 대신 검증된 라이브러리인 Swiper를 선택했습니다.

### 🎁 Section 02 — Featured Picks

**"라이프스타일 큐레이션 쇼케이스"**

- **기획 의도**
   - 단순 상품 나열이 아닌, 시즌 무드와 큐레이션을 전달합니다.
   - 입체감과 리듬감을 부여하여 지루함을 탈피합니다.
- **구현 방향**
   - **가독성:** 배경 이미지 위 `::before` 오버레이 적용.
   - **레이아웃:** Flex + Gap 기반 배치, `perspective`로 공간감 형성.
   - **카드 디자인:** `overflow: visible`(카드)과 `overflow: hidden`(이미지)을 분리하여 **배지가 잘리지 않게** 처리.
   - **오브젝트:** 산타 오브젝트에 제자리 웨이브 애니메이션 적용.
- **설계 이유**
   - `nth-child`로 카드마다 미세한 각도를 주어 큐레이션 된 느낌을 강조했습니다.
   - **모바일:** Hover/기울기를 제거하고 정직한 리스트 UI로 전환하여 가독성을 최우선시했습니다.

### ☕ Section 03 — Menu Preview

**"CSS :has()를 활용한 상태 기반 필터링"**

- **기획 의도**
   - **탐색 효율성:** 사용자가 원하는 카테고리로 범위를 빠르게 좁히도록 돕습니다.
   - **점진적 공개:** 'All' 탭에서는 '더보기'를 통해 정보 밀도를 조절합니다.
- **구현 방향**
   - **CSS 로직:** `radio` + `label`을 탭으로 사용, **`:has()` 선택자**로 카드를 필터링 (JS ❌).
   - **조건부 UI:** 'All' 탭에서만 '더보기/접기' 버튼 노출.
   - **인터랙션:** Hover 시 `transform` + `box-shadow`로 상승 효과.
- **설계 이유**
   - 최신 CSS(`:has()`)를 통해 스크립트 없이 복잡한 상태 UI를 구현할 수 있음을 증명했습니다.
   - '더보기' 구현 시 `visibility`, `pointer-events`, `height`를 복합 제어하여 레이아웃 붕괴를 막았습니다.

### 🌟 Section 04 — Rewards Teaser

**"성장의 즐거움을 시각화하다"**

- **기획 의도**
   - 기능 설명이 아닌 '가입 → 성장 → 보상'의 흐름을 감정적으로 전달합니다.
   - **단계적 정보:** 핵심 메시지 노출 후, 행동(Hover/Focus)에 따라 상세 정보를 보여줍니다.
- **구현 방향**
   - **디자인:** Glassmorphism(유리 질감) 카드.
   - **접근성:** `hover` 뿐만 아니라 **`:focus-within`** 상태에서도 힌트 패널 노출.
   - **시각화:** CSS로 구현한 3단계 프로그레스 레일로 '성장' 이미지화.
- **설계 이유**
   - 키보드 사용자 접근성을 위해 `:focus-within`을 필수 적용했습니다.
   - 모바일에서는 힌트 패널을 `static`으로 전환하여 항상 정보가 보이도록 변경했습니다.

### 🌉 Section 05 — Seasonal Bridge

**"감정의 환기, 여백의 미"**

- **기획 의도**
   - 기능 중심(Rewards)과 철학 중심(Brand Story) 사이의 **완충 구간(Buffer)**입니다.
   - 정보와 기능을 배제하고 오직 분위기 전달에 집중합니다.
- **구현 방향**
   - Full-bleed 배경 이미지 + 중앙 정렬 텍스트(Eyebrow / Headline / Short Copy).
- **설계 이유**
   - "아무것도 하지 않는 섹션"을 배치하여 사용자의 시각적 피로를 덜고, 다음 섹션의 무게감을 높였습니다.

### 🌿 Section 06 — Brand Story / Sustainability

**"페이지 속의 페이지, 탭 콘텐츠"**

- **기획 의도**
   - 스타벅스를 단순 카페가 아닌 '기준과 철학을 가진 브랜드'로 포지셔닝합니다.
   - 페이지 이동 없이 깊이 있는 정보를 탐색하는 **SPA와 유사한 UX**를 제공합니다.
- **구현 방향**
   - **구조:** CSS `radio` input 기반의 탭 콘텐츠 구조.
   - **콘텐츠:** Our Coffee / Ethical Sourcing / Sustainability / Community.
- **설계 이유**
   - 방대한 정보를 탭으로 분류하여 사용자가 주도적으로 탐색하게 유도했습니다.
   - JS 없이 가볍고 빠른 탭 전환을 구현했습니다.

### 📍 Section 07 — Store Experience (Final CTA)

**"찾아야 할 곳이 아닌, 경험해야 할 공간"**

- **기획 의도**
   - 매장 방문을 자연스럽게 유도하는 페이지의 마지막 여정입니다.
   - 매장을 '공간 경험'의 대상으로 묘사합니다.
- **구현 방향**
   - **레이아웃:** 60(이미지) : 40(텍스트) 비대칭 구조 + Absolute 텍스트 패널 오버랩.
   - **모바일:** 이미지 → 텍스트 순서의 `grid-template-rows`로 스토리 흐름 유지.
   - **고급 연출:** `animation-timeline: scroll()` 지원 브라우저 한정 패럴랙스 적용 (Progressive Enhancement).
- **설계 이유**
   - 이미지를 주인공으로 만드는 비대칭 레이아웃을 사용했습니다.
   - 최신 브라우저에서는 화려한 모션을, 구형 환경에서는 안정성을 제공하는 유연한 설계를 적용했습니다.

### 📄 Footer — Accordion Navigation

**"모바일 우선의 정보 정리"**

- **기획 의도**
   - 다수의 링크를 효율적으로 정리하여 시각적 복잡도를 낮춥니다.
   - **Mobile First:** 스크롤이 긴 모바일 환경을 고려한 아코디언 UI.
- **구현 방향**
   - `input:checked` 속성을 활용한 **CSS Only 아코디언**.
   - 하단에 포트폴리오용 프로젝트임을 알리는 Disclaimer 포함.
- **설계 이유**
   - 정보 탐색의 피로도를 최소화하고, JS 이벤트 리스너 없이 유지보수가 용이한 코드를 작성했습니다.

---

## 🛠 Tech Stack & Environment

- **Core:** HTML5, CSS3 (Semantic Markup)
- **Layout Engine:** CSS Grid, Flexbox
- **Styling Strategy:**
   - CSS Variables (Design Tokens)
   - BEM (Block Element Modifier) Naming Convention
   - Mobile First Responsive Design
- **Interaction:** CSS Only (Checkbox Hack, `:has()`, `:focus-within`, Transitions)
- **Library:** **Swiper.js** (Hero Section Swipe Interaction Only)

---

## 📁 File Structure

```text
starbucks-renewal-winter/
├─ index.html           # Main Landing Page
├─ pages/               # Sub Pages
│  ├─ brand.html
│  ├─ service.html
│  ├─ menu.html
│  ├─ store.html
│  ├─ event.html
│  └─ login.html
├─ css/
│  ├─ tokens.css        # 디자인 토큰 (Color, Spacing, Font, Radius)
│  ├─ base.css          # Reset, Typography, A11y
│  ├─ layout.css        # Grid System, Header, Footer
│  ├─ components.css    # Card, Button, Badge, Tab, Accordion
│  ├─ pages.css          # 페이지별 전용 스타일
├─ assets/
│  ├─ img/              # AI Generated Images
│  └─ icons/            # SVG Icons
└─ README.md
---

## 🎨 Design System (Winter Palette)

브랜드의 상징인 **Evergreen**을 유지하되, 차분하고 고급스러운 겨울 무드를 위해 **Deep Charcoal**과 **Warm Gray**, 그리고 포인트로 **Holiday Red**를 조합했습니다.

- `--brand-600`: #0b6b3a (Starbucks Green)
- `--bg-0`: #fbfbfc (Snow White)
- `--text-900`: #111318 (Deep Charcoal)
- `--accent-600`: #b11f2a (Holiday Red)

---

## ✅ Conclusion

**UX 중심 구현:** 모든 기술적 선택은 '사용자 경험(가독성, 접근성, 성능)'을 최우선으로 고려했습니다.
```
