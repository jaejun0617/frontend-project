# README_SCSS — 2025 Complete Core (실무형)

> 목표: SCSS를 “편한 CSS”가 아니라 **CSS 생성 로직 + 아키텍처**로 쓰기

---

## 1) SCSS란?
- SCSS(Sass)는 **전처리기 문법**
- 브라우저가 읽는 건 항상 CSS  
  → 빌드(컴파일) 단계가 필요

---

## 2) SCSS가 강한 영역
- 반복/조건/계산 기반 “대량 스타일 생성”
- 디자인 토큰(변수/맵) 기반 설계
- 파일 모듈화(@use/@forward)로 전역 오염 줄이기

---

## 3) SCSS 변수 vs CSS 변수
### SCSS 변수 `$x`
- 컴파일 타임 확정(빌드 시 값 고정)
- 로직(루프/함수/조건)에 강함

### CSS 변수 `--x`
- 런타임 변경 가능(테마/다크모드)
- 상태 기반 UI에 강함

✅ 실무는 보통 “둘을 조합”한다.

---

## 4) Variables / Maps (토큰 설계)
```scss
$colors: (
  bg: #000,
  text: #fff,
  primary: #0066ff,
);

body{
  background: map-get($colors, bg);
  color: map-get($colors, text);
}
```

---

## 5) Nesting (얕게)
```scss
.card{
  &__title{ }
  &:hover{ }
}
```
- 2단 정도 권장 (깊은 중첩은 CSS 폭발)

---

## 6) Mixins (재사용 블록)
```scss
@mixin flex-center{
  display:flex;
  justify-content:center;
  align-items:center;
}

.container{ @include flex-center; }
```
- 인자/기본값으로 확장 가능

---

## 7) Functions (값 계산)
```scss
@function rem($px, $base: 16px){
  @return ($px / $base) * 1rem;
}

.title{ font-size: rem(24px); }
```

---

## 8) Control Directives (조건)
```scss
@mixin theme($mode){
  @if $mode == dark { background:#121212; color:#f1f1f1; }
  @else { background:#fff; color:#222; }
}
```

---

## 9) Loops (대량 생성 핵심)
### @for
```scss
@for $i from 1 through 10{
  .item-#{$i}{ width: 10px * $i; }
}
```
- `through`: 마지막 포함
- `to`: 마지막 제외

### @each
```scss
$states: primary, danger, success;

@each $s in $states{
  .btn--#{$s}{ /* ... */ }
}
```

---

## 10) random() (빌드 시 랜덤)
- `random(n)`은 1~n 정수
- “런타임 랜덤”이 아니라 “컴파일 시 랜덤 배치”
- 파티클/노이즈 배경 같은 연출에 좋음

---

## 11) 모듈 방식: @use / @forward (현대 SCSS)
- @import는 전역 오염 문제로 지양되는 흐름
- @use는 네임스페이스로 안전하게 가져옴
```scss
@use "abstracts/vars" as v;
body{ background: v.$bg; }
```

---

## 12) 추천 폴더 구조(실무)
```
scss/
  abstracts/ (_variables, _mixins, _functions)
  base/      (_reset, _typography)
  components/(_button, _card, _particles)
  layout/    (_grid, _header)
  pages/     (_home)
  main.scss
```

---

## 13) 실무 체크리스트
- [ ] 토큰이 변수/맵으로 관리되나?
- [ ] 반복은 루프로 생성하나?
- [ ] mixin/function이 남발되지 않나? (필요할 때만)
- [ ] @use/@forward로 모듈화했나?
- [ ] 중첩이 얕고(2단) 선택자 폭발이 없나?

