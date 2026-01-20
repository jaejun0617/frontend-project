# CLAUDE.md

## Project Overview

- **Name**: Starbucks Renewal — Winter Edition
- **Type**: HTML/CSS 중심 퍼블리싱 프로젝트
- **Goal**: 실제 기업 웹사이트 리뉴얼 수준의 구조·스타일·반응형 구현
- **JavaScript**: 최소 사용 (UI 보조, 상태 토글, 슬라이더 초기화 등)

---

## Core Principles

- **Section-based development**: 섹션 단위 설계 · 구현 · 커밋
- **Reuse first**: Header / Footer / Global components 재사용
- **CSS Architecture first**: 디자인 토큰과 레이어 기반 스타일링
- **Publishing standards**: 접근성 · 반응형 · 유지보수 고려

---

## CSS Architecture

```text
css/
├─ tokens.css       # 색상/타이포/간격/사이즈 등 디자인 토큰
├─ base.css         # reset, typography, element defaults
├─ layout.css       # grid, container, header/footer layout
├─ components.css   # 카드, 버튼, 배지 등 재사용 컴포넌트
├─ pages.css        # 페이지 단위 보정 스타일
└─ utilities.css    # 단일 책임 유틸리티 클래스
```

### Rules

- 토큰은 **tokens.css에서만 정의**
- 페이지별 스타일은 **pages.css로 제한**
- `!important` 사용 금지 (불가피할 경우 사유 명시)
- 인라인 스타일 금지

---

## HTML Structure Rules

- 의미 기반 시맨틱 태그 사용 (`header`, `main`, `section`, `footer`)
- 섹션마다 명확한 주석 헤더 추가
- 공통 레이아웃은 `.container` 규칙 준수
- 접근성 기본:
   - 이미지 `alt` 필수
   - 버튼/링크 역할 구분
   - heading 레벨 논리 유지

---

## Naming Convention

- **BEM-like** 클래스 네이밍
   - `block__element--modifier`

- JS hook은 `js-` prefix 사용
- 상태 클래스는 `is-`, `has-` prefix 사용

---

## JavaScript Guidelines

- DOM 조작 최소화
- 상태 → UI 반영 흐름 유지
- 이벤트 위임 우선 고려
- 섹션 전용 스크립트는 분리 파일로 관리

---

## Assets

```text
assets/
├─ img/
│  ├─ common/
│  ├─ hero/
│  ├─ section__01/
│  └─ section__02/
└─ icons/
```

- 섹션별 이미지 디렉토리 분리
- 파일명은 kebab-case 사용

---

## Git Workflow

### Commit Policy

- **섹션 단위 커밋 원칙**
- 커밋 메시지 컨벤션:
   - `feat:` 섹션/기능 구현
   - `style:` 시각적 보정
   - `refactor:` 구조 개선
   - `docs:` 문서 추가/수정
   - `chore:` 설정/정리

### Example

```text
feat: add Winter Picks section
style: refine hero typography spacing
refactor: extract common card component
```

---

## Quality Checklist (Before Commit)

- [ ] 반응형 깨짐 없음 (PC / Tablet / Mobile)
- [ ] CSS 파일 책임 분리 유지
- [ ] 중복 스타일 컴포넌트화
- [ ] 접근성 기본 요건 충족
- [ ] 불필요한 JS 없음

---

## Section Lock Rule

- 완료된 섹션은 **구조(HTML) 변경 금지**
- 수정 발생 시:
   - `style:` 커밋만 허용
   - 레이아웃/DOM 변경 시 사유 명시

- 재사용 컴포넌트 수정 시 기존 섹션 영향 범위 점검 필수

---

## Performance & Publishing Standards

- 불필요한 애니메이션/트랜지션 사용 금지
- 레이아웃 이동 유발 속성 최소화
- 이미지 과다 용량 사용 금지
- CSS 가독성 우선 (최적화는 후순위)

---

## AI Usage Guard (Important)

- AI는 **설계 단계에만 사용**
- 구현 중 질문, 스타일 값 추천 요청 금지
- **한 섹션당 AI 요청 최대 1회**
- 요청은 항상 “결과 요약형”
- CLAUDE.md에 명시된 규칙은 재질문 금지

---

## Pre-Section Design Request Template

다음 섹션을 구현하기 전에,
**기존 컴포넌트 재사용을 최우선으로** 해서

1. 섹션의 역할
2. HTML 구조 스켈레톤
3. 새로 만들어야 하는 컴포넌트 vs 재사용 컴포넌트 구분
4. pages.css에서 처리해야 할 보정 포인트

만 **설계 관점으로 요약**할 것.
(구현 코드, 스타일 디테일, 색/여백 값 제외)

---

## Project Mindset

> 이 프로젝트는 “연습용 클론”이 아니라
> **실제 퍼블리셔 / 프론트엔드 포트폴리오 기준 결과물**을 목표로 한다.
