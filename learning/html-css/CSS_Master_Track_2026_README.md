# CSS Master Track — 핵심 이론 & 실무 예시 (2026 기준)

> 목표: **CSS를 규칙 암기가 아닌 ‘엔진(캐스케이드 / 상태 / 구조 / 레이아웃)’로 설계**할 수 있게 만든다.

---

## 0. 2026 기준 Modern CSS 범위

### ✅ 즉시 실무 투입 가능

- **Cascade Layers (`@layer`)** — 프레임워크/레거시 충돌 구조적 해결
- **Container Queries (`@container`)** — 컴포넌트 단위 반응형 표준
- **Relational Selector `:has()`** — JS 없는 조건 분기
- **CSS Nesting** — 컴포넌트 응집
- **CSS Variables (Design Tokens)** — 상태/테마 설계 핵심
- **Modern Color (OKLCH, `color-mix`)** — 예측 가능한 색 시스템
- **Logical Properties** — 다국어/RTL 대응
- **Modern Layout (Flex / Grid / Subgrid)** — 레이아웃 기본기

### 🟡 점진 도입 (호환성 체크 필수)

- **`@scope`** — 컴포넌트 스코프 기반 스타일링
- **Scroll-driven Animations / View Timeline** — 인터랙션 성격에 따라 도입

> 실무 원칙: _기능의 최신성보다 **Fallback과 점진 적용 전략**을 설계했는지가 실력이다._

---

## 1. CSS의 본체 — Cascade / Specificity / Inheritance

> CSS를 잘 쓴다는 것은 **이 셋이 어떻게 상호작용하는지 예측 가능**하다는 뜻이다.

CSS 엔진은 매 렌더링 시 다음 질문을 반복한다.

1. 어떤 규칙들이 이 요소에 적용 후보인가?
2. 그중 **누가 이길 자격이 있는가?**
3. 이 값은 부모로부터 물려받을 수 있는가?

이 세 질문의 답이 곧 결과 스타일이다.

### 1-1. 캐스케이드는 우선순위 알고리즘이다

캐스케이드는 단순한 규칙 집합이 아니라 **결정 트리**에 가깝다.

브라우저는 스타일을 계산할 때 아래 단계를 **위에서부터 차례로** 적용한다.

1. **출처(Origin)**
   - UA stylesheet (브라우저 기본)
   - User stylesheet
   - Author stylesheet (우리가 작성하는 CSS)
   - `!important`는 출처 계층을 뒤집는 특수 규칙

2. **Layer (`@layer`)**
   - 같은 출처 내에서 레이어 선언 순서로 우선순위 결정

3. **Scope (`@scope`)**
   - 스코프 안의 규칙이 스코프 밖보다 우선

4. **Specificity (명시도)**
   - ID > Class > Type

5. **Source Order (작성 순서)**
   - 마지막에 선언된 규칙이 우선

핵심 정리:

- 실무에서 **1~3단계에서 승부가 나야 정상**
- 4~5단계까지 가는 순간 이미 설계가 무너진 상태

> ❌ 잘못된 해결: 명시도 올리기
> ✅ 올바른 해결: 레이어/스코프 구조로 해결
> CSS 우선순위는 단일 규칙이 아니라 **다단계 평가**다.

1. 출처(UA / User / Author) + `!important`
2. **Layer (`@layer`)**
3. **Scope (`@scope`)**
4. Specificity (명시도)
5. Source Order (작성 순서)

> 핵심: **명시도 경쟁 금지**. 구조(`@layer`, `@scope`)로 이겨야 유지보수된다.

### 1-2. Inheritance는 값 전파 시스템이다

Inheritance는 단순 편의 기능이 아니라 **의도적 전파 메커니즘**이다.

#### 왜 어떤 속성은 상속되고, 어떤 것은 안 될까?

- 상속되는 속성은 대부분 **텍스트/가독성 관련**
- 박스 모델 관련 속성은 상속되면 레이아웃이 붕괴됨

#### 실무에서 중요한 포인트

- `inherit`, `initial`, `unset`, `revert`의 의미를 구분해야 한다

```css
color: inherit; /* 부모 값을 명시적으로 물려받음 */
color: initial; /* 스펙상 초기값 */
color: unset; /* 상속 속성이면 inherit, 아니면 initial */
color: revert; /* UA 또는 이전 레이어 값으로 복귀 */
```

#### CSS Variables가 상속된다는 의미

- 변수는 **값이 아니라 참조**가 상속된다
- 그래서 테마/모드 전환이 가능한 것

> 토큰 시스템은 상속을 이해하지 못하면 설계할 수 없다.

- 상속 O: `color`, `font-*`, `line-height`
- 상속 X: `margin`, `padding`, `border`, `background`
- **CSS Variables는 상속됨** → 토큰/테마가 강력해지는 이유

---

## 2. 레이어 전략 — `@layer`로 충돌 제거

### 2-1. 왜 필요한가

동일 명시도에서 **프레임워크 + 레거시 + 컴포넌트 CSS**가 섞이면 유지보수 불가.

`@layer`는 충돌을 **규칙화된 우선순위**로 해결한다.

