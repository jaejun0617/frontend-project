# REVE MVP 기능 구현 기록 (Auth / Cart / Product / Search)

> 목적: MVP 전자상거래 흐름을 “라우터 기반 SPA + localStorage 기반 스토어”로 구현  
> 범위: 인증/권한, 쿠폰, 장바구니(옵션), 상품리스트 UX, 전역 이벤트 위임, 검색 구조

---

## 0) 프로젝트 구조 개요

### 전역 진입점

- `app.js`
   - 라우터/레이아웃 조립
   - 전역 UI 초기화(사이드바/검색드로어/토스트/인증 UI)
   - 전역 이벤트 위임(상품리스트 사이즈 선택/장바구니 담기)
   - sessionStorage 기반 “회원가입 후 메인 모달” 플로우 처리
   - auth/cart store 구독으로 UI 동기화

### 페이지

- `src/pages/auth/index.js` : 로그인/회원가입 + redirectTo 지원
- `src/pages/product/index.js` : 상품 리스트 렌더(그리드)
- `src/pages/productDetail/index.js` : 상품 상세(옵션 선택/장바구니/바로구매) (진행 중)
- `src/pages/cart/index.js` : 장바구니 + 쿠폰 + 결제(더미)
- `src/pages/search/index.js` : 검색 페이지 구조 (확장 예정)

### 스토어

- `src/store/authStore.js` : 로그인 상태, 유저 persist
- `src/store/cartStore.js` : 유저별 장바구니, 옵션 라인, 라인 병합
- `src/store/couponStore.js` : 쿠폰 등록/적용/사용처리, persist

### 유틸/컴포넌트

- `src/utils/router.js` : 라우팅
- `src/utils/guards.js` : requireAuth / requireAdmin
- `src/utils/searchDrawer.js` : 검색 서랍 전역 UI
- `src/utils/sidebar.js` : 사이드바 전역 UI
- `src/utils/authUi.js` : Header 메뉴 노출/갱신
- `src/components/Toast.js` : 토스트(중앙 표시)
- `src/components/ConfirmModal.js` : 확인/취소 모달
- `src/components/ProductCard.js` : 상품 카드(사이즈 pill + 장바구니 아이콘 버튼)

---

## 1) 🔎 검색바(Search) 구현 현황

### ✅ Search Drawer (전역 검색 서랍)

- `initSearchDrawer()` 로 **전역 1회 초기화**
- 라우팅이 바뀌어도 유지되는 UI
- `app:render` 마다 `searchDrawer.refresh()` 호출해서 **새 DOM 기준 재연결**
- 보통 Header의 검색 버튼/아이콘에서 열리는 구조

### ✅ Search Page (/search)

- 라우트 등록:
   - `'/search': { render: SearchPage, afterRender: initSearchPage }`
- 페이지 이동형 검색도 가능한 기반 완료

### ✅ Sidebar + Search 연동 구조

- `initSidebar()` 전역 초기화 완료
- “전역 UI(사이드바/검색드로어)” 패턴이 동일하게 동작

### 🔧 Search에서 남은 작업(확장 단계)

1. 검색어 상태 유지
   - 드로어 열고 닫아도 입력값 유지 여부
   - `/search?q=...` 쿼리스트링 연동
2. 검색 결과 UX
   - 결과를 ProductGrid에 붙이기
   - 결과 없음 상태 처리
3. 검색 추천/자동완성
   - 최근 검색어 localStorage 저장
   - 추천 키워드/인기 키워드
4. 필터(차후)
   - 카테고리/브랜드/가격대

---

## 2) 🔐 인증(Auth) + 권한(Role) 기반 UI/가드

### ✅ authStore

- 더미 계정 로그인
   - `admin / 1234 → ADMIN`
   - `user / 1234 → MEMBER`
- 회원가입
   - localStorage에 유저 저장
   - 성공 시 자동 로그인
- 로그인 상태 localStorage persist 유지

### ✅ guards

- `requireAuth({ redirectTo })`
   - 비로그인 → `/auth?redirectTo=/원래경로` 이동
- `requireAdmin({ redirectTo })`
   - 관리자만 `/admin` 접근 가능

### ✅ Header UI 가드

- 로그인 전: 마이페이지/관리자 메뉴 숨김
- 로그인 후: 마이페이지 노출
- ADMIN: 관리자 메뉴 노출
- 로그아웃 동작 연결

---

## 3) 🎫 쿠폰 시스템(couponStore)

### ✅ 상태 + persist

- 쿠폰 catalog 기반 정의(서버 대체)
- 보유 쿠폰 `owned[]`
- 적용 쿠폰 `appliedCode`
- 새로고침 유지(localStorage)

