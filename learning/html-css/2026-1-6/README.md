# Day 12 — Modern CSS Features

**Date:** Tue, Jan 6, 2026  
**Topic:** Container Queries / :has() / CSS Nesting  
**Goal:** 뷰포트가 아니라 **컨테이너 크기**에 반응하는 카드 UI를 구현한다. (HTML / CSS only)

---

## 📌 프로젝트 개요

이 프로젝트는 최신 CSS 기능을 활용해 **컴포넌트 단위 반응형**을 구현하는 훈련이다.

핵심은 “화면 크기(Media Query)”가 아니라,

- 카드가 들어간 **컨테이너의 실제 폭**을 기준으로 레이아웃을 전환하고
- 카드 내부 구성(이미지 유무)에 따라 **JS 없이 조건 분기**를 만들며
- 카드 스타일을 **한 블록으로 응집**해 유지보수성을 높이는 것이다.

즉,  
**반응형 기준은 Container**, **상태 분기는 :has()**, **응집은 Nesting**으로 해결한다.

---

## ❓ 시작 질문

“컴포넌트를 어디에 넣어도 깨지지 않게 만들려면?”

Media Query는 뷰포트 기준이라, 같은 카드라도  
사이드바/그리드/섹션 배치에 따라 **실사용 폭**이 달라지면 깨질 수 있다.

이 과제의 해법은 아래로 사고 전환하는 것.

> **Viewport 반응형 → Container 반응형**

---

## ✅ 결론

- `@container`는 **컴포넌트 단위 반응형**의 기본기다
- `:has()`는 **JS 없는 조건 분기 엔진**이다
- CSS Nesting은 **컴포넌트 스타일 응집**을 돕는다

---

## ✅ 구현 기준 & 이 과제를 통해 기른 역량

### 내가 구현하면서 지키려던 기준

- Media Query 없이 `@container`로만 레이아웃 전환
- 컨테이너 쿼리 대상은 `container-type`으로 명확히 선언
- 이미지 유무 분기는 `:has()`로 처리
- 카드 내부 스타일은 Nesting으로 한 블록에 응집
- HTML은 시맨틱 유지, 클래스는 역할 중심으로만 추가

### 이 과제로 연습한 핵심 역량

- Container Query 기반 반응형 설계
- 조건 분기 선택자(`:has()`) 활용
- 컴포넌트 스타일 응집 및 유지보수성 개선
- 재사용 가능한 카드 컴포넌트 구조 설계

---

## ✅ 오늘의 핵심 요약

- Media Query는 “페이지 기준”, Container Query는 “컴포넌트 기준”
- 컨테이너 선언이 없으면 `@container`는 동작하지 않는다
- `:has()`로 부모 조건 분기가 가능하다
- Nesting은 깊어지면 독이므로 2단 정도만 사용한다

---

## 🧠 핵심 이론 정리

### 1️⃣ Container Queries

- 컨테이너를 쿼리 대상으로 만들기 위해 선언이 필요하다

```css
.card-wrapper{
  container-type: inline-size;
  container-name: card-area;
}
```

- 컨테이너 폭이 조건을 만족할 때 스타일 적용

```css
@container card-area (min-width: 500px){
  .card{ flex-direction: row; }
}
```

### 2️⃣ :has()

- “이 요소가 특정 자식을 가지고 있으면” 선택되는 조건 선택자

```css
.card:not(:has(.card__image)) .card__title{
  font-size: 18px;
}
```

### 3️⃣ CSS Nesting

- 컴포넌트 블록 내부에 관련 스타일을 모아 응집

```css
.card{
  .card__title{ ... }
  &:hover{ ... }
}
```

---

## 🏗️ 오늘의 미션 (Mission Requirements)

### ✅ 필수 미션 1 — Container Query 반응형

- `.card-wrapper` 또는 카드 리스트 컨테이너에 `container-type` 선언
- `@container`로만 레이아웃 전환
- 기준: 컨테이너 폭 500px 미만 세로, 500px 이상 가로

### ✅ 필수 미션 2 — :has() 조건 분기

- 카드에 이미지가 없을 때 타이틀/레이아웃을 다르게 처리

### ✅ 필수 미션 3 — CSS Nesting 응집

- 카드 내부 스타일은 카드 블록 안에서 Nesting으로 관리
- 중첩은 과도하게 깊지 않게 유지

### ✅ 기술 제한

- HTML / CSS only
- JavaScript ❌
- 외부 라이브러리 ❌

---

## 💡 구현 가이드

### STEP 0 — 파일 구조

```
/project
 ├─ index.html
 └─ css/
    └─ style.css
```

### STEP 1 — 컨테이너 선언

```css
.card-wrapper{
  container-type: inline-size;
  container-name: card-area;
}
```

### STEP 2 — 컨테이너 기준 레이아웃 전환

```css
@container card-area (min-width: 500px){
  .card{ flex-direction: row; }
}
```

