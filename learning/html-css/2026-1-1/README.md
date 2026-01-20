# Day 7 — Responsive & Media Queries

**Date**: Thu, Jan 1, 2026  
**Topic**: Responsive Web & Media Queries  
**Goal**: 모바일 · 태블릿 · 데스크탑 UI가 완전히 다른 반응형 랜딩 페이지 구현

---

## ✅ 오늘의 한 줄 결론

반응형은 **스타일 조정이 아니라 구조 설계 문제**이며, 실무 표준은 **Mobile First + 명확한 Breakpoint**다.

---

## 1. 반응형 웹(Responsive Web) 핵심 이론

### 1-1. 반응형 웹이란?

하나의 HTML 구조를 기반으로 **디바이스 화면 크기에 따라 레이아웃과 UI를 재구성**하는 방식.

**실무 효과**

- 코드 중복 감소
- 유지보수 비용 절감
- UX 품질 상승
- SEO 유리

> ❌ PC 사이트 / 모바일 사이트 분리  
> ⭕ 하나의 코드 + Media Query 분기

---

## 2. Viewport Meta (필수)

### 왜 필요한가?

모바일 브라우저는 기본적으로 **가상 뷰포트(약 980px)** 로 페이지를 렌더링한다.  
이걸 막지 않으면 Media Query가 정상 동작하지 않는다.

### 필수 코드

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 의미

- `width=device-width` : 실제 디바이스 너비 기준
- `initial-scale=1.0` : 초기 확대 비율 1

📌 반응형의 출발선

---

## 3. Media Queries — CSS 조건문

### 기본 문법

```css
@media (min-width: 768px) {
   /* 조건 만족 시 적용 */
}
```

### 핵심 개념

- **조건이 참일 때만 CSS 적용**
- CSS if문과 동일한 사고

### 자주 쓰는 조건

```css
@media (max-width: 767px) {
}
@media (min-width: 768px) {
}
@media (min-width: 1024px) {
}
```

---

## 4. Breakpoints 설계 (실무 기준)

### 표준 브레이크포인트

| 구분    | 너비           |
| ------- | -------------- |
| Mobile  | ~ 767px        |
| Tablet  | 768px ~ 1023px |
| Desktop | 1024px ~       |

📌 숫자보다 중요한 건 **일관성**

---

## 5. Mobile First (가장 중요)

### 개념

- 모바일 레이아웃을 기본값으로 작성
- 화면이 커질수록 **기능/구조 확장**

### 왜 실무 표준인가?

- CSS가 단순해짐
- 성능 최적화 유리
- 작은 화면 UX 강제 고려

### 기본 패턴

```css
/* Mobile 기본 */

@media (min-width: 768px) {
   /* Tablet */
}

@media (min-width: 1024px) {
   /* Desktop */
}
```

❌ Desktop First → 예외 처리 지옥  
⭕ Mobile First → 확장 구조

---

## 6. 미션 구현 요구사항 요약

### Mobile (0 ~ 767px)

- 1컬럼
- 햄버거 메뉴
- 세로 카드
- 작은 폰트
- 배경: lightblue

### Tablet (768px ~ 1023px)

- 2컬럼 Grid
- 메뉴 노출
- 카드 2열
- 배경: lightgreen

### Desktop (1024px ~)

- 3컬럼 이상
- 검색/광고 영역
- 카드 3열+
- 배경: lightcoral

---

## 7. 구현 구조 가이드

### HTML (공통)

```html
<header></header>
<nav></nav>
<main>
   <section></section>
   <aside></aside>
</main>
<footer></footer>
```

- 모든 콘텐츠는 미리 작성
- CSS로만 노출/배치 변경
- JS 사용 금지

---

## 8. Mobile First CSS 예시

### 기본 (Mobile)

```css
body {
   margin: 0;
   font-family: sans-serif;
   background: lightblue;
}

nav {
   display: none;
}
```

### Tablet

```css
@media (min-width: 768px) {
   body {
      background: lightgreen;
   }

   nav {
      display: flex;
   }

   main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
   }
}
```

### Desktop

```css
@media (min-width: 1024px) {
   body {
      background: lightcoral;
   }

   main {
      grid-template-columns: 1fr 1fr 1fr;
   }

   aside {
      display: block;
   }
}
```

---

## 9. 실무 디버깅 체크리스트

- [ ] viewport meta 존재?
- [ ] Mobile First 구조인가?
- [ ] Media Query가 min-width 기준인가?
- [ ] 구조 재배치가 발생하는가?
- [ ] DevTools Responsive Mode 테스트 완료?

---

## 🔥 오늘의 핵심 요약

- 반응형 = **구조 설계**
- Mobile First = **실무 표준**
- Media Query = **조건 분기**
- Breakpoint = **레이아웃 전환점**

---

## 🎯 얻어가는 점

- 반응형 사고 완성
- 디바이스별 UI 분리 설계 능력
- 실무급 레이아웃 대응 감각

---

## 💻 사용 기술

- HTML5 (Semantic)
- CSS3 (Media Queries)
- Responsive Design
