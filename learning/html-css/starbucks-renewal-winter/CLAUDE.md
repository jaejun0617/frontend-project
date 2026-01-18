# CLAUDE.md

## Project Overview

- **Name**: Starbucks Renewal — Winter Edition
- **Type**: HTML/CSS 중심 퍼블리싱 프로젝트
- **Goal**: 실제 기업 웹사이트 리뉴얼 수준의 구조·스타일·반응형 구현
- **JavaScript**: 최소 사용 (UI 보조/상태 토글/슬라이더 초기화 등)

---

## Core Principles

- **Section-based development**: 섹션 단위 설계·구현·커밋
- **Reuse first**: Header/Footer/Global components 재사용
- **CSS Architecture first**: 디자인 토큰과 레이어 기반 스타일링
- **Publishing standards**: 접근성·반응형·유지보수 고려

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

## Project Mindset

> 이 프로젝트는 “연습용 클론”이 아니라
> **실제 퍼블리셔/프론트엔드 포트폴리오 기준 결과물**을 목표로 한다.
