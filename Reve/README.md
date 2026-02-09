# REVE MVP 기능 구현 기록 (Auth / Cart / Product / Search)

목적: MVP 전자상거래 흐름을 **라우터 기반 SPA + localStorage 기반 스토어**로 구현  
범위: 인증/권한, 쿠폰, 장바구니(옵션), 상품리스트 UX, 전역 이벤트 위임, 검색, 멤버십(등급/적립), 주문/배송

---

## 목차

- [0) 프로젝트 구조 개요](#0-프로젝트-구조-개요)
- [1) 검색(Search)](#1-검색search)
- [2) 인증(Auth) + 권한(Role)](#2-인증auth--권한role)
- [3) 쿠폰 시스템(couponStore)](#3-쿠폰-시스템couponstore)
- [4) 회원가입 후 웰컴 모달 플로우](#4-회원가입-후-웰컴-모달-플로우)
- [5) 장바구니(cartStore) 옵션 라인](#5-장바구니cartstore-옵션-라인)
- [6) 상품 리스트(ProductCard) UX](#6-상품-리스트productcard-ux)
- [7) 장바구니(CartPage) 결제 흐름](#7-장바구니cartpage-결제-흐름)
- [8) 배송지(Address) 시스템](#8-배송지address-시스템)
- [9) 전역 이벤트 위임(app.js)](#9-전역-이벤트-위임appjs)
- [10) 상품 상세(ProductDetailPage)](#10-상품-상세productdetailpage)
- [11) 저장소 키 / 이벤트 규칙](#11-저장소-키--이벤트-규칙)
- [12) 멤버십(Membership) 단일 소스](#12-멤버십membership-단일-소스)
- [13) 마이페이지(MyPage)](#13-마이페이지mypage)
- [14) 승급 쿠폰 지급(Upgrade Reward)](#14-승급-쿠폰-지급upgrade-reward)
- [15) 주문(Order) 시스템](#15-주문order-시스템)
- [16) 결제 완료 페이지(Checkout Success)](#16-결제-완료-페이지checkout-success)
- [17) 다음 작업 후보(TODO)](#17-다음-작업-후보todo)

---

## 0) 프로젝트 구조 개요

### 전역 진입점: `app.js`

- 라우터 및 레이아웃 조립
- 전역 UI 초기화(사이드바, 검색 드로어, 토스트, 인증 UI)
- 전역 이벤트 위임(상품 리스트 사이즈 선택, 장바구니 토글)
- `sessionStorage` 기반 “회원가입 후 메인 모달” 플로우 처리
- `authStore` 구독으로 store owner 스위칭
   - `cartStore.setOwner(userId || 'guest')`
   - `couponStore.setOwner(userId || 'guest')`
   - `orderStore.setOwner(userId || 'guest')`
   - `addressStore.setOwner(userId || 'guest')`
- `cartStore` 구독으로 헤더 뱃지 및 리스트 상태 동기화
- 상품 카드 UI 동기화(`syncProductCardsWithCart`)

### 페이지

- `src/pages/auth/index.js`  
  로그인/회원가입 + redirectTo 지원
- `src/pages/product/index.js`  
  상품 리스트(그리드)
- `src/pages/productDetail/index.js`  
  상품 상세(옵션, 장바구니, 바로구매)
- `src/pages/cart/index.js`  
  장바구니 + 쿠폰 + 결제(mock) + 멤버십/포인트/승급쿠폰 + 주문 저장 + 배송지 가드 + 배송지 요약 표시
- `src/pages/checkoutSuccess/index.js`  
  결제 완료 페이지(주문 요약, 등급, 포인트 안내)
- `src/pages/search/index.js`  
  검색 페이지(`/search?q=`) + 최근/추천 + 결과 렌더
- `src/pages/mypage/index.js`  
  마이페이지(내정보, 배송지 CRUD, 주문내역, 주문·배송, 등급, 쿠폰)

### 스토어

- `src/store/authStore.js`  
  로그인 상태, 유저 persist (`totalSpent`, `points` 포함)
- `src/store/cartStore.js`  
  유저별 장바구니, 옵션 라인, 라인 병합
- `src/store/couponStore.js`  
  유저별 쿠폰 등록/적용/사용 처리, persist + owner 스위칭
- `src/store/orderStore.js`  
  유저별 주문 저장소, 결제 완료 시 주문 생성 + 주문 상태 관리
- `src/store/addressStore.js`  
  유저별 배송지 CRUD, 기본 배송지 지정, persist + owner 스위칭

### 유틸 / 컴포넌트

- `src/utils/router.js` : 라우팅
- `src/utils/guards.js` : `requireAuth` / `requireAdmin`
- `src/utils/searchDrawer.js` : 검색 드로어 전역 UI + 최근/추천 + 라우팅 연동
- `src/utils/searchHistory.js` : 최근 검색어 저장소(정규화/중복제거/최대개수/마이그레이션)
- `src/utils/sidebar.js` : 사이드바 전역 UI
- `src/utils/authUi.js` : Header 메뉴 노출/갱신
- `src/utils/membership.js` : 멤버십 계산 단일 소스
- `src/components/Toast.js` : 토스트
- `src/components/ConfirmModal.js` : 확인/취소 모달
- `src/components/ProductCard.js` : 상품 카드(사이즈 pill + 장바구니 아이콘)

---

## 1) 검색(Search)

### Search Drawer (전역 검색 드로어)

- `initSearchDrawer()`로 전역 1회 초기화
- 라우팅이 바뀌어도 유지되는 UI
- `app:render`마다 `searchDrawer.refresh()` 호출로 최신 DOM 기준 재연결
- Header 검색 버튼/아이콘으로 열리는 구조
- 최근 검색어 CRUD(개별 삭제/전체 삭제) 지원
- 추천 검색어(정적 배열) 칩 제공
- 검색 실행 시 `/search?q=...`로 이동(`app:navigate`)

> UX 규칙: Enter/검색/칩 클릭으로 검색 실행해도 드로어는 자동으로 닫지 않음  
> 닫힘은 X / 바깥 클릭 / ESC 로만 처리

### Search Page (`/search?q=`) ✅

- 라우트 등록
   - `'/search': { render: SearchPage, afterRender: initSearchPage }`
- 쿼리 기반 검색 결과 렌더
   - `loading / empty / error / result` 상태 분기
- 최근/추천 검색어 UI를 페이지에도 노출
   - 최근: 개별 삭제(×), 전체삭제
   - 칩 클릭 시 `/search?q=...` 이동 + 최근 검색어 갱신
- SearchDrawer ↔ SearchPage 동기화
   - `recent-search:changed` 이벤트로 최근검색 UI 즉시 동기화

---

## 2) 인증(Auth) + 권한(Role)

### authStore

- 더미 계정 로그인
   - `admin / 1234` → `ADMIN`
   - `user / 1234` → `MEMBER`
- 회원가입
   - `localStorage` 유저 저장 + 성공 시 자동 로그인
- 결제 연동 확장 필드
   - `totalSpent`: 누적 구매액
   - `points`: 보유 포인트

### guards

- `requireAuth({ redirectTo })`
- `requireAdmin({ redirectTo })`

### Header UI 가드

- 로그인 전: 마이페이지/관리자 메뉴 숨김
- 로그인 후: 마이페이지 노출
- ADMIN: 관리자 메뉴 노출
- 로그아웃 연결

---

## 3) 쿠폰 시스템(couponStore)

### 유저별 쿠폰 분리

- 로그인/로그아웃 시 `couponStore.setOwner(userId || 'guest')`
- storage key: `reve_coupons_v1:<ownerKey>`

### 기능

- `register(code)` : 쿠폰 등록
- `apply(code)` : 쿠폰 적용
- `clearApplied()` : 적용 해제
- `markUsed(code)` : 결제 시 사용 처리

### 웰컴 쿠폰

- 회원가입 성공 시 `HELLOWORLD(10%)` 1회 지급

---

## 4) 회원가입 후 웰컴 모달 플로우

- Auth에서 `sessionStorage` 플래그 저장
- 메인 렌더 완료(`app:render`) 타이밍에서 모달 실행
- 플래그 1회성 처리로 중복 방지
- 확인 시 마이페이지(쿠폰) 이동, 취소 시 메인 유지

---

## 5) 장바구니(cartStore) 옵션 라인

### 유저별 장바구니 분리

- storage key: `reve_cart_v1:<ownerKey>`
- `cartStore.setOwner(userId || 'guest')`

### 라인 정책

- key = `productId + options(size 등)` 조합
- 같은 옵션은 `qty` 누적
- 옵션 변경 시 동일 라인이 존재하면 병합(qty 합산)

### API

- `getItemsByProductId(productId)`
- `hasLine(productId, options?)`
- `updateOptions(key, nextOptions)`

---

## 6) 상품 리스트(ProductCard) UX

- 컬러 제거, 사이즈만 지원
- 사이즈 기본 선택 없음(실수 방지)
- 장바구니는 아이콘 버튼
- 담김 상태 `.is-added` 유지
- 담긴 사이즈 pill `is-in-cart` 표시 가능 구조

---

## 7) 장바구니(CartPage) 결제 흐름

### 쿠폰 UX

- 라디오 클릭 시 즉시 적용하지 않음
- `e.preventDefault()`로 기본 체크 차단
- 모달 confirm 결과로만 적용/해제 후 `paint()`로 UI 동기화

### 결제 UX

1. 배송지 가드(기본 배송지 확인)
2. 결제 확인 모달
3. mock 결제(`handleCheckout`)
4. 완료 모달(요약 표시)
5. 이동 분기
   - 주문 확인: `/checkout/success?orderId=...`
   - 계속 쇼핑: `/product`

### 멤버십/포인트

- Cart Summary에 현재 등급/적립률/예상 적립/다음 등급까지 표시
- 포인트 적립 기준: 상품금액만(배송비 제외)
- `base = pricing.totalAfterCoupon`

---

## 8) 배송지(Address) 시스템

### 목표

- 결제 진행 조건으로 기본 배송지 필요
- Cart에서 기본 배송지 요약 + 변경은 MyPage에서 수행
- 주문 저장 시 배송지 스냅샷 포함(주문 당시 주소 보존)

### 구현 구성

#### 1) addressStore (유저별 분리 + CRUD)

- storage key: `reve_addresses_v1:<ownerKey>`
- owner 전환: `addressStore.setOwner(userId || 'guest')`
- 제공 기능
   - `getAddresses()`
   - `getAddress(id)`
   - `createAddress(payload)`
   - `updateAddress(id, payload)`
   - `deleteAddress(id)`
   - `setDefault(id)`
   - `getDefault()`

#### 2) MyPage 배송지 탭 (CRUD UI)

- 배송지 추가/수정/삭제
- 기본 배송지 설정
- 입력 모달 기반 폼
- 이벤트 위임으로 패널 내부 처리

#### 3) Cart 배송지 요약 UI

- 기본 배송지 존재 시 요약 노출
- “변경” 클릭 시 `/mypage?tab=address` 이동
- 기본 배송지 없으면 “등록” CTA 노출

#### 4) 결제 가드(ensureDefaultAddress)

- 기본 배송지 없으면 결제 진행 중단 + `/mypage?tab=address` 유도
- 주소는 있어도 기본 배송지 없으면 “기본 배송지 설정” 유도

#### 5) 주문 저장 시 배송지 스냅샷 포함

- 결제 payload에 `shippingAddress` 스냅샷 포함
- 주소가 이후 수정되어도 주문 당시 주소 유지

---

## 9) 전역 이벤트 위임(app.js)

### owner 스위칭

- 앱 시작 시 현재 유저 기준 owner 세팅
- `authStore.subscribe()`에서 로그인 상태 변경 시 owner 변경 후 스위칭
- 대상 스토어: `cart / coupon / order / address`

### 동기화

- `cartStore.subscribe()`로 헤더 뱃지 및 리스트 동기화
- `syncProductCardsWithCart()`로 아이콘/사이즈 표시 동기화

---

## 10) 상품 상세(ProductDetailPage)

- 사이즈 미선택 시 장바구니 불가(토스트 안내)
- 선택 후 다른 사이즈 클릭 시 변경 confirm
- 바로구매: 장바구니로 이동 confirm 후 `/cart`

---

## 11) 저장소 키 / 이벤트 규칙

### localStorage / sessionStorage

- users: `reve_users_v1`
- auth: `reve_auth_v1`
- cart: `reve_cart_v1:<ownerKey>`
- coupons: `reve_coupons_v1:<ownerKey>`
- orders: `reve_orders_v1:<ownerKey>`
- addresses: `reve_addresses_v1:<ownerKey>`
- recent searches: `reve_recent_searches_v1`
- after signup modal: `sessionStorage.reve_after_signup_modal`

### 전역 커스텀 이벤트

- navigate: `app:navigate` (detail: `{ href }`)
- recent search sync: `recent-search:changed`

---

## 12) 멤버십(Membership) 단일 소스

- `src/utils/membership.js`
- `getMembershipSnapshot({ totalSpent, checkoutTotal })`
   - `current / next / remainToNext / progressToNextPct`
   - `earnRate / expectedPoints`
- `getUpgradedTiers({ prevTotalSpent, nextTotalSpent })`
- `getUpgradeCouponCode(tierName)`
- `formatPercent(rate)`

---

## 13) 마이페이지(MyPage)

### 탭 구성

- 내 정보 / 배송지 / 주문내역 / 주문·배송 / 회원등급 / 쿠폰·혜택

### 쿠폰 UX

- 사용 가능 쿠폰 우선 노출
- 사용 완료 쿠폰은 토글로 펼치기
- 승급 쿠폰은 prefix 기반 표시

### 배송지(Address)

- CRUD + 기본 배송지 + 입력 모달
- Cart 이동 딥링크(`/mypage?tab=address`) 지원

### 주문내역

- `orderStore.getOrders()`로 렌더
- 상태 변경(테스트) 버튼 유지

### 딥링크(탭/자동 액션) + 1회성 소비(consume)

- `/mypage?tab=address&open=add` → 배송지 추가 모달 자동 오픈(1회)
- `/mypage?tab=orders&open=detail&orderId=...` → 주문 상세 모달 자동 오픈(1회)
- `/mypage?tab=coupon&focus=register` → 쿠폰 입력창 자동 포커스(1회)

> `open / focus / orderId`는 실행 직후 URL에서 제거(consume)되어  
> 새로고침/뒤로가기에서도 반복 트리거되지 않는다. (`replaceState` 기반)

### MyPage - 주문/배송(Delivery) 탭 구현 ✅

- 주문 상태별 필터 제공(전체/결제완료/배송중/배송완료/취소)
- 주문 카드 기반 배송 타임라인 UI(결제→배송→완료, 취소 시 멈춤 표시)
- 운송장(가짜 코드) 생성 + 배송조회 모달(MVP)
- “상세”는 기존 주문 상세 모달(confirmModal) 재사용
- 배송지 스냅샷 표시(주문 당시 주소 유지)

#### 배송 단계별 날짜(체크리스트) ✅

- 주문에 `statusHistory`를 기록/표시하는 구조로 확장
- 상태 전환 시점의 타임스탬프 저장
   - `PAID / SHIPPING / DELIVERED / CANCELED`
- 타임라인 각 단계 아래 날짜 라벨로 노출 가능

---

## 14) 승급 쿠폰 지급(Upgrade Reward)

- 단일 소스: `membership.js`의 `UPGRADE_COUPON_BY_TIER`
- 결제 후 누적 구매액 변화로 승급 감지
- 점프 승급 시 중간 등급 포함 지급
- 지급은 `couponStore.register(code)` 처리(중복 방지)
- `grantedUpgradeCoupons[]`로 결과 반환

---

## 15) 주문(Order) 시스템

### orderStore

- storage key: `reve_orders_v1:<ownerKey>`
- owner 전환: `orderStore.setOwner(userId || 'guest')`

### 제공 API

- `getOrders()` / `getOrder(orderId)`
- `createOrder(orderPayload)`
- `updateOrderStatus(orderId, status)`
- (확장) `statusHistory` 기록을 위한 필드 지원

### 결제 → 주문 저장

- 결제 성공 직후 주문 저장
- payload에 `shippingAddress` 포함(스냅샷)
- 쿠폰 사용 처리, 포인트/누적 구매 반영, 승급 쿠폰 지급, cart clear 순서로 처리

---

## 16) 결제 완료 페이지(Checkout Success)

- `/checkout/success?orderId=...`
- 주문 조회 후 요약 렌더
- 주문 없으면 empty 상태 + CTA 제공

### 주문 요약

- 주문번호 / 결제일시 / 상태
- 쿠폰 / 배송비 / 최종 결제금액
- 주문 상품 리스트(최대 5개)
- 멤버십 안내(보유 포인트: authStore)
- 배송지 스냅샷(있을 경우)

---

## 17) 다음 작업 후보(TODO)

### A. 검색(Search) 고도화 🔍 (추천: 1순위)

- 검색 결과 정렬/필터(카테고리/가격대/정렬) 추가
- “입력 유지 정책” 확정
   - 예: Drawer 입력값 유지 vs 검색 후 초기화
- 검색 결과에서 키워드 하이라이트(선택)
- 최근 검색어 상단 고정/최대 갯수 UX 튜닝

### B. 관리자 기능(Admin) 🧰

- 상품 등록/수정/삭제(대분류/중분류)
- 주문 상태 관리(ADMIN 전용)
- 쿠폰/이벤트 관리(선택)

### C. 주문/배송 고도화 🚚

- `statusHistory`를 orderStore에 정식 반영(상태 전환 시 최초 1회 기록)
- 취소 플로우(결제완료 상태에서 취소 가능) + 타임라인 반영
- 주문 후 배송지 변경 불가 정책/안내 문구 정리

### D. 품질/안정성 🧪

- 스토어 스키마 마이그레이션 유틸(버전업 대응)
- 방어적 렌더링 강화(깨진 데이터 복구)
- E2E 시나리오 체크리스트 문서화(guest → signup → checkout → mypage)
