# Day 13 — SCSS Preprocessor Logic (Modern CSS + Snow Particles)

**Date:** Wed, Jan 7, 2026  
**Topic:** HTML5 / SCSS(Preprocessor) / Modern CSS(@layer, @container, :has, OKLCH) / CSS Animation  
**Goal:** SCSS 전처리기 로직을 이해하고 `@for` 반복문으로 **100개 파티클(눈) 배경 애니메이션**을 자동 생성한다.  
또한 Day12에서 학습한 Modern CSS를 적용해 **충돌 없는 스타일 구조**와 **컴포넌트 기준 반응형**을 구현한다. (No JS)

---

## ✅ 오늘 한 줄 요약

> SCSS는 CSS를 더 빨리 쓰는 도구가 아니라, CSS를 “자동 생산”하는 도구다.

---

## 📌 프로젝트 개요

이 과제의 핵심은 “예쁜 화면”이 아니라 **CSS를 설계하고 생산하는 방식**이다.

- **반복/계산/조건(로직)**으로 대량 스타일을 자동 생성한다.
- 값은 토큰화하여 수정 포인트를 한 곳으로 모은다.
- 우선순위는 `@layer`로 구조화하여 충돌을 예방한다.
- 반응형은 미디어쿼리(뷰포트) 대신 **컨테이너 쿼리(@container)**로 컴포넌트 단위 설계를 연습한다.
- 상호작용은 JS 없이 **`:has()`**로 상태 기반 강조를 구현한다.

---

## 🎯 미션 목표 (Mission Goals)

- [ ] SCSS 전처리기 로직의 “컴파일 타임 사고” 체득
- [ ] `@for` + `nth-child(#{$i})`로 100개 파티클 규칙 자동 생성
- [ ] `random()`으로 위치/크기/지연/속도 분산 → 시각적 다양성 확보
- [ ] Day12 Modern CSS를 실제 UI에 적용
   - [ ] `@layer`로 스타일 우선순위 구조 고정
   - [ ] `@container`로 컴포넌트 기준 반응형 적용
   - [ ] `:has()`로 섹션 상태 반응(hover) 구현
   - [ ] OKLCH + `color-mix()` 기반 토큰 컬러 사용
- [ ] JavaScript 금지

---

## 🔥 오늘의 핵심 (Key Takeaways)

- **SCSS는 스타일 언어가 아니라 CSS 생성기**
- **`@for + nth-child`는 대량 UI 제어의 정석**
- **`random()`은 “빌드 시 랜덤(컴파일 타임 랜덤)”**
   - 새로 빌드(컴파일)하면 배치가 바뀐다.
   - 런타임(실시간) 랜덤은 JS가 필요하지만, 배경 연출은 컴파일 랜덤만으로도 충분히 자연스럽다.
- 실무에서 중요한 것은 “예쁜 코드”보다 **규칙과 구조**다.

---

## 🧠 SCSS 핵심 개념 (이론 요약)

### 1) SCSS란?

- SCSS(Sassy CSS)는 CSS 전처리기(Preprocessor) 문법
- 개발자는 SCSS로 작성 → 빌드 과정에서 CSS로 컴파일
- 브라우저는 SCSS를 직접 해석하지 못하며 **결과물은 항상 CSS**

### 2) SCSS 변수 vs CSS Variables(Custom Properties)

- **SCSS 변수(`$var`)**: 컴파일 타임에 값 확정 → 반복/계산/조건에 강함(대량 생성)
- **CSS 변수(`--token`)**: 런타임에 변경 가능 → 테마/다크모드 같은 상태 변화에 강함
- 결론: **대량 생성/규칙화는 SCSS**, **테마/상태 변경은 CSS 변수**, 실무에선 **조합**이 정답

### 3) Variables/Map — 토큰 설계

- 반복되는 값(색/간격/반경)을 토큰화
- Map으로 의미 단위로 묶어서 관리  
  예: `v.c(bg)`, `v.c(primary)` 처럼 “의미 기반 호출”로 유지보수성 확보

### 4) Nesting — 얕게

- 권장: 2단 내외 (`.card { &__title{} &:hover{} }`)
- 지양: 4~5단 이상(우선순위/디버깅 지옥)

### 5) Mixins / Functions / Control Directives

- **Mixin**: 재사용 블록 + 인자
- **Function**: 값 계산 로직(px→rem, scale)
- **if/else**: 조건 분기(테마/모드)

### 6) Loops — 대량 생성 엔진

