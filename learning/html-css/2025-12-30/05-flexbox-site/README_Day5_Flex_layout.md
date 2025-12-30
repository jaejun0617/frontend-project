# Day 5 — Layout Engine 1: Flexbox

**Date:** Tue, Dec 30, 2025  
**Topic:** Flexbox (Layout Engine 1)

---

## 📝 미션 과제

- Flexbox 기반 사이트 레이아웃 구현

- 전체 레이아웃을 Flexbox만 사용해 구성한다

- margin / position은 보조적으로만 사용한다

- 정렬 기준은 항상 Main Axis / Cross Axis로 설명 가능해야 한다

## 🎯 학습 목표

- Flexbox를 단순 암기가 아닌 **레이아웃 엔진 관점**에서 이해
- Main Axis / Cross Axis 기준으로 모든 정렬 문제 해결
- 속성 하나가 레이아웃에 어떤 **계산 변화**를 만드는지 설명 가능
- 실제 사이트(Header / Hero / Brand / Cases / Contact)에 Flexbox 적용

---

## 🧠 Flexbox 이론

### 1. Flexbox란 무엇인가?

Flexbox는 **1차원 레이아웃 계산 엔진**이다.

- 한 번에 하나의 축(Main Axis)만 관리
- 남는 공간을 계산해 아이템에 분배
- 단순 정렬 도구 ❌ → 공간 분배 알고리즘 ⭕

> Flexbox는 요소를 예쁘게 정렬하는 기술이 아니라  
> **공간을 어떻게 나눌지 결정하는 규칙**이다.

---

### 2. Flex Container / Flex Item

```css
.container {
   display: flex;
}
```

- **Flex Container**
   - 레이아웃 계산의 기준
   - 축 방향, 정렬, 간격을 관리

- **Flex Item**
   - Container의 **직계 자식만** 해당
   - 손자 요소는 영향 없음

📌 핵심 규칙

> Flex 관련 계산은 항상 **부모(Container) 기준**

---

## 🧭 Main Axis / Cross Axis (가장 중요)

Flexbox에서 헷갈리는 이유의 90%는 **축을 잘못 잡아서**다.

| flex-direction | Main Axis | Cross Axis |
| -------------- | --------- | ---------- |
| row (기본)     | 가로      | 세로       |
| column         | 세로      | 가로       |

- **justify-\*** → Main Axis 기준
- **align-\*** → Cross Axis 기준

> 정렬이 이상하면 항상 먼저 **축부터 확인**

---

## 📐 Flex Container 속성 (언제 쓰는지 + 효과)

### 1. flex-direction

```css
flex-direction: row | column;
```

**언제 쓰나?**

- 아이템을 가로로 쌓을지, 세로로 쌓을지 결정할 때

**효과**

- 축 자체가 바뀜
- justify / align 기준도 함께 변경됨

---

### 2. justify-content (Main Axis 정렬)

```css
justify-content: flex-start | center | space-between | space-evenly;
```

**언제 쓰나?**

- 아이템들을 **주 방향(Main Axis)** 으로 어떻게 배치할지 정할 때

**효과**

- 아이템 크기 계산 후 **남은 공간을 분배**
- space 계열은 여백 배분 방식이 다름

---

### 3. align-items (Cross Axis 정렬)

```css
align-items: stretch | center | flex-start;
```

**언제 쓰나?**

- 아이템들을 **보조 축(Cross Axis)** 으로 정렬할 때

**효과**

- 한 줄 기준 정렬
- 기본값 stretch는 아이템을 늘림

---

### 4. flex-wrap

```css
flex-wrap: wrap;
```

**언제 쓰나?**

- 아이템이 많아 한 줄에 다 안 들어갈 때

**효과**

- 줄바꿈 허용
- wrap이 있어야 align-content 동작

---

### 5. align-content (여러 줄 전용)

```css
align-content: center | space-between;
```

**언제 쓰나?**

- 여러 줄이 생겼을 때 **줄 자체를 정렬**하고 싶을 때

**효과**

- 줄(block) 단위 정렬
- align-items와 역할이 다름

---

### 6. gap

```css
gap: 16px;
```

**언제 쓰나?**

- 아이템 사이 간격이 필요할 때

**효과**

- margin보다 안전
- 레이아웃 깨짐이 적음

---

## 🧱 Flex Item 속성 (언제 쓰는지 + 효과)

### 1. flex-grow

```css
flex-grow: 1;
```

**언제 쓰나?**

- 남는 공간을 아이템이 차지하게 하고 싶을 때

**효과**

- 값이 클수록 더 많은 공간 차지
- 비율 개념

---

### 2. flex-shrink

```css
flex-shrink: 0;
```

**언제 쓰나?**

- 화면이 줄어도 아이템 크기를 유지하고 싶을 때

**효과**

- 0이면 줄어들지 않음

---

### 3. flex-basis

```css
flex-basis: 200px;
```

**언제 쓰나?**

- 아이템의 기준 크기를 정하고 싶을 때

**효과**

- width보다 우선 적용

---

### 4. flex (단축 속성)

```css
flex: 1 1 0;
```

**의미**

- grow / shrink / basis 순서

**실무 기본**

```css
flex: 1;
```

---

## 🏗️ 사이트 구조에서의 Flexbox 활용

### Header

- 좌 / 중 / 우 정렬
- 메뉴, 액션 영역 분리

### Brand

- 좌측 배경 + 중앙 카드 + 우측 이미지
- flex + position 혼합

### Cases

- 카드 리스트
- hover 시 flex-grow로 강조

### Contact

- 우측 패널 정렬
- form 세로 배치

---

## 😵 힘들었던 점

- 축 개념이 자주 헷갈림
- hover 시 레이아웃이 튀는 문제
- position과 flex를 같이 쓰는 게 어려움
- fixed header 겹침

---

## ✅ 개선된 점

- 축 기준으로 생각하는 습관
- margin 의존 감소
- 구조부터 설계하는 방식 익힘

---

## 📝 피드백이 필요했던 점

- flex vs position 선택 기준
- 자연스러운 hover 처리
- form 레이아웃 구성
- 반응형에서 flex 유지 방법

---

## 💻 사용 기술

- HTML5
- CSS3 (Flexbox)

## 🔥 오늘의 핵심 정리

- Flexbox는 **계산 엔진**
- 모든 문제는 축으로 환원
- 구조가 먼저, 속성은 나중

---

## 🎯 한 줄 회고

> 아직 완벽하진 않지만,
> Flexbox가 어떻게 동작하는지 감을 잡기 시작한 날
