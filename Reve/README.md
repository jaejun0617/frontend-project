# REVE MVP 기능 구현 기록 (Auth / Cart / Product / Search)

> **목적**: MVP 전자상거래 흐름을 **라우터 기반 SPA + localStorage 기반 스토어**로 구현  
> **범위**: 인증/권한, 쿠폰, 장바구니(옵션), 상품리스트 UX, 전역 이벤트 위임, 검색 구조, 멤버십(등급/적립/승급쿠폰/포인트)

---

## 0) 프로젝트 구조 개요

### 전역 진입점: `app.js`

- 라우터/레이아웃 조립
- 전역 UI 초기화(사이드바/검색드로어/토스트/인증 UI)
- 전역 이벤트 위임(상품리스트 사이즈 선택/장바구니 담기)
- `sessionStorage` 기반 “회원가입 후 메인 모달” 플로우 처리
- `authStore` 구독으로 store owner 스위칭
   - `cartStore.setOwner(userId || 'guest')`
   - `couponStore.setOwner(userId || 'guest')`
- `cartStore` 구독으로 헤더 뱃지/리스트 상태 동기화

### 페이지

- `src/pages/auth/index.js` : 로그인/회원가입 + `redirectTo` 지원
- `src/pages/product/index.js` : 상품 리스트(그리드)
- `src/pages/productDetail/index.js` : 상품 상세(옵션/장바구니/바로구매) **(진행 중)**
- `src/pages/cart/index.js` : 장바구니 + 쿠폰 + 결제(mock) + 멤버십/포인트/승급쿠폰
- `src/pages/search/index.js` : 검색 페이지 구조 (확장 예정)
- `src/pages/mypage/index.js` : 마이페이지(내정보/등급/쿠폰)

### 스토어

- `src/store/authStore.js` : 로그인 상태, 유저 persist (totalSpent/points 포함)
- `src/store/cartStore.js` : 유저별 장바구니, 옵션 라인, 라인 병합
- `src/store/couponStore.js` : 유저별 쿠폰 등록/적용/사용 처리, persist + owner 스위칭

### 유틸/컴포넌트

- `src/utils/router.js` : 라우팅
- `src/utils/guards.js` : `requireAuth` / `requireAdmin`
- `src/utils/searchDrawer.js` : 검색 서랍 전역 UI
- `src/utils/sidebar.js` : 사이드바 전역 UI
- `src/utils/authUi.js` : Header 메뉴 노출/갱신
- `src/utils/membership.js` : 멤버십(등급/적립/승급) 계산 단일 소스
- `src/components/Toast.js` : 토스트
- `src/components/ConfirmModal.js` : 확인/취소 모달
- `src/components/ProductCard.js` : 상품 카드(사이즈 pill + 장바구니 아이콘 버튼)

---

## 1) 🔎 검색(Search) 구현 현황

### ✅ Search Drawer (전역 검색 서랍)

- `initSearchDrawer()`로 전역 1회 초기화
- 라우팅이 바뀌어도 유지되는 UI
- `app:render`마다 `searchDrawer.refresh()` 호출로 새 DOM 기준 재연결
- Header의 검색 버튼/아이콘으로 열리는 구조

### ✅ Search Page (`/search`)

- 라우트 등록 완료
- `'/search': { render: SearchPage, afterRender: initSearchPage }`
- 페이지 이동형 검색 기반 확보

### ✅ Sidebar + Search 연동 구조

- `initSidebar()` 전역 초기화 완료
- “전역 UI(사이드바/검색드로어)” 패턴이 동일하게 동작

### 🔧 Search에서 남은 작업(확장 단계)

1. **검색어 상태 유지**
   - 드로어 입력값 유지 여부
   - `/search?q=...` 쿼리스트링 연동
2. **검색 결과 UX**
   - 결과를 `ProductGrid`로 렌더링
   - 결과 없음 상태 처리
3. **추천/자동완성**
   - 최근 검색어(`localStorage`)
   - 인기/추천 키워드
4. **필터(차후)**
   - 카테고리/브랜드/가격대

---

## 2) 🔐 인증(Auth) + 권한(Role) 기반 UI/가드

### ✅ `authStore`

- 더미 계정 로그인
   - `admin / 1234` → `ADMIN`
   - `user / 1234` → `MEMBER`
- 회원가입
- `localStorage` 유저 저장 + 성공 시 자동 로그인
- 로그인 상태 persist 유지
- 결제 연동 확장
   - `totalSpent`: 누적 구매액
   - `points`: 보유 포인트 (결제 시 적립)

