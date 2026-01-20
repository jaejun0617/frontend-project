# Day 9 — 3D Transforms & Perspective

- **Date:** Sat, Jan 3, 2026  
- **Topic:** CSS Transforms / Transition / 3D Perspective / 3D Motion  
- **Goal:** 마우스 위치에 따라 입체적으로 회전하는 **3D 제품 쇼케이스 카드** 구현  
  (HTML / CSS, JavaScript 미사용)

---

## 📌 프로젝트 개요

이 프로젝트는 **JavaScript 없이 CSS만으로**  
마우스 위치에 반응하는 것처럼 보이는 **3D 인터랙션 카드**를 만드는 것을 목표로 했다.

과제를 진행하면서 가장 먼저 들었던 의문은 이거였다.

> ❓ “CSS는 마우스 좌표(x, y)를 모르는데,  
> 그럼 마우스를 따라오는 인터랙션은 어떻게 만들어야 하지?”

이 질문에 대한 답으로 선택한 방식이 **Grid Sensor 패턴**이다.

연속적인 좌표를 그대로 쓰는 대신,  
**hover 상태를 좌표의 ‘범위’처럼 사용하는 방식**으로 문제를 해결했다.

---

## ✅ 구현 기준 & 이 과제를 통해 기른 역량

### 내가 구현하면서 지키려고 했던 기준
- JS 없이도 가능한 표현은 **CSS로 먼저 해결**
- 3D는 단순한 연출이 아니라 **왜 그렇게 보이는지 이해하고 적용**
- 클릭 / 포커스 / 모션 감소 등 **실제 사용 상황을 우선 고려**
- 다시 봐도 이해할 수 있도록 **구조와 규칙을 명확히 분리**

### 이 과제로 연습한 핵심 역량
- **상태 모델링 사고**  
  (연속 입력 → 불연속 상태로 변환)
- **CSS 3D 구조 이해**  
  (perspective, preserve-3d, Z축 레이어)
- **모션 감각**  
  (transition 시간, easing에 따른 체감 차이)
- **기본적인 성능 · 접근성 기준 적용**

---

## ✅ 오늘의 핵심 요약

- 3D는 **카메라(perspective)** 가 있어야 성립 → 부모에 적용  
- CSS는 좌표를 모르기 때문에 **hover 상태를 좌표처럼 사용**  
- 센서 + `:hover` + `~` + CSS 변수로 **상태 전달**  
- “부드러움”은 좌표 정밀도보다 **transition과 easing**에서 결정

---

## 🧠 핵심 이론 정리 (내가 이해한 방식)

### 1️⃣ CSS Transform — 모양을 바꾸는 방법

#### ▪ 2D Transform
```css
transform: rotate() translate() scale();
```
- X, Y 평면에서만 변형
- 깊이감(Z) 없음
- 레이아웃을 다시 계산하지 않아 비교적 성능이 좋음

#### ▪ 3D Transform
```css
transform: rotateX() rotateY() translateZ();
```
- Z축 추가 → 입체감 발생
- perspective 없으면 의미 없음
- translateZ()는 요소를 앞으로 튀어나오게 만듦

📌 정리  
애니메이션이나 인터랙션은  
가능하면 **transform + opacity** 위주로 설계하는 것이 안전하다.

---

### 2️⃣ Transition — 움직임을 자연스럽게 만드는 장치
```css
.card {
  transition: transform 180ms ease;
}
```
- 상태 변화가 너무 급해 보이지 않게 보정
- 체감 부드러움은 **시간(ms) + easing**이 좌우

**기준**
- `transition: all` 지양
- 필요한 속성만 명시
- hover 인터랙션: **120~220ms** 권장

---

### 3️⃣ Perspective — 3D의 카메라
```css
.card-container {
  perspective: 900px;
}
```
- 카메라와 물체 사이 거리
- **부모 요소에 적용**해야 자연스러움

| 값 | 느낌 |
|---|---|
| 400px | 왜곡 강함 |
| 700~1200px | 가장 자연스러움 |
| 1600px | 입체감 약함 |

---

### 4️⃣ preserve-3d — 레이어 유지
```css
.card {
  transform-style: preserve-3d;
}
```
- 자식 요소의 Z축을 유지
- translateZ() 사용 시 필수
- 뱃지/버튼이 떠 있는 느낌의 핵심

---

### 5️⃣ backface-visibility
```css
.card {
  backface-visibility: hidden;
}
```
- 회전 시 뒷면 비침 방지
- 카드 UI에서 거의 기본 옵션

---

## 🧩 구현 방식 요약

### 1️⃣ Grid Sensor로 좌표 대체
```css
.sensor {
  position: absolute;
  width: 33.3333%;
  height: 33.3333%;
}
```
- 카드 위를 3×3 구역으로 분할
- “어느 구역 위에 있는지”를 상태로 사용

---

### 2️⃣ `:hover` + `~`로 상태 전달
```css
.s1:hover ~ .card { ... }
```
- 뒤에 오는 형제 요소 선택
- HTML 구조 자체가 로직의 일부

---

### 3️⃣ CSS 변수로 하이라이트 제어
```css
.s1:hover ~ .card {
  --gx: 20%;
  --gy: 20%;
}
```
- 상태는 카드에 전달
- 표현은 `::before`에서 처리

---

### 4️⃣ 중앙 센서 비활성화
```css
.s5 {
  pointer-events: none;
}
```
- 버튼 클릭 보장

---

### 5️⃣ hover 해제 시 리셋
```css
.card-container:not(:hover) .card {
  transform: rotateX(0deg) rotateY(0deg);
}
```
- 상태 종료 기준 명확화

---

## 🔍 코드 리뷰 요약

**잘한 점**
- perspective를 부모에 적용
- JS 없이도 동작하는 구조
- 3D 속성 사용 이유를 이해하고 적용
- 접근성 옵션 고려

**확장 아이디어**
- 5×5 센서
- scale(1.02) 추가
- 모바일 터치 대응

---

## 🧠 확장 활용 아이디어
- 상품 카드 / 쇼핑몰 썸네일
- 포트폴리오 카드
- 버튼 · 아이콘 마이크로 인터랙션
- 카드형 대시보드 UI
- CSS-only 데모 과제

---

## 🔎 검색 키워드
- CSS perspective parent vs child
- CSS 3D transform best practice
- CSS hover interaction without JavaScript
- general sibling combinator (~)
- transform vs transition performance
- prefers-reduced-motion UI pattern

---

## 🧠 마무리

처음엔  
“CSS로 이게 가능할까?”라는 생각에서 시작했지만,

결론은 이거였다.

> 좌표가 없어서 못 만드는 게 아니라,  
> **좌표를 상태로 바꾸면 된다.**

이 과제는  
3D 효과보다도  
**CSS로 상태를 설계하는 사고**를 연습한 작업이었다.
