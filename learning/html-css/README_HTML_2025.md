# README_HTML — 2025 Complete Core (실무형)

> 목표: **HTML을 “태그 암기”가 아니라 “문서 구조/의미/접근성/폼/미디어/SEO” 관점으로 설계**할 수 있게 만들기

---

## 1) HTML의 본질

- HTML = **콘텐츠의 의미(semantic)** + **문서 구조(document structure)** 를 정의
- CSS는 표현, JS는 동작.  
  HTML은 **“무엇인지”** 를 말한다.

---

## 2) 시맨틱(semantic) HTML

### 왜 중요?

- 접근성(스크린리더) / SEO / 유지보수 / 협업 모두에 영향
- “div span 남발”은 구조 파악이 어렵고, 역할이 불명확해짐

### 자주 쓰는 시맨틱 레이아웃

- `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`

### 규칙

- 페이지에 `main`은 **1개**가 원칙
- 제목 구조는 `h1 -> h2 -> h3 ...` 순서로 논리적 계층 유지
- `section`은 보통 제목을 동반(없으면 div가 낫기도 함)

---

## 3) 문서 기본 템플릿(현업 기본)

```html
<!doctype html>
<html lang="ko">
   <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Title</title>

      <!-- SEO / 공유 -->
      <meta name="description" content="..." />
      <meta property="og:title" content="..." />
      <meta property="og:description" content="..." />
   </head>
   <body>
      <header>...</header>
      <main id="main">...</main>
      <footer>...</footer>
   </body>
</html>
```

---

## 4) 접근성(A11y) 핵심

### (1) 대체 텍스트

- 이미지: `alt`는 “의미가 있을 때” 필수
- 장식 이미지면 `alt=""`로 비움(스크린리더 스킵)

### (2) 라벨 연결

- `label[for]` ↔ `input#id` 연결 필수

```html
<label for="email">이메일</label> <input id="email" type="email" />
```

### (3) 버튼 vs 링크

- 이동 = `a`
- 동작 = `button`
- 링크를 버튼처럼 쓰거나(클릭 핸들러) 버튼을 링크처럼 쓰면 접근성/UX 악화

### (4) 키보드 포커스

- 클릭 가능한 요소는 키보드로도 접근 가능해야 함
- `:focus-visible` 스타일은 실무에서 거의 필수

---

## 5) 폼(Form) 실무 핵심

### input 타입은 UX와 validation을 바꾼다

- `type="email"`, `type="tel"`, `type="number"`, `type="date"` 등
- 모바일 키보드 최적화까지 포함

### 필수 속성

- `name`: 폼 전송 키
- `autocomplete`: 사용자 입력 편의
- `required`, `minlength`, `maxlength`, `pattern`: 기본 검증

### 대표 패턴

```html
<form>
   <fieldset>
      <legend>회원가입</legend>
      <label for="pw">비밀번호</label>
      <input id="pw" name="pw" type="password" required minlength="8" />
   </fieldset>
</form>
```

---

## 6) 미디어(이미지/비디오) 성능

### (1) 반응형 이미지

- `img` + `srcset` + `sizes`
- 뷰포트/레이아웃에 맞는 이미지 다운로드 유도

### (2) lazy loading

```html
<img loading="lazy" src="..." alt="" />
❌ lazy 쓰면 안 되는 이미지 메인 배너 / 히어로 이미지 첫 화면에서 가장 크게
보이는 이미지(LCP) 페이지 진입 직후 바로 보여야 하는 이미지

<img src="hero.jpg" loading="eager" fetchpriority="high" alt="" />

✅ lazy 쓰는 게 좋은 이미지 상품 카드 이미지 리스트 / 썸네일 페이지 하단 콘텐츠
이미지 무한 스크롤 영역 이미지

<img src="product.jpg" loading="lazy" decoding="async" alt="" />
```

### (3) picture로 포맷/아트디렉션

```html
<picture>
   <source type="image/avif" srcset="a.avif" />
   <source type="image/webp" srcset="a.webp" />
   <img src="a.jpg" alt="..." />
</picture>
```

---

## 7) 데이터/컴포넌트용 태그

- `template`: JS 렌더링 템플릿
- `details/summary`: 아코디언 기본 구조
- `dialog`: 모달(접근성 고려 필요)
- `time`: 날짜/시간 의미 부여

---

## 8) SEO 기본

- 의미있는 제목 구조(h1~h3)
- `meta description`
- 시맨틱 구조(콘텐츠 의미 강조)
- 링크 텍스트는 “여기 클릭” 금지 → 목적이 드러나게

---

## 9) 실무 체크리스트

- [ ] `lang` 설정했나?
- [ ] `meta viewport` 있나?
- [ ] `main`은 1개인가?
- [ ] `label` 연결했나?
- [ ] 버튼/링크 역할이 올바른가?
- [ ] 이미지 alt가 목적에 맞나?
- [ ] 폼 입력 타입/자동완성/검증이 적절한가?

---

## 10) 추천 학습 순서

1. 시맨틱 레이아웃
2. 폼(입력 타입 + label + validation)
3. 접근성(키보드/스크린리더 관점)
4. 미디어/성능(srcset, loading)
5. UI 컴포넌트 태그(dialog, details)