### ✅ `guards`

- `requireAuth({ redirectTo })`
- `requireAdmin({ redirectTo })`

### ✅ Header UI 가드

- 로그인 전: 마이페이지/관리자 메뉴 숨김
- 로그인 후: 마이페이지 노출
- `ADMIN`: 관리자 메뉴 노출
- 로그아웃 동작 연결

---

## 3) 🎫 쿠폰 시스템(`couponStore`)

### ✅ 핵심: 유저별 쿠폰 분리 (계정 섞임 버그 Fix)

- 쿠폰 persist key를 userId 기반으로 분리
- 로그인/로그아웃 시 `couponStore.setOwner(userId || 'guest')`로 자동 스위칭
- storage key: `reve_coupons_v1:<ownerKey>`

### ✅ 상태 + persist

- 쿠폰 catalog 기반 정의(서버 대체)
- 보유 쿠폰: `owned[]`
- 적용 쿠폰: `appliedCode`
- 새로고침 유지(localStorage)

### ✅ 기능

- `setOwner(ownerKey)` : 유저별 저장소 스위칭(필수)
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

- 회원가입 → 메인 이동 → (지연 후) 웰컴 모달 표시

### 구현 방식

- Auth 페이지에서 `sessionStorage` 플래그 저장
- 홈 렌더 완료 후 `app:render` 타이밍에서 모달 실행
- `setTimeout`으로 지연 가능
- 중복 방지: 플래그 1회성 처리

### 모달 UX

- 확인: 마이페이지(쿠폰함) 이동
- 취소: 메인 유지

---

## 5) 🛒 `cartStore` 고도화 (유저별 분리 + 옵션 라인)

### ✅ 유저별 장바구니 분리

- storage key: `reve_cart_v1:<ownerKey>`
- 로그인/로그아웃 시 `setOwner(userId)`로 자동 스위칭
- guest 장바구니도 유지

### ✅ 라인 구조

- `key = productId + options(size 등) 조합`
- 같은 상품이라도 옵션이 다르면 다른 라인
- 같은 상품 + 같은 옵션이면 `qty` 누적

### ✅ 추가 API

- `getItemsByProductId(productId)` : 리스트 “담김 상태 표시” 용
- `hasLine(productId, options?)` : 특정 옵션 라인 존재 체크
- `updateOptions(key, nextOptions)`
   - Cart에서 사이즈 변경 지원
   - 동일 옵션 라인이 이미 있으면 **라인 병합(qty 합산)**

---

## 6) 🧾 `ProductCard`(상품리스트) UX 개편

### ✅ 옵션 정책

- 컬러 제거(컨셉 정리)
- 사이즈만 지원

### ✅ 사이즈 선택 UX

- 기본 선택 없음(실수 방지)
- 사이즈 있는 상품은 선택해야 장바구니 가능
- UI: pill 방식

### ✅ 장바구니 버튼 UI

- 텍스트 버튼 → `favorite.svg` 아이콘 버튼
- 카드 하단 우측 고정(floating)
- 담김 상태: `.is-added`로 빨간 배경 표시

### ✅ 담김 상태 동기화(리스트)

- 장바구니에 담긴 상품은 리스트에서도 빨간 아이콘 유지
- 담긴 사이즈 pill도 `is-in-cart` 표시 가능하도록 설계

---

## 7) 🧺 `CartPage`(장바구니) 확장

### ✅ 쿠폰 적용 UX (라디오 + 모달 확정)

- “적용/해제 버튼” 제거
- 라디오 클릭 시 즉시 적용하지 않음
- 브라우저 기본 체크를 막기 위해 `e.preventDefault()` 사용
- 모달 confirm 결과로만 store 상태 변경 후 `paint()`로 UI 정렬
   1. 쿠폰 선택 → confirm → 확인 시 apply, 취소 시 원복
   2. 적용 중 쿠폰 재클릭 → confirm → 확인 시 clear, 취소 시 유지

### ✅ 구매하기 UX (결제 확인 → Mock 결제 → 완료 모달)

- 구매하기 클릭 시 “결제를 진행할까요?” confirmModal
- 확인 시 mock 결제 진행(handleCheckout)
- 완료 모달에 요약 표시
   - 사용 쿠폰 / 배송비 / 최종 결제금액
   - 현재 등급 + 다음 등급까지 남은 금액
   - (있으면) 승급 쿠폰 지급 내역

### ✅ Cart Summary: 멤버십(등급/적립) 노출

- 현재 등급 + 적립률
- 이번 결제 예상 적립 포인트
- 다음 등급까지 남은 금액

