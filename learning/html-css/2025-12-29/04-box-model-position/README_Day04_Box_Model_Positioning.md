# docs: Day 4 — Box Model & Positioning

**Date:** Mon, Dec 29, 2025  
**Goal:** Box Model과 Positioning 원리를 이해하고, 좌표·레이어 사고로 **입체적인 레이어드 포스터 UI**를 구현한다.

---

## 🎯 오늘의 핵심 한 줄
CSS 레이아웃은 **Box 계산(크기)** 과 **Position 좌표(위치)**, **z-index 깊이(순서)** 의 조합이다.

---

## 1️⃣ Box Model — 레이아웃 계산의 출발점

모든 HTML 요소는 사각형(Box)이며, 브라우저는 아래 순서로 크기를 계산한다.

```
[ Margin ]
  [ Border ]
    [ Padding ]
      [ Content ]
```

### 구성 요소 역할
- **Content**: 텍스트·이미지 등 실제 콘텐츠
- **Padding**: 콘텐츠와 테두리 사이 여백
- **Border**: 요소 경계선
- **Margin**: 요소 바깥 여백 (다른 요소와의 거리)

---

## 1-1️⃣ content-box vs border-box (실무 필수 포인트)

### 기본값: content-box
```css
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid black;
}
```

- width = **content만**
- 실제 렌더링 너비  
  → 200 + 40(padding) + 10(border) = **250px**
- ❌ 계산 실수의 원인

### 실무 표준: border-box
```css
* {
  box-sizing: border-box;
}
```

- width 안에 padding + border 포함
- 레이아웃 계산이 직관적
- **디자인 시안 그대로 구현 가능**

📌 **실무 기준**
> border-box를 안 쓰는 프로젝트는 거의 없다.

---

## 2️⃣ Positioning — 문서 흐름과 좌표 개념

Position은 요소를 **문서 흐름(Normal Flow)** 기준으로 어떻게 배치할지 정한다.

| 값 | 핵심 개념 |
|---|---|
| static | 기본값, 좌표 지정 불가 |
| relative | 자기 위치 기준 이동 (기준점 생성) |
| absolute | 흐름 제거, 기준 요소 기준 좌표 |
| fixed | 뷰포트 기준 고정 |
| sticky | 스크롤 임계점부터 fixed |

### 실무 핵심 공식
- `absolute`는 **가장 가까운 position 요소(relative/absolute/fixed)** 를 기준으로 잡는다.
- 기준이 없으면 → **viewport 기준**

---

## 3️⃣ z-index & Stacking Context — 깊이 사고

### z-index 기본 규칙
- position이 static이면 적용 ❌
- 숫자가 클수록 위
- 같은 stacking context 안에서만 비교 가능

### Stacking Context란?
> **독립적인 레이어 세계**

아래 조건 중 하나라도 있으면 생성:
- `position` + `z-index`
- `opacity < 1`
- `transform`
- `filter`, `will-change` 등

📌 **중요**
- 서로 다른 stacking context의 z-index는 직접 비교 ❌
- “z-index가 안 먹는다” = 대부분 stacking context 문제

---

## 4️⃣ 미션 구현 — 레이어드 포스터 사고법

### 사고 순서
1. **기준면**: poster 컨테이너 (relative)
2. **좌표**: top / left
3. **깊이**: z-index 증가
4. **입체감**: 크기 + 오프셋 차이

---

## 5️⃣ 구현 예시 (정답급 구조)

### HTML
```html
<div class="poster">
  <div class="layer layer-1"></div>
  <div class="layer layer-2"></div>
  <div class="layer layer-3"></div>
</div>
```

### CSS
```css
* {
  box-sizing: border-box;
}

.poster {
  position: relative;
  width: 500px;
  height: 350px;
  border: 2px solid #ccc;
}

.layer {
  position: absolute;
  border: 2px solid #000;
}

.layer-1 {
  width: 100%;
  height: 100%;
  background: #ffb3b3;
  top: 0;
  left: 0;
  z-index: 1;
}

.layer-2 {
  width: 80%;
  height: 80%;
  background: #b3ffb3;
  top: 30px;
  left: 30px;
  z-index: 2;
}

.layer-3 {
  width: 60%;
  height: 60%;
  background: #b3d9ff;
  top: 60px;
  left: 60px;
  z-index: 3;
}
```

---

## 🔥 실무 핵심 요약
- Box Model = **크기 계산**
- border-box = **실무 기본**
- position = **좌표**
- z-index = **깊이**
- 겹침 버그 = **stacking context 문제**

---

## 🎯 얻어가는 실력
- 레이아웃 계산 실수 제거
- 모달/오버레이 구조 이해
- 좌표 기반 UI 사고 습득

---

## 💻 사용 기술
- HTML5
- CSS3 (Box Model, Positioning, z-index)