- `@for`: 숫자 범위 생성 (`through` 포함 / `to` 제외)
- `@each`: 리스트/맵 반복
- `@while`: 특수한 경우만(실무는 드묾)

---

## ✅ 구현 기준 & 이 과제를 통해 기른 역량

### 내가 구현하면서 지키려던 기준

- HTML 구조 최소화 (역할 중심)
- 불필요한 클래스/중첩 금지
- 모든 색/사이즈 값은 토큰으로 관리
- 상태 변화는 Selector 기반으로 처리
- 확장을 고려한 파일/레이어 구조 유지

### 이 과제를 통해 기른 핵심 역량

- SCSS Loop를 이용한 **대량 스타일 자동 생성 능력**
- CSS를 “작성”이 아닌 **설계 대상으로 인식하는 사고**
- 컴포넌트 단위 반응형 설계 감각
- Modern CSS(@layer, @container, :has) 실전 적용 경험
- JS 없이도 가능한 시각적 연출 설계 능력

---

## 🏗️ 구현 내용 (이번 과제의 “실제 구현”)

### A. 파티클 → “눈 내림” 연출로 구현

- 기존 파티클(상승) 대신 **상단에서 하단으로 떨어지는 눈 효과**
- 핵심 변화
   - 시작: `top: -vh` (화면 위에서 등장)
   - 종료: `translateY(110vh)` (화면 아래로 사라짐)
   - 흰색(거의 순백): `oklch(0.98 0 0)`
   - 좌우 흔들림: `--drift` 변수를 사용해 바람 느낌 구현

### B. Modern CSS 결합 (Day12 활용)

- `@layer`로 **reset/base/components/utilities/effects** 레이어 고정
- `@container`로 **섹션 폭 기준 반응형**(카드 그리드 1열→3열)
- `:has()`로 **카드 hover 시 섹션 전체 강조**
- OKLCH + `color-mix()`로 토큰 기반 컬러 설계

---

## 📁 파일 구조 (권장)

```txt
day13-scss-snow/
  index.html
  scss/
    main.scss
    _variables.scss
    _modern.scss
    _particles.scss
  css/
    style.css          # sass 컴파일 결과물
  README.md
```

---

## ⚙️ 설치 & 빌드 (Sass 컴파일)

### 1) sass 설치

```bash
npm init -y
npm i -D sass
```

### 2) package.json scripts 추가

```json
{
   "scripts": {
      "dev": "sass --watch scss/main.scss:css/style.css",
      "build": "sass scss/main.scss:css/style.css --style=compressed"
   }
}
```

### 3) 실행

```bash
npm run dev
```

---

## 📌 핵심 코드 (최종 스냅샷)

> “결과를 남기는 코드”가 아니라, **규칙/구조/우선순위**를 기억하기 위한 스냅샷만 남긴다.

### 0) HTML (Modern CSS 데모 포함)

```html
<!doctype html>
<html lang="ko">
   <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>13 — Modern CSS + SCSS Particles</title>
      <link rel="stylesheet" href="./css/style.css" />
   </head>

   <body>
      <!-- Particles -->
      <div class="particles" aria-hidden="true">
         <!-- Emmet: .particle*100 -->
         <div class="particle"></div>
      </div>

      <div class="page">
         <!-- Header -->
         <header class="site-header">
            <div class="container header__inner">
               <a class="brand" href="#">
                  <span class="brand__mark">D13</span>
                  <span class="brand__text">Modern CSS × SCSS</span>
               </a>
            </div>
         </header>

         <!-- Single Section -->
         <main>
            <section class="hero">
               <div class="container hero__inner"></div>
            </section>
         </main>
      </div>
   </body>
</html>
```

---

### 1) 100개 Snow Particle 자동 생성 (SCSS Loop)

```scss
/* scss/_particles.scss */
@use 'variables' as v;

@layer effects {
   .particles {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
   }

   .particle {
      position: absolute;
      border-radius: 999px;
      background: v.c(particle);
      animation: snow-fall linear infinite;
      will-change: transform, opacity;
   }

   @for $i from 1 through v.$particle-count {
      .particle:nth-child(#{$i}) {
         left: random(100) * 1%;
         top: -#{random(20)}vh; /* 화면 위에서 시작 */

         $size: random(8) + 2; /* 3~10px */
         width: #{$size}px;
         height: #{$size}px;

         opacity: random(6) * 0.15 + 0.2; /* 분산 */
         --drift: #{random(40) - 20}px; /* -20px ~ +20px */

         animation-delay: #{random(100) * 0.1}s;
         animation-duration: #{random(10) + 12}s; /* 12~22s */
      }
   }

   @keyframes snow-fall {
      0% {
         transform: translate3d(0, 0, 0);
         opacity: 0;
      }
      10% {
         opacity: 0.9;
      }
      100% {
         transform: translate3d(var(--drift), 110vh, 0);
         opacity: 0.1;
      }
   }
}
```