### ✅ 포인트 정책(확정)

- 적립 기준: **상품금액만(배송비 제외)**
- 적립 base = `pricing.totalAfterCoupon` (쿠폰 반영된 상품 결제금액)

---

## 8) ⚙️ `app.js` 전역 이벤트 위임(핵심 엔진)

### ✅ store owner 스위칭(중요)

- `authStore.subscribe()`에서 로그인 상태 변경 시:
   - `cartStore.setOwner(u?.id || 'guest')`
   - `couponStore.setOwner(u?.id || 'guest')` ← 딱 1번만

### ✅ 장바구니 변화 시 동기화

- `cartStore.subscribe()`:
   - `updateCartCount()`
   - `syncProductCardsWithCart()`

### ✅ 리스트 동기화

- `syncProductCardsWithCart()`
   - 아이콘 빨강 유지
   - 담긴 사이즈 pill 표시

### ✅ store 구독 구조

- `authStore` 변화 시 cart owner 스위칭
- 로그인/로그아웃 토스트
- `cartStore` 변화 시 뱃지/리스트 동기화

---

## 9) 🧩 `ProductDetailPage`(상세) 완료

- 장바구니 클릭 시 토스트
- 사이즈 필요한 상품 **미선택** 상태에서 장바구니 클릭:
   - “사이즈 선택” 토스트
- 사이즈 선택 후 **다른 사이즈 클릭**:
   - “변경할까요?” 모달(확인 시 변경)
- 바로구매 클릭:
   - “장바구니로 이동할까요?” 모달(확인 시 `/cart` 이동)

---

## 10) 저장소 키 / 이벤트 규칙

### localStorage / sessionStorage

- users: `reve_users_v1`
- auth: `reve_auth_v1`
- cart: `reve_cart_v1:<ownerKey>`
- coupons: `reve_coupons_v1:<ownerKey>`
- after signup modal: `sessionStorage.reve_after_signup_modal`

### 전역 커스텀 이벤트

- navigate: `app:navigate` (detail: `{ href }`)

---

## 11) 🏷️ Membership(등급/적립) 시스템 분리

### ✅ 목표

- Cart/Mypage/결제완료 화면에서 정책 중복 방지
- 계산/표시를 `membership.js` 단일 소스로 통일

### ✅ 구현

- `src/utils/membership.js`
- `getMembershipSnapshot({ totalSpent, checkoutTotal })`
   - current/next/remainToNext/progressToNextPct
   - earnRate / expectedPoints
- `getUpgradedTiers({ prevTotalSpent, nextTotalSpent })`
- `getUpgradeCouponCode(tierName)`
- `formatPercent(rate)` : `0.03` → `"3%"`

---

## 12) ✅ MyPage 개선 (Membership 통합 + Coupon UX)

### ✅ 쿠폰 UX

- 기본 정책: 사용 완료 쿠폰(`used === true`)은 기본 리스트에서 숨김
- 필요 시 “사용 완료 쿠폰 보기(N)” 토글로 펼쳐보기 제공
- 승급 쿠폰은 `UPGRADE_*` prefix 기반 배지 표시

### ✅ Membership 통합

- grade.js 의존 제거 → membership.js 단일 소스로 통일
- 내 정보(Profile) 패널에 멤버십 요약 추가
   - 현재 등급 / 적립률 / 다음 등급까지 남은 금액
   - 누적 구매액 / 보유 포인트

### ✅ Grade 진행률

- 진행바는 `progressToNextPct(0~100)` 기반으로 렌더링

---

## 13) 🎁 승급 쿠폰(Upgrade Reward) 지급

### ✅ 목표

- 결제 완료 시 승급 발생하면 “축하 쿠폰” 지급

### ✅ 정책(단일 소스)

- `membership.js`의 `UPGRADE_COUPON_BY_TIER`
   - 골드 → `UPGRADE_GOLD`
   - 로얄 → `UPGRADE_ROYAL`
   - VIP → `UPGRADE_VIP`

### ✅ 지급 로직(결제 후)

- `cart/index.js`의 `handleCheckout()`에서:
   - 결제 전/후 누적 구매액 비교로 승급 감지
   - 여러 단계 점프 승급 시 중간 등급 포함하여 모두 지급
   - 지급은 `couponStore.register(code)`로 처리(중복 자동 방지)
- 지급된 쿠폰 리스트는 `grantedUpgradeCoupons[]`로 반환
- 결제 완료 모달에 지급 내역 표시(있을 때만)

---
