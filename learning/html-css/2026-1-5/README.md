# Day 11 — CSS Variables & Architecture

**Date:** Mon, Jan 5, 2026  
**Topic:** CSS Custom Properties / Theme Architecture / BEM Methodology  
**Goal:** JavaScript 없이 CSS 변수만으로 Dark / Light 테마 전환을 구현하고, BEM 기반 CSS 아키텍처를 설계한다. (HTML / CSS only)

---

## 📌 프로젝트 개요

이 프로젝트는 JavaScript 없이 **CSS 변수(Custom Properties)** 와  
**CSS Cascade / Inheritance / Selector 구조**만으로 **테마 전환**을 구현하는 훈련이다.

핵심은 “색을 바꾸는 것”이 아니라,

- 색상 값을 **변수로 추상화**하고
- 상태 변화(`:checked`)에 따라 **변수만 재정의**하며
- 컴포넌트는 변수를 **소비만 하는 구조**를 만드는 것이다.

즉,  
**로직은 Selector**, **상태는 변수**, **구조는 BEM**으로 해결한다.

---

## ❓ 시작 질문

“JS 없이 다크모드는 어떻게 구현하지?”

보통은 JS로 클래스를 토글하고, 그 클래스에 다크모드 스타일을 몰아 넣는다.  
하지만 실무에서는 아래 조건이 자주 등장한다.

- JS 개입 최소화
- 디자인 토큰 기반 시스템(변수)
- 이미 고정된 마크업에서 CSS만으로 처리

이때 해법은 단 하나다.

> **CSS 변수 재정의 + Cascade(상속/우선순위)**

---

## ✅ 결론

- 테마 전환은 **속성 변경이 아니라 변수 변경**
- 상태는 `:checked`, 범위는 `~`, 전파는 **상속**
- 유지보수는 **BEM 네이밍**으로 해결

---

## ✅ 구현 기준 & 이 과제를 통해 기른 역량

### 내가 구현하면서 지키려던 기준

- JavaScript 사용 금지
- 색상 값 직접 사용 금지 (`var()`로만 소비)
- 테마 변경은 변수 재정의로만 처리
- 구조적 네이밍(BEM) 유지
- 토글 로직은 CSS Selector로만 해결

### 이 과제로 연습한 핵심 역량

- CSS Custom Properties 설계 능력
- Cascade / Inheritance 이해도
- JS 없는 상태 전환 로직 설계
- BEM 기반 아키텍처 사고
- 디자인 시스템 관점의 CSS 작성

---

## ✅ 오늘의 핵심 요약

- CSS 변수는 **상속되고, 캐스케이드를 탄다**
- 테마 전환은 **변수 override 문제**다
- `:checked + ~`는 JS 없는 상태 머신이다
- 컴포넌트는 변수를 **소비만** 해야 안전하다
- BEM은 협업을 위한 최소 질서다

---

## 🧠 핵심 이론 정리 (완전판)

### 1️⃣ CSS Custom Properties — “디자인 값을 코드로 만든다”

```css
:root{
  --bg:#ffffff;
  --text:#000000;
}
```

- 반복되는 디자인 값을 변수화
- 값 변경 시 UI 전체 동기화
- 테마 / 브랜드 / 다크모드에 최적

#### 핵심 규칙 3가지

1. 변수는 상속된다  
2. 변수는 캐스케이드를 탄다  
3. 변수는 런타임에 계산된다  

---

### 2️⃣ var() + fallback

```css
color: var(--text, #000);
```

- 변수 누락 시 UI 붕괴 방지
- 협업 안정성 확보

---

### 3️⃣ :checked + ~ — JS 없는 토글 로직

```css
.theme-toggle__input:checked ~ .page {
  --bg: #000000;
  --text: #ffffff;
}
```

#### 필수 조건

- 같은 부모의 형제여야 함
- 대상은 반드시 **뒤쪽**에 위치해야 함(`~`)

---

### 4️⃣ “왜 헤더 글씨가 안 바뀌는가?”

다크 토큰을 `.page`에만 재정의하면, `header`는 `.page` 밖이라 상속을 못 받는다.  
그래서 본 과제는 `header`와 `page` 모두에 동일한 변수 재정의를 걸어 해결했다.

```css
.theme-toggle__input:checked ~ .header,
.theme-toggle__input:checked ~ .page {
  --bg:#000;
  --text:#fff;
}
```

---

## 🏗️ 오늘의 미션 (Mission Requirements) — 명확 버전

### ✅ 필수 미션 1 — Theme Toggle (JS 없이)

- 체크박스(`input`)로 상태를 가진다
- `label`로 클릭 UI를 만든다
- 토글 thumb는 **좌 ↔ 우 끝까지 이동**해야 한다

### ✅ 필수 미션 2 — 변수 기반 테마 (var() 소비만)

- 색상은 직접 넣지 않고 `var()`로만 소비
- Light 값은 `:root`에서 정의
- Dark는 `:checked` 상태에서 **변수만 재정의**

### ✅ 필수 미션 3 — BEM 아키텍처

- block / element / modifier 역할이 클래스 이름에 드러나야 함
- 스코프 충돌 없이 유지보수 가능해야 함

### ✅ 기술 제한

- HTML / CSS only
- JavaScript ❌
- 이미지/SVG ❌ (토글 UI는 CSS로)
- CSS는 외부 파일로 분리 (`./css/style.css`)

---

## 💡 구현 가이드 (Step-by-Step)

### STEP 0 — HTML 구조(최소)

