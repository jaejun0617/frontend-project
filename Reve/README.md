# REVE MVP 기능 구현 기록 (Auth / Cart / Product / Search / Admin)

목적: MVP 전자상거래 흐름을 **라우터 기반 SPA + localStorage 기반 스토어**로 구현  
범위: 인증/권한, 쿠폰, 장바구니(옵션), 상품리스트 UX, 전역 이벤트 위임, 검색, 멤버십(등급/적립), 주문/배송, **관리자(Admin)**

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
- [17) 관리자(Admin) 운영툴](#17-관리자admin-운영툴)
- [18) 품질/안정성 체크리스트(P2)](#18-품질안정성-체크리스트p2)
- [19) 다음 작업 후보(TODO)](#19-다음-작업-후보todo)

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
  상품 리스트(그리드) + 필터/정렬/페이지네이션
- `src/pages/productDetail/index.js`  
  상품 상세(옵션, 장바구니, 바로구매)
- `src/pages/cart/index.js`  
  장바구니 + 쿠폰 + 결제(mock) + 멤버십/포인트/승급쿠폰 + 주문 저장 + 배송지 가드 + 배송지 요약 표시
- `src/pages/checkoutSuccess/index.js`  
  결제 완료 페이지(주문 요약, 등급, 포인트 안내)
- `src/pages/search/index.js`  
  검색 페이지(`/search?q=`) + 최근/추천 + 결과 렌더 + 필터/정렬/페이지네이션
- `src/pages/mypage/index.js`  
  마이페이지(내정보, 배송지 CRUD, 주문내역, 주문·배송, 등급, 쿠폰)
- `src/pages/admin/index.js`  
  관리자 운영 툴(상품/주문/쿠폰/감사로그/백업)

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
- `src/store/adminProductStore.js`  
  **Admin 상품 SSOT**: normalize/repair, createdAt/updatedAt 보장, 최신순 정렬, (옵션) 업로더 어댑터 슬롯, brand/tags 정규화
- `src/store/adminOrderStore.js`, `src/store/adminCouponStore.js`  
  Admin 주문/쿠폰 운영 스토어

### 유틸 / 컴포넌트

- `src/utils/router.js` : 라우팅
- `src/utils/guards.js` : `requireAuth` / `requireAdmin`
- `src/utils/searchDrawer.js` : 검색 드로어 전역 UI + 최근/추천 + 라우팅 연동
- `src/utils/searchHistory.js` : 최근 검색어 저장소(정규화/중복제거/최대개수/마이그레이션)
- `src/utils/sidebar.js` : 사이드바 전역 UI
- `src/utils/authUi.js` : Header 메뉴 노출/갱신
- `src/utils/membership.js` : 멤버십 계산 단일 소스
- `src/utils/validate.js` : Product/Coupon/Order 검증
- `src/utils/auditLog.js` : 감사 로그 저장/구독
- `src/utils/exportImport.js` : Admin 데이터 번들 Export/Import
- `src/components/Toast.js` : 토스트
- `src/components/ConfirmModal.js` : 확인/취소 모달
- `src/components/ProductCard.js` : 상품 카드(사이즈 pill + 장바구니 아이콘 + 태그 + 안전 이미지)

---

## 1) 검색(Search)

### Search Drawer (전역 검색 드로어)

- `initSearchDrawer()`로 전역 1회 초기화
- 라우팅이 바뀌어도 유지되는 UI
- `app:render`마다 `searchDrawer.refresh()` 호출로 최신 DOM 기준 재연결
- 최근 검색어 CRUD(개별 삭제/전체 삭제) + 추천 검색어 칩
- 검색 실행 시 `/search?q=...`로 이동(`app:navigate`)

#### UX 규칙(최종)

- 검색 실행(Enter/칩 클릭/검색 submit) 시 **드로어 자동 닫힘**
- 닫힘 트리거: 검색 실행 / X / 바깥 클릭(overlay) / ESC

#### 외부 제어(브릿지)

- SearchPage 등에서 import 없이 닫을 수 있도록 이벤트 브릿지 제공
   - `window.dispatchEvent(new CustomEvent('app:searchDrawerClose'))`
   - `app.js`가 수신하여 `searchDrawer.close()` 실행

### Search Page (`/search?q=`) ✅ (P1)

- 라우트 등록: `'/search': { render: SearchPage, afterRender: initSearchPage }`
- 쿼리 기반 결과 렌더: `loading / empty / error / result`
- 최근/추천 검색어 UI를 페이지에도 노출
- SearchDrawer ↔ SearchPage 동기화: `recent-search:changed`

#### SearchPage 탐색 UX 통합 ✅

- 가격 필터: `min/max`
- 정렬: `NEW / PRICE_ASC / PRICE_DESC / HOT / BEST`
- 페이지네이션: `20개/페이지`
- URL 쿼리 동기화: `/search?q=...&min=&max=&sort=&page=`
   - `replaceState`로 URL만 갱신해 재마운트 방지
- UX
   - 필터/정렬 변경은 **즉시 반영** + `page=1` 리셋
   - 페이지 이동 시 **상단 자동 스크롤**
   - SearchPage 진입 시 드로어는 항상 닫힘(브릿지 이벤트)

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

### 카드 UX (ProductCard)

- 컬러 제거, 사이즈만 지원
- 사이즈 기본 선택 없음(실수 방지)
- 장바구니는 아이콘 버튼(하단 floating)
- 담김 상태 `.is-added` 유지
- 담긴 사이즈 pill `is-in-cart` 표시 가능 구조

### (P2) 안전한 이미지 렌더링 ✅

- `product.image` 허용:
   - `data:image/*`, `blob:`, `http(s)://`, 상대경로(`/`, `./`, `../`)
- 위험 스킴 차단 후 placeholder로 대체
- 이미지 로딩 실패 시 placeholder로 fallback

### 상품 리스트 UX (Product Page) ✅

- 가격 필터: `min/max` (입력 즉시 반영 + `page=1` 리셋)
- 정렬: `NEW / PRICE_DESC / PRICE_ASC / HOT / BEST`
- 페이지네이션: `20개/페이지`
- URL 쿼리 동기화: `/product?min=&max=&sort=&page=`

#### 절대 규칙(안전장치)

- `bindSizePills()` 로직은 **수정 금지**

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

- 결제 진행 조건: 기본 배송지 필요
- Cart에서 기본 배송지 요약 + 변경은 MyPage에서 수행
- 주문 저장 시 배송지 스냅샷 포함(주문 당시 주소 보존)

---

## 9) 전역 이벤트 위임(app.js)

- 로그인 상태 변경 시 owner 스위칭: `cart/coupon/order/address`
- `cartStore.subscribe()`로 헤더 뱃지/리스트 동기화
- SearchDrawer 브릿지: `app:searchDrawerClose`

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
- search drawer close bridge: `app:searchDrawerClose`

---

## 12) 멤버십(Membership) 단일 소스

- `src/utils/membership.js`
- `getMembershipSnapshot({ totalSpent, checkoutTotal })`

---

## 13) 마이페이지(MyPage)

- 내 정보 / 배송지 / 주문내역 / 주문·배송 / 회원등급 / 쿠폰·혜택
- 딥링크(탭/자동 액션) + 1회성 consume(`replaceState`)
- 주문/배송 탭: 상태 필터 + 타임라인 + 운송장 모달(MVP)

---

## 14) 승급 쿠폰 지급(Upgrade Reward)

- 점프 승급 시 중간 등급 포함 지급
- `couponStore.register(code)`로 중복 방지

---

## 15) 주문(Order) 시스템

- `orderStore.createOrder()`로 결제 후 주문 저장
- 상태 변경 + (확장) statusHistory 구조 지원

---

## 16) 결제 완료 페이지(Checkout Success)

- `/checkout/success?orderId=...`
- 주문 요약 + 주문 상품 리스트 + 멤버십 안내 + 배송지 스냅샷

---

## 17) 관리자(Admin) 운영툴 ✅ (P3)

경로: `/admin` (app.js에서 `requireAdmin` 가드 적용)

### 탭 구성

- 상품 관리 / 주문 관리 / 쿠폰/이벤트 / 감사 로그 / 백업/복구

### 상품 관리 ✅ (등록/수정/삭제 + 대/중분류 + 이미지 + 브랜드/태그)

#### 1) 대/중분류 연동

- `categoryMain` 변경 시 `categorySub` 옵션 자동 변경
- 리스트 필터: 검색/대분류/중분류/상태

#### 2) 이미지: URL + 파일 첨부 ✅

- 파일 첨부 시 DataURL(base64)로 변환 → `image`에 자동 반영
- 2MB 제한(로컬 저장 한계 대응)
- 허용 스킴: `data:image/*`, `blob:`, `http(s)`, 상대경로

#### 3) 최신순 정렬(기본) ✅

- `updatedAt desc` 우선, 동률이면 `createdAt desc`

#### 4) 브랜드/태그 + 브랜드 기반 ID 자동 ✅

- `slugifyBrand(brand)`로 브랜드 slug 생성
- `getNextIdByBrandSlug(slug)`로 다음 ID 발급  
  예: `nike-3`
- tags 자동 생성:
   - brand, brand lowercase
   - 뱃지: `HOT`, `베스트`, `신상`
   - (선택) categoryMain/categorySub

### 주문 관리 ✅

- 주문 조회 + 상태 변경 + 상세 보기 모달
- 상태 전이 검증 포함

### 쿠폰/이벤트 ✅

- 더미 생성 + 등록/수정/삭제 + 활성 토글 + 필터

### 감사 로그 ✅

- 관리자 액션 기록 + 로그 비우기 + 새로고침

### 백업/복구 ✅

- Export JSON 번들 생성
- Import JSON 덮어쓰기 복원(confirm 포함)

---

## 18) 품질/안정성 체크리스트(P2)

- 입력 검증: 상품/쿠폰/주문 상태 전이
- 안전 렌더링: `escapeHtml` + 이미지 allowlist + fallback
- 데이터 정규화: load 시 normalize/repair + `createdAt/updatedAt` 보장
- 운영 편의: 감사 로그 + Export/Import

---

## 19) 다음 작업 후보(TODO)

### P1. 관리자(Admin) 🧰 (기능 확장)

- 주문 상태 관리(ADMIN 전용)
- 이벤트/쿠폰 관리 관리자가 사용 가능한 쿠폰을 등록하면 일반유저들이 코드를 알시 쿠폰지급 + 쿠폰사용가능하게

### P2. 주문/배송 고도화 🚚 (현실감 강화)

- `statusHistory`를 orderStore에 “정식 반영”(최초 1회 기록 규칙)
- 취소 플로우(결제완료 상태에서 취소 가능) + 타임라인 반영
- 주문 후 배송지 변경 불가 정책/안내 문구 정리