### 2-2. 실무 추천 레이어 순서

```css
@layer reset, base, components, utilities, overrides;
```

- `reset` : 브라우저 기본값 통일
- `base` : 타이포 / 색 / 레이아웃 기본
- `components` : 컴포넌트 스타일
- `utilities` : 단발성 유틸 (최소화)
- `overrides` : 임시 패치 (나중에 제거)

### 2-3. 예시

```css
@layer base {
   body {
      font-family: system-ui;
   }
}

@layer components {
   .btn {
      padding: 12px 14px;
   }
}

@layer overrides {
   .btn {
      padding: 10px 12px;
   }
}
```

---

## 3. 스코프 전략 — `@scope`로 컴포넌트 경계 설정

### 3-1. 개념

- 특정 DOM 서브트리 **내부에서만** 선택자 동작
- Shadow DOM 없이도 스코프 설계 가능

### 3-2. 예시

```css
@scope (.product-card) to (.product-card__end) {
   :scope {
      border: 1px solid #ddd;
   }
   .title {
      font-weight: 800;
   }
}
```

### 3-3. 실무 가이드

- **BEM + `@layer` + `@scope`** 조합은 대규모 프로젝트에서 강력
- 지원 브라우저 정책에 맞춰 **점진 도입**

---

## 4. 선택자 마스터 — 규칙으로 찍는 CSS

### 4-1. `:is()` / `:where()`로 명시도 제어

- `:is()` → 가장 높은 specificity 상속
- `:where()` → specificity 0 (베이스 규칙)

```css
:where(.card, .panel) :where(h2, h3) {
   margin: 0;
}
```

### 4-2. `:has()` = JS 없는 조건 분기

```css
.card:not(:has(.card__image)) .card__title {
   font-size: 18px;
}

.form-row:has(input:invalid) {
   outline: 2px solid red;
}
```

### 4-3. 안전장치

```css
@supports selector(.card:has(img)) {
   .card:has(img) {
   }
}
```

---

## 5. 컴포넌트 반응형 표준 — Container Queries

### 5-1. Media Query 한계

- 뷰포트는 같아도 **컨테이너 폭은 다르다**

### 5-2. 컨테이너 선언

```css
.card-list {
   container-type: inline-size;
   container-name: cards;
}
```

### 5-3. 기준 전환

```css
@container cards (min-width: 500px) {
   .card {
      flex-direction: row;
   }
}
```

### 5-4. 실무 패턴

- 카드 방향 전환
- CTA 노출/숨김
- 타이포 스케일 조정
- 컴포넌트 기준 컬럼 변화

---

## 6. CSS Nesting — 응집, 깊이는 제한

### 권장

- 최대 **2단 중첩**
- 상태는 `&`로 명확히

```css
.card {
   padding: 16px;

   .card__title {
      margin: 0;
   }

   &:hover {
      transform: translateY(-1px);
   }
}
```

### 금지

- 4단 이상 중첩
- DOM 구조 의존 선택자

---

## 7. 레이아웃 엔진

### 7-1. Flex — 1차원

- 리스트 / 툴바 / 액션 영역

### 7-2. Grid — 2차원

```css
.grid {
   display: grid;
   gap: 16px;
   grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
```

### 7-3. Subgrid

- 카드 내부 정렬
- 필요 영역만 점진 적용

---

## 8. 디자인 토큰 — CSS Variables 시스템화

### 8-1. 토큰 계층

```css
:root {
   --color-bg: #fff;
   --color-text: #111;

   --card-bg: var(--color-bg);
   --card-text: var(--color-text);
}
```

### 8-2. 상태 전환 = 변수 재정의

- `data-theme`
- `:checked`
- `prefers-color-scheme`

---

## 9. Modern Color — OKLCH / `color-mix()`

```css
:root {
   --accent: oklch(62% 0.18 250);
}

.button:hover {
   background: color-mix(in oklab, var(--accent), black 12%);
}
```

---

## 10. 접근성은 옵션이 아니다

```css
:focus-visible {
   outline: 2px solid currentColor;
   outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
   * {
      transition-duration: 0.001ms !important;
   }
}
```

---

## 11. 실무 복붙 패턴

- `@layer` 기반 프레임워크 오버레이
- 컨테이너 반응형 카드
- `:has()` 상태 분기
- Nesting 응집
- `@supports` 점진 적용

---

## 12. 구식 CSS 체크리스트 (지양)

- `!important` 남발
- 과도한 선택자 결합
- 뷰포트 기준 반응형만 설계
- 토큰 없는 하드코딩
- 컴포넌트 스타일 분산

---

## 13. 추천 학습 루트

1. Cascade / Specificity 완전 정복
2. `@layer` 구조화
3. Container Query
4. `:has()` 조건 분기
5. Nesting 응집
6. 토큰 + OKLCH
7. 필요 시 `@scope`

---

## 🧠 마무리

CSS는 **장식 도구가 아니라 시스템**이다.

> 우선순위 + 상태 + 구조 + 레이아웃 엔진

**클래스를 늘리는 사람**이 아니라,
**규칙을 설계하는 사람**이 되는 것이 이 트랙의 목표다.