### ✅ 기능

- `register(code)` : 쿠폰 등록
- `apply(code)` : 쿠폰 적용
- `clearApplied()` : 적용 해제
- `markUsed(code)` : 결제 시 사용 처리
- `clearAll()` : 테스트/디버그용 초기화

### ✅ 회원가입 웰컴 쿠폰

- 회원가입 성공 시 `HELLOWORLD(10%)` 1회 지급

---

## 4) 🎉 회원가입 후 “메인에서” 웰컴 모달 플로우

### 목표 흐름

- 회원가입 → **메인으로 이동** → (2초 뒤) 웰컴 모달 표시

### 구현 방식

- Auth 페이지에서 `sessionStorage`에 플래그 저장
- 홈 렌더 완료 후 `app:render`에서 모달 실행
- `setTimeout(2000)` 으로 지연 가능
- 중복 방지: `didRunSignupModal` + `sessionStorage` 즉시 제거(1회성)

### 모달 UX

- 확인: 마이페이지(쿠폰함) 이동
- 취소: 메인 유지

---

## 5) 🛒 cartStore 고도화 (유저별 분리 + 옵션 라인)

### ✅ 유저별 장바구니 분리

- storage key: `reve_cart_v1:<ownerKey>`
- 로그인/로그아웃 시 `setOwner(userId)` 로 자동 스위칭
- guest 장바구니도 유지

### ✅ 라인 구조

- `key = productId + options(size 등)` 조합으로 생성
- 같은 상품이라도 사이즈가 다르면 다른 라인
- 같은 상품 + 같은 옵션이면 qty 누적

### ✅ 추가된 API

- `getItemsByProductId(productId)`
   - 리스트에서 “담김 표시” 용
- `hasLine(productId, options?)`
   - 특정 옵션 라인이 담겼는지 체크
- `updateOptions(key, nextOptions)`
   - 장바구니에서 사이즈 변경
   - 변경 후 동일 라인이 있으면 qty 병합(중복 라인 방지)

---

## 6) 🧾 ProductCard(상품리스트) UX 개편

### ✅ 옵션

- 컬러 제거(명품 샵 컨셉)
- 사이즈만 지원

### ✅ 사이즈 선택 UX

- 기본 선택 없음(실수 방지)
- 사이즈 있는 상품은 선택해야 장바구니 가능
- UI: select → **pill UI** 로 변경

### ✅ 장바구니 버튼 UI

- 텍스트 버튼 → `favorite.svg` 아이콘 버튼
- 카드 하단 우측 고정(floating)
- 담김 상태: `.is-added` 로 빨간 배경 표시

### ✅ 담김 상태 유지(리스트 동기화)

- 장바구니에 담긴 상품: 리스트에서도 빨간 아이콘 유지
- 담긴 사이즈 pill도 `is-in-cart` 표시 가능하도록 설계

---

## 7) 🧺 CartPage(장바구니) 확장

### ✅ 기존 기능

- 무료배송 기준선 + 배송비(30만원 미만 3,000원)
- 쿠폰 적용 가능 라인 수 표시
- 기본 세일 + 쿠폰 할인 누적 반영(pricing.js)
- checkout 조건: (아이템 ≥ 1) && (최종금액 > 0)
- 결제 흐름(API-ready): buildCheckoutPayload / checkout(mock)

### ✅ 사이즈 옵션 UX (리스트와 동일 UI)

- Cart에서도 상품리스트와 동일한 **사이즈 pill UI** 제공
- pill 클릭 → **confirmModal 확인 후** 변경 적용
- 변경 적용: `cartStore.updateOptions(key, { size })`
- 같은 상품/옵션 라인이 이미 있으면 **라인 병합(qty 합산)** 될 수 있음
- 완료 토스트(디테일):
   - `사이즈 A → B로 변경됐어요`
   - 병합 시: `동일 상품은 합쳐졌어요 ✅` 메시지 포함

### ✅ 쿠폰 적용 UX (모달 기반 확정)

- 기존 “적용/해제 버튼” 제거
- 쿠폰 라디오 클릭 시 **즉시 적용하지 않음**
- 동작 규칙:
   1. 쿠폰 선택 → “이 쿠폰을 사용하시겠어요?” confirmModal
      - 확인: `couponStore.apply(code)`
      - 취소: `paint()`로 UI 원복(라디오 선택 상태도 복구)
   2. 이미 적용된 쿠폰을 다시 클릭 → “쿠폰을 해제할까요?” confirmModal
      - 확인: `couponStore.clearApplied()`
      - 취소: 적용 유지 + `paint()`로 UI 원복