### STEP 3 — 이미지 유무 분기

```css
.card:not(:has(.card__image)) .card__title{
  font-size: 18px;
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
    <title>Day 12 — Modern CSS Features</title>
    <link rel="stylesheet" href="./css/style.css" />
  </head>
  <body>
    <header class="page-header">
      <h1 class="page-header__title">Day 12 — Modern CSS Features</h1>
      <p class="page-header__desc">
        Container Query / :has() / CSS Nesting으로 카드 컴포넌트를 컨테이너 기준으로 반응형 처리
      </p>
    </header>

    <section class="card-wrapper card-wrapper--wide" aria-label="Wide container cards">
      <article class="card">
        <img class="card__image" src="https://placehold.co/600x400" alt="카드 예시 이미지" />
        <div class="card__body">
          <h2 class="card__title">Wide Card (Image)</h2>
          <p class="card__content">컨테이너 폭이 넓어지면 가로 레이아웃으로 바뀐다.</p>
        </div>
      </article>

      <article class="card">
        <div class="card__body">
          <h2 class="card__title">Wide Card (No Image)</h2>
          <p class="card__content">:has()로 이미지 유무에 따라 스타일을 분기한다.</p>
        </div>
      </article>
    </section>

    <section class="card-wrapper card-wrapper--narrow" aria-label="Narrow container cards">
      <article class="card">
        <img class="card__image" src="https://placehold.co/240x200" alt="카드 예시 이미지" />
        <div class="card__body">
          <h2 class="card__title">Narrow Card</h2>
          <p class="card__content">컨테이너 폭이 좁으면 세로 레이아웃을 유지한다.</p>
        </div>
      </article>
    </section>
  </body>
</html>
```

### css/style.css

```css
/* css/style.css */

/* 기본 리셋 */
* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  background: #ffffff;
  color: #111111;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    'Noto Sans KR',
    Arial;
  padding: 32px;
}

/* 페이지 헤더 */
.page-header {
  margin-bottom: 32px;

  /* 헤더 내부 스타일 응집 */
  .page-header__title {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.2px;
  }

  .page-header__desc {
    margin: 8px 0 0;
    color: #555555;
    font-size: 14px;
    line-height: 1.6;
  }
}

/* 컨테이너 쿼리 대상 영역 */
.card-wrapper {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  container-type: inline-size;
  container-name: card-area;
}

/* wide narrow 컨테이너 폭 제한 */
.card-wrapper--wide {
  max-width: 700px;
}

.card-wrapper--narrow {
  max-width: 300px;
}

/* 카드 컴포넌트 */
.card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid #d8d8d8;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  /* 카드 내부 요소 응집 */
  .card__image {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
  }

  .card__body {
    display: grid;
    gap: 8px;
  }

  .card__title {
    margin: 0;
    font-size: 16px;
    letter-spacing: -0.2px;
  }

  .card__content {
    margin: 0;
    color: #555555;
    font-size: 14px;
    line-height: 1.6;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  }
}

/* 이미지 유무에 따른 분기 */
.card:not(:has(.card__image)) .card__title {
  font-size: 18px;
}

/* 컨테이너 폭이 500 이상이면 가로 레이아웃 */
@container card-area (min-width: 500px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .card .card__image {
    width: 200px;
    flex: 0 0 auto;
  }

  .card .card__body {
    flex: 1;
  }
}

/* 모션 최소화 환경 대응 */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 🔎 코드 리뷰 체크 포인트

- 컨테이너 선언이 정확한가 `container-type` `container-name`
- 반응형이 `@media` 없이 `@container`로만 처리되는가
- 조건 분기를 `:has()`로 해결했는가
- Nesting 깊이가 과하지 않은가

---

## ✅ 제출 체크리스트

- [ ] `@media` 없이 `@container`로 반응형 처리
- [ ] 컨테이너 선언 완료 `container-type` 적용
- [ ] `:has()` 조건 분기 적용
- [ ] Nesting 2단 내로 유지
- [ ] 카드가 다른 레이아웃에 들어가도 깨지지 않음

---

## 💻 사용 기술

- HTML5
- CSS Container Queries
- CSS `:has()`
- CSS Nesting

---

## 🔍 관련 검색어

- CSS Container Queries `container-type` `@container`
- `:has()` parent selector examples
- CSS Nesting syntax `&` nesting rules
- Container Query card component responsive
- Modern CSS component architecture

---

## 🧠 마무리

이 과제의 포인트는 기능을 “많이” 쓰는 게 아니라,  
**컴포넌트가 스스로 반응형이 되도록 설계**하는 것이다.

- 페이지 기준 반응형에서 벗어나
- 컨테이너 기준으로 레이아웃을 전환하고
- JS 없이도 조건 분기까지 처리하면

실무에서 “재사용 가능한 UI”의 기본기를 갖춘 것이다.