---

### 2) Cascade Layers (우선순위 구조 고정)

```scss
/* scss/main.scss (entry) */
@layer reset, base, components, utilities, effects;

@use 'variables';
@use 'modern';
@use 'particles';
```

---

### 3) Container Queries (컴포넌트 폭 기준)

```scss
/* scss/_modern.scss */
@use 'variables' as v;

@layer components {
   .section--container {
      container-type: inline-size;
      container-name: showcase;
   }

   .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
   }

   @container showcase (min-width: 680px) {
      .grid {
         grid-template-columns: repeat(3, 1fr);
      }
   }
}
```

---

### 4) :has() 상태 전파 (No JS)

```scss
/* scss/_modern.scss */
@use 'variables' as v;

@layer utilities {
   .section--container:has(.card:hover) {
      .section__title {
         color: v.c(text);
      }
      .section__desc {
         color: color-mix(in oklch, v.c(text) 75%, transparent);
      }
   }
}
```

---

### 5) Tokens (OKLCH + color-mix())

```scss
/* scss/_variables.scss */
$colors: (
   bg: oklch(0.12 0.02 260),
   text: oklch(0.97 0.02 260),
   muted: oklch(0.8 0.02 260),
   primary: oklch(0.72 0.17 250),
   particle: oklch(0.98 0 0),
);

@function c($key) {
   @return map-get($colors, $key);
}
```

---

## ✅ 제출 체크리스트 (Submission Checklist)

- [ ] `.particle`가 정확히 100개인가?
- [ ] 개별 스타일이 `@for`로 생성되는가?
- [ ] `nth-child(#{$i})` 인터폴레이션이 들어갔는가?
- [ ] `random()`이 위치/크기/딜레이/듀레이션에 반영되는가?
- [ ] JS 없이 애니메이션이 동작하는가?
- [ ] `@layer`가 적용되어 우선순위 충돌이 줄었는가?
- [ ] `@container`로 컨테이너 기준 반응형이 적용되는가?
- [ ] `:has()`로 상태 기반 강조가 동작하는가?

---

## 🎯 얻어가는 점

- 반복 작업 자동화 능력(`@for`, `nth-child`)
- CSS를 코드처럼 설계하는 사고(규칙/토큰/구조)
- 대량 스타일 생성 패턴 체득
- JS 없이도 가능한 시각적 연출 경험(눈 배경)
- Modern CSS를 실제 UI에 적용하는 실전 감각(@layer, @container, :has)

---

## 💻 사용 기술

- HTML5
- SCSS (Variables / Map / Nesting / Mixins / Functions / Control / Loops / Modules)
- Modern CSS (`@layer`, `@container`, `:has`, OKLCH, `color-mix()`)
- CSS Animation

---

## 🔎 검색 키워드

- SCSS preprocessor loop @for
- SCSS nth-child interpolation
- SCSS random() compile time
- SCSS generate multiple selectors
- SCSS map function pattern
- Sass @use vs @import
- Modern CSS @layer cascade layers
- CSS Container Queries @container
- CSS :has() selector examples
- OKLCH color system CSS
- color-mix() CSS examples
- CSS particles animation without JavaScript
- CSS snow particle animation
- CSS performance transform opacity

---

## 🧠 마무리

## CSS는 이제 ‘결과물’이다

- CSS를 한 줄씩 직접 작성하는 것은 더 이상 목표가 아니다.
- 이제 CSS는 내가 정의한 규칙과 로직에 따라 자동으로 생성되는 산출물이다.
- 개발자의 역할은 스타일을 나열하는 것이 아니라, 어떤 규칙이 결과를 만들어내는지 설계하는 것이다.

## SCSS는 ‘효율의 엔진’이다

- SCSS의 본질은 편의성이 아니라 반복 제거와 구조화에 있다.
- @for와 같은 전처리 문법은 대량의 스타일 패턴을 몇 줄의 규칙으로 통제하게 만들며,
- CSS를 작성하는 행위를 시스템을 설계하는 사고로 끌어올린다.

## ‘꾸미기’에서 ‘확장’으로

- 이제 고민의 중심은 어떻게 예쁘게 보일까가 아니라  
  어떤 규칙을 세워야 나중에 수정과 확장이 쉬울까