- 쿠폰 적용 가능한 상품이 없으면:
   - 토스트 안내 + `paint()`로 즉시 상태 복구

### ✅ 구매하기 UX (결제 확인 → Mock 결제 → 완료 모달)

- 구매하기 클릭 시 “결제를 진행할까요?” confirmModal
   - 취소: 아무 동작 없음
   - 확인: mock 결제 진행(handleCheckout)
- 결제 완료 시 confirmModal로 요약 표시:
   - 사용 쿠폰 / 배송비 / 최종 결제금액
   - 결제 후 갱신된 회원 등급 + 다음 등급까지 남은 금액

### ✅ 결제 완료 후 등급 안내

- Mock 결제 완료 모달에 등급 정보를 함께 표시
   - 현재 누적 구매액(totalSpent) 기반 현재 등급 계산
   - 다음 등급까지 남은 금액 안내
   - 최고 등급이면 유지 안내 문구 표시
- 등급 기준은 CartPage 내 MEMBERSHIP_TIERS에서 관리(확장 용이)

### ✅ Cart 요약 영역에 등급/적립 정보 노출

- 현재 회원 등급 및 적립률 표시(총 구매액 totalSpent 기준)
- 이번 결제 최종금액(total) 기반 예상 적립 포인트 표시
- 다음 등급까지 남은 금액 표시(구매 유도 UX)
- 등급/적립 정책은 상수 테이블에서 관리(정책 변경 용이)

### ✅ 추가 기능(이번 작업 포인트)

- Cart에서도 상품리스트와 동일한 **사이즈 pill UI**
- pill 클릭 → `cartStore.updateOptions(key, { size })`
   - 필요 시 동일 라인 병합
- 사이즈 변경 시 토스트: “사이즈가 변경됐어요”

### 🔧 보강 예정(요구사항 반영)

- 사이즈 변경 시 confirmModal:
   - “사이즈를 변경할까요?”
   - 확인 → 변경 적용 + 토스트
   - 취소 → 변경 취소

---

## 8) ⚙️ app.js 전역 이벤트 위임(핵심 엔진)

### ✅ 사이즈 pill 선택(상품 리스트)

- pill 클릭 → 카드에 `data-selected-size` 저장
- aria-pressed / is-active 토글
- 재클릭 시 선택 해제(UX 옵션)

### ✅ 장바구니 담기 가드

- 비로그인: `/auth?redirectTo=현재경로`
- 사이즈 필요한 상품인데 미선택:
   - 토스트로 “사이즈를 선택해 주세요”

### ✅ 리스트 동기화

- `syncProductCardsWithCart()`
   - 아이콘 빨강 유지
   - 담긴 사이즈 pill 표시

### ✅ store 구독 구조 정리

- authStore 변화 시 cart owner 스위칭
- 로그인/로그아웃 토스트
- cartStore 변화 시 뱃지/리스트 동기화

---

## 9) 🧩 ProductDetailPage(상세) 요구사항(진행 중)

### 목표

- 장바구니 클릭 시 토스트
- 사이즈 필요한 상품 미선택 상태에서 장바구니 클릭:
   - “사이즈 선택” 토스트
- 사이즈 선택 후 다른 사이즈 클릭:
   - “변경할까요?” 모달(확인 시 변경)
- 바로구매 클릭:
   - “장바구니로 이동할까요?” 모달
   - 확인 시 `/cart` 이동

---

## 10) 저장소 키 / 이벤트 규칙(중요)

### localStorage / sessionStorage

- users: `reve_users_v1`
- cart: `reve_cart_v1:<ownerKey>`
- after signup modal: `sessionStorage.reve_after_signup_modal`

### 전역 커스텀 이벤트

- navigate: `app:navigate` (detail: { href })

---

## 11) 🏷️ Membership(등급/적립) 시스템 분리

### ✅ 목표

- Cart/Mypage 등 여러 화면에서 “등급/적립 정책”이 반복되지 않도록
- **membership.js 단일 소스**로 계산/표시를 통일

### ✅ 구현

- `src/utils/membership.js`
   - `getMembershipSnapshot({ totalSpent, checkoutTotal })`
      - 현재 등급(current)
      - 다음 등급(next) 및 남은 금액(remainToNext)
      - 등급별 적립률(earnRate)
      - 이번 결제 예상 적립 포인트(expectedPoints)
   - `formatPercent(rate)` : 0.03 → “3%” 포맷

### ✅ Cart Summary 반영

- 장바구니 요약 영역에 아래 항목 노출
   - 현재 등급 + 적립률
   - 이번 결제 적립 예상 포인트
   - 다음 등급까지 남은 금액(최고 등급이면 “최고 등급”)