```html
<input type="checkbox" id="theme-toggle" class="theme-toggle__input" />

<header class="header">
  <div class="header__inner">
    <div class="header__meta">
      <h1 class="header__title">CSS Variables & Architecture</h1>
    </div>

    <label for="theme-toggle" class="theme-toggle" aria-label="테마 전환">
      <span class="theme-toggle__track">
        <span class="theme-toggle__thumb"></span>
      </span>
    </label>
  </div>
</header>

<main class="page"></main>
```

### STEP 1 — Light 토큰 정의(:root)

```css
:root{
  --bg:#ffffff;
  --text:#000000;
  --surface:#ffffff;
  --border:rgba(0,0,0,.18);
}
```

### STEP 2 — Dark 토큰 재정의(:checked + ~)

```css
.theme-toggle__input:checked ~ .header,
.theme-toggle__input:checked ~ .page{
  --bg:#000000;
  --text:#ffffff;
  --surface:#000000;
  --border:rgba(255,255,255,.22);
}
```

### STEP 3 — 컴포넌트는 토큰을 소비만

```css
.header{
  background:var(--bg);
  color:var(--text);
}
.page{
  background:var(--bg);
  color:var(--text);
}
```

---

## 🧩 최종 코드 (Final)

### index.html

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Day 11 — CSS Variables & Architecture</title>
    <link rel="stylesheet" href="./css/style.css" />
  </head>
  <body>
    <!-- 상태를 가진 토글(체크박스) -->
    <input type="checkbox" id="theme-toggle" class="theme-toggle__input" />

    <!-- 헤더: 오늘의 주제 + 토글 -->
    <header class="header">
      <div class="header__inner">
        <div class="header__meta">
          <h1 class="header__title">CSS Variables & Architecture</h1>
        </div>

        <!-- 토글 UI: JS 없이 label로 제어 -->
        <label for="theme-toggle" class="theme-toggle" aria-label="테마 전환">
          <span class="theme-toggle__track">
            <span class="theme-toggle__thumb"></span>
          </span>
        </label>
      </div>
    </header>

    <!-- input 뒤에 있어야 ~로 변수 재정의가 먹는다 -->
    <main class="page"></main>
  </body>
</html>
```

### css/style.css

```css
/* css/style.css */

/* 전역 토큰 (Light 기본값) */
:root {
  --bg: #ffffff;
  --text: #000000;

  --surface: #ffffff;
  --border: rgba(0, 0, 0, 0.18);
  --shadow: rgba(0, 0, 0, 0.1);

  --radius: 14px;

  --space-1: 8px;
  --space-2: 12px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;

  --toggle-track: var(--surface);
  --toggle-thumb: var(--text);
  --toggle-border: var(--border);
}

/* 최소 리셋 */
* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  transition: background 0.25s ease, color 0.25s ease;
}

/* 접근성 유지용 체크박스 숨김 */
.theme-toggle__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* Dark 모드: 변수 재정의 */
.theme-toggle__input:checked ~ .header,
.theme-toggle__input:checked ~ .page {
  --bg: #000000;
  --text: #ffffff;

  --surface: #000000;
  --border: rgba(255, 255, 255, 0.22);
  --shadow: rgba(0, 0, 0, 0.35);

  --toggle-track: var(--surface);
  --toggle-thumb: var(--text);
  --toggle-border: var(--border);
}

/* 헤더 */
.header {
  position: sticky;
  top: 0;
  background: var(--bg);
  color: var(--text);
  border-bottom: 1px solid var(--border);
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}

.header__inner {
  width: min(1800px, 100vw);
  margin: 0 auto;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.header__meta {
  display: grid;
  gap: 6px;
}

.header__title {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.2px;
}

/* 페이지 */
.page {
  min-height: calc(100vh - 72px);
  padding: var(--space-5) 0;
  background: var(--bg);
  color: var(--text);
  transition: background 0.25s ease, color 0.25s ease;
}

/* 토글 */
.theme-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.theme-toggle__track {
  position: relative;
  width: 64px;
  height: 34px;
  border-radius: 999px;
  background: var(--toggle-track);
  border: 1px solid var(--toggle-border);
  box-shadow: 0 10px 26px var(--shadow);
  transition: background 0.25s ease, border-color 0.25s ease;
}

.theme-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--toggle-thumb);
  transition: transform 0.22s ease, background 0.25s ease;
}

/* 체크 시 썸 이동 */
.theme-toggle__input:checked + .header .theme-toggle__thumb {
  transform: translateX(30px);
}

/* 키보드 포커스 */
.theme-toggle__input:focus-visible + .header .theme-toggle__track {
  outline: none;
  box-shadow: 0 0 0 3px rgba(127, 127, 127, 0.35);
}

/* 모션 최소화 */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## ✅ 제출 체크리스트

- [ ] JS 사용 없음
- [ ] Light/Dark가 `:checked + ~ + 변수 재정의`로 동작
- [ ] 색상은 `var()`로만 소비
- [ ] 토글 thumb가 좌/우 끝까지 이동
- [ ] BEM 네이밍 일관성 유지

---

## 🔍 Keywords

- CSS Custom Properties
- var()
- :checked
- General Sibling Selector (~)
- Theme Architecture
- BEM Methodology
- Cascade / Inheritance

---

## 🧠 마무리

테마는 색이 아니다.  
**값을 다루는 구조**다.

이 과제는 다크모드 구현이 아니라,  
CSS로 시스템을 설계할 수 있는지 묻는 문제였다.
