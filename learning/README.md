## 🧱 HTML / CSS / JS 학습 

### Box Model & Positioning
- Margin / Padding / Border / Box-sizing 이해
- `position`(static / relative / absolute / fixed / sticky) 원리
- 레이아웃 기준점과 쌓임 맥락(Stacking Context) 이해

### Layout Engine
- **Flexbox**: 정렬과 흐름 제어 (1차원 레이아웃)
- **Grid**: 구조 설계 (2차원 레이아웃)

### Responsive Design
- 모바일 / 태블릿 / 데스크탑 UI가 **완전히 다른 구조**로 동작하도록 설계
- Breakpoints: **360 / 768 / 1200**
- 단순 크기 축소가 아닌 **레이아웃 재구성 관점**

### Motion & Interaction
- CSS Transition 기본 원리
- Easing(cubic-bezier)을 통한 상태 변화 표현
- **CSS 3D Transforms / Perspective**로 입체적 UI 구현

### Advanced Selectors
- Advanced Selectors & Pseudo Classes
- 상태 기반 UI 표현 (`:hover`, `:focus-visible`, `:checked` 등)
- **JS 없이 조건부 UI 처리**

### CSS Variables & Architecture
- Design Tokens 기반 변수 설계
- 컴포넌트 단위 스타일 관리
- CSS Variables와 SCSS의 역할 분리

### Modern CSS (Container-first)
- **Media Query → Container Query 사고 전환**
- 뷰포트가 아닌 **컨테이너 크기**에 반응하는 카드 UI 구현
- 재사용 가능한 카드 컴포넌트 설계
- Modern CSS 3종 세트 활용
  - **Container Queries**
  - **`:has()`**
  - **CSS Nesting**

### SCSS Preprocessor Logic
- Variables / Maps / Mixins / Functions
- Partial 분리와 구조적 SCSS 아키텍처
- 반복 로직과 상태 스타일 자동화

### Parallax Web
- 스크롤 흐름을 고려한 시각적 레이어 설계
- 과도한 JS 없이 CSS 중심 Parallax 구현
- 사용자 경험을 해치지 않는 인터랙션 기준

---

## ⚙️ JavaScript Core (Day 15)

### Variables & State
- `const`와 `let`을 역할 기준으로 분리
  - `const`: 변하지 않는 데이터 소스 (profiles)
  - `let`: UI 상태(state)
- 데이터와 상태를 구분하여 **예측 가능한 UI 흐름** 설계

### Data Types & UI Mapping
- String / Number / Boolean / Array 타입을 UI 표현 기준으로 사용
- Boolean → Badge UI
- Array → 리스트 / `join()` 출력
- 빈 값에 대한 예외 처리 설계

### Template Literals
- 문자열 결합이 아닌 **UI 구조 생성 도구**로 활용
- HTML 마크업을 JS에서 동적으로 생성
- 데이터 → 화면 변환 흐름 이해

### Type Guard & Validation
- `typeof` 기반 런타임 타입 검증
- 렌더링 전 `validateProfile()`로 데이터 안전성 확보
- 잘못된 데이터는 UI 렌더링을 중단하고 에러 표시

### State → Render 패턴
- 상태 변경은 이벤트에서만 수행
- DOM 수정은 `render()` 함수 한 곳에서만 처리
- `state 변경 → render()` 구조를 통해 React 사고 방식의 기초 체득

### UI 예외 케이스 처리
- 배열 길이 0일 때 “없음” 처리
- 잘못된 타입일 경우 카드 렌더링 차단
- 사용자에게 에러를 명확히 보여주는 UI 설계

---

## 🛠 Tech Stack

- **HTML5**
- **CSS3**
  - Flexbox / Grid
  - Advanced Selectors & Pseudo
  - CSS Variables
  - Modern CSS Features
  - SCSS
- **JavaScript (ES6+)**
  - Variables & Data Types
  - Template Literals
  - Type Guard (`typeof`, `Array.isArray`)
  - State-based Rendering Pattern
