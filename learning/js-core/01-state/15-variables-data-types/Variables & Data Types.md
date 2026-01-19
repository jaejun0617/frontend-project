# Day 15 — Variables & Data Types: Dynamic Profile Card

**Date:** 2026-01-19
**Topic:** Variables / Data Types / Template Literals / typeof / Basic DOM render  
**Goal:** 변수·자료형을 기반으로 “프로필 카드 UI”를 동적으로 구성하고, 타입 검증과 예외 케이스까지 처리한다.

---

## ✅ 오늘 한 줄 요약

변수는 UI의 재료이고, 자료형은 UI 분기 기준이며, 템플릿 리터럴은 데이터를 “화면에 올리는 형태”로 변환하는 도구다.

---

## 📌 프로젝트 개요

Day 15는 “문법 암기”가 아니라 데이터 → 문자열/DOM → UI 출력 흐름을 만든다.  
특히 `typeof`를 단순 출력이 아닌, **렌더링 전 검증 로직**으로 사용한다.

---

## 🎯 미션 목표 (Mission Goals)

- `const/let`을 의도적으로 구분해 데이터(불변)와 상태(가변)를 분리한다.
- String / Number / Boolean + (선택) Array/Object를 포함한 프로필 데이터를 구성한다.
- 템플릿 리터럴로 카드 UI 문자열/마크업을 만들고 DOM에 렌더링한다.
- `typeof` 기반의 타입 가드로 잘못된 입력을 감지하고 UI에 표시한다.
- 버튼 이벤트로 상태를 변경하고 UI를 재렌더링한다. (프레임워크 없이)

---

## 🔥 오늘의 핵심 (Key Takeaways)

- `const`는 “기본값”, `let`은 “상태”에만 사용한다.
- 타입은 출력 형식을 결정한다. (Boolean은 배지, Number는 포맷팅, String은 텍스트)
- `typeof`는 디버깅이 아니라 **런타임 방어막**이다.
- 템플릿 리터럴은 문자열 결합이 아니라 **UI 구조 생성 도구**다.

---

## 🧠 핵심 개념 / 이론 요약

### Variables (const / let)

- `const`: 재할당 불가 (기본값 / 설정 / 참조)
- `let`: 재할당 가능 (상태: 나이, 포인트, 온라인 여부 등)

### Data Types

- String / Number / Boolean은 UI 표현 방식이 다르다.
- 자료형은 조건 분기와 렌더링 규칙의 근거가 된다.

### Template Literals

- `${}`로 값 삽입
- 여러 줄 / 구조화된 마크업 생성에 유리
- DOM에 주입할 HTML string 생성 가능

### typeof

- 타입을 문자열로 반환
- API / 사용자 입력 등 불확실한 데이터를 다룰 때 필수

---

## ✅ 구현 기준 & 이 과제를 통해 기른 역량

### 내가 구현하면서 지키려던 기준

- 데이터(profiles)와 상태(state)를 명확히 분리한다.
- 렌더링 전에 반드시 타입 검증을 수행한다.
- DOM 수정은 `render()` 함수 한 곳에서만 수행한다.
- 이벤트는 상태만 변경하고, 직접 DOM을 조작하지 않는다.

### 이 과제를 통해 기른 핵심 역량

- 데이터 중심 UI 사고 방식
- 타입 기반 조건 분기 설계
- 상태 변경 → 재렌더 패턴 이해
- React로 이어지는 구조적 사고의 기초

---

## 🏗️ 구현 내용

### A. UI 요구사항

- 프로필 카드를 화면에 렌더링한다.
- 이름 / 직업 / 나이 / 지역 / 스킬 / 온라인 여부를 표시한다.
- 온라인 여부는 Badge UI로 표현한다.
- “랜덤 프로필” 버튼 클릭 시 상태를 변경하고 재렌더링한다.
- “온라인 토글” 버튼으로 Boolean 상태를 변경한다.

### B. 타입 가드 요구사항

- `validateProfile(profile)` 함수로 렌더링 전 검증 수행
- 타입이 맞지 않으면 카드 렌더링을 중단한다.
- 에러 목록을 UI에 출력하고 콘솔에도 로그로 남긴다.

---

## 📁 파일 구조

````txt
project/
  index.html
  css/
    style.css
  js/
    main.js
  README.md

---

## 🧠 오늘 헷갈렸던 점 & 실수 정리

### ❌ 1. 객체 속성에 값을 나열하려고 했던 실수

```js
skill: ('HTML', 'CSS', 'JavaScript'); // ❌
````

- 객체 프로퍼티는 **하나의 값만 가질 수 있다**
- 여러 값은 반드시 배열로 표현해야 한다

```js
skill: ['HTML', 'CSS', 'JavaScript']; // ✅
```

---

### ❌ 2. validate 함수에서 매개변수를 안 받았던 문제

```js
function validateProfile() {
  if (typeof profile.name !== 'string') ...
}
```

- `profile`은 함수 내부에 존재하지 않음
- 반드시 **매개변수로 전달**해야 한다

```js
function validateProfile(profile) {
  if (typeof profile.name !== 'string') ...
}
```

---

### ❌ 3. Array 타입을 typeof로만 검사하려 했던 점

```js
typeof profile.skill === 'object'; // 애매함
```

- 배열은 `typeof`로 정확히 구분 불가
- **Array.isArray()** 사용이 정답

```js
Array.isArray(profile.skill);
```

---

## 🧠 새로 알게 된 핵심 개념

### ✔ Array는 UI에서 조건 분기의 대상이다

- 길이가 0이면 “없음”
- 값이 있으면 `join()`으로 출력

```js
profile.skill.length > 0 ? profile.skill.join(', ') : '없음';
```

---

### ✔ render 함수는 단 하나의 책임만 가져야 한다

- 상태 검증
- UI 렌더링
- DOM 수정은 render 안에서만

---

### ✔ 상태 변경 → 재렌더 패턴의 감각

```js
state = pickRandomProfile();
render();
```

이 구조는 이후 React의 `setState → re-render`와 동일하다.

---

## 📌 핵심 코드 스냅샷

```js
function render() {
   const errors = validateProfile(state);

   if (errors.length > 0) {
      app.innerHTML = '';
      errorBox.innerHTML = errors.join('<br />');
      return;
   }

   errorBox.innerHTML = '';
   app.innerHTML = renderProfile(state);
}
```

---

## ✅ 제출 체크리스트

- const/let 사용 이유가 코드에서 명확하다.
- String / Number / Boolean 타입을 모두 사용했다.
- 템플릿 리터럴로 카드 UI를 구성했다.
- typeof 기반 타입 검증이 동작한다.
- 버튼 이벤트로 상태 변경 후 재렌더링된다.
- 에러 발생 시 UI에 에러 목록이 출력된다.

---

## 🎯 얻어가는 점

- JS 기초를 콘솔 출력에서 UI로 확장
- 타입을 활용한 안전한 렌더링 구조 체득
- 이후 DOM / 이벤트 / React 진입 난이도 감소

---

## 💻 사용 기술

- HTML5
- CSS3
- JavaScript (ES6)

---

## 🔎 검색 키워드

- JavaScript const vs let best practice
- JavaScript typeof type guard
- template literals html string render
- basic state render pattern vanilla js

---

## 🧠 마무리

Day 15의 목표는 “변수/자료형을 안다”가 아니라,  
자료형을 기준으로 UI를 **안전하게 출력하는 구조**를 처음부터 잡는 것이다.
