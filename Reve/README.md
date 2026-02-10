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
- [17.1) Admin 쿠폰 배포/유저 관리](#171-admin-쿠폰-배포유저-관리-운영툴-고도화)
- [17.2) Admin Users Patch](#172-admin-users-patch)
- [17.3) Admin 이벤트/쿠폰 운영 고도화](#173-admin-이벤트쿠폰-운영-고도화)
- [18) 품질/안정성 체크리스트(P2)](#18-품질안정성-체크리스트p2)
- [19) 다음 작업 후보(TODO)](#19-다음-작업-후보todo)
- [20) 진행률(체감)](#20-진행률체감)

---

## 0) 프로젝트 구조 개요

### 전역 진입점: `app.js`

- 라우터 및 레이아웃 조립
- 전역 UI 초기화(사이드바, 검색 드로어, 토스트, 인증 UI)
- 전역 이벤트 위임(상품 리스트 CTA, 장바구니 토글 등)
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
  상품 상세(장바구니, 바로구매)
- `src/pages/cart/index.js`  
  장바구니 + 쿠폰 + 결제(mock) + 멤버십/포인트/승급쿠폰 + 주문 저장 + 배송지 가드 + 배송지 요약 표시
- `src/pages/checkoutSuccess/index.js`  
  결제 완료 페이지(주문 요약, 등급, 포인트 안내)
- `src/pages/search/index.js`  
  검색 페이지(`/search?q=`) + 최근/추천 + 결과 렌더 + 필터/정렬/페이지네이션
- `src/pages/mypage/index.js`  
  마이페이지(내정보, 배송지 CRUD, 주문내역, 주문·배송, 등급, 쿠폰)
- `src/pages/admin/index.js`  
  관리자 운영 툴(상품/주문/쿠폰/감사로그/백업 + 주문 타임라인 + 유저 + 쿠폰 배포 + 이벤트/통계/원장)

### 스토어

- `src/store/authStore.js`  
  로그인 상태, 유저 persist (`totalSpent`, `points` 포함)
- `src/store/cartStore.js`  
  유저별 장바구니, 옵션 라인, 라인 병합
- `src/store/couponStore.js`  
  유저별 쿠폰 등록/적용/사용 처리, persist + owner 스위칭
- `src/store/orderStore.js`  
  유저별 주문 저장소, 결제 완료 시 주문 생성 + 주문 상태 관리(+ statusHistory 정식 반영)
- `src/store/addressStore.js`  
  유저별 배송지 CRUD, 기본 배송지 지정, persist + owner 스위칭
- `src/store/adminProductStore.js`  
  **Admin 상품 SSOT**: normalize/repair, createdAt/updatedAt 보장, 최신순 정렬, brand/tags 정규화, 이미지 업로드(DataURL)
- `src/store/adminOrderStore.js`, `src/store/adminCouponStore.js`  
  Admin 주문/쿠폰 운영 스토어
- `src/store/adminUserStore.js`  
  Admin 유저 조회/삭제(회원 탈퇴) 스토어

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
- `src/utils/orderTimeline.js` : statusHistory 파싱(toStatusTimeline) + label(statusKo)
- `src/utils/user/deriveUsers.js` : Admin Users 표시 파이프(검색/필터/정렬/누적구매 합산/등급 재계산)
- `src/utils/couponLedger.js` : ✅ 쿠폰 발급/사용 원장 + 통계
- `src/utils/couponTargeting.js` : ✅ 쿠폰 타겟팅 규칙
- `src/components/Toast.js` : 토스트
- `src/components/ConfirmModal.js` : 확인/취소 모달
- `src/components/ProductCard.js` : 상품 카드(장바구니 아이콘 + 태그 + 가격/할인 + 안전 이미지)

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
- `markUsed(code, meta?)` : 결제 시 사용 처리 (+ 사용 이력 기록)

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

### 카드 UX (ProductCard) ✅ (최신)

- **사이즈 UI 제거**: 상품 카드에서 사이즈 선택을 노출하지 않음
- **사이즈 없이 장바구니 담기 가능** (리스트 CTA 기준)
- 장바구니는 아이콘 버튼(하단 floating)
- 담김 상태 `.is-added` 유지
- 가격 표현:
   - 정가(`basePrice`) / 할인가(`price`) / 할인율(`discountRate`) 표시
   - 할인 표기 순서: **할인율 → 할인가 → 정가**

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
   - (현재는 사이즈 UI가 렌더되지 않아 이벤트가 발생하지 않음)

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

## 10) 상품 상세(ProductDetailPage) ✅ (최신)

- **사이즈 UI 제거**
- **사이즈 선택 가드 제거**: 상세에서도 사이즈 없이 장바구니/바로구매 가능
- 장바구니 담기 시 토스트
- 바로구매 시 “장바구니로 이동” confirm → 확인 시 `/cart`

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

### ✅ Admin 이벤트/쿠폰 확장 키(추가)

- coupon ledger: `reve_admin_coupon_ledger_v1`
   - type: `ISSUE`(발급) / `USE`(사용)
   - 최대 적재: (예) 2000개로 제한 가능

### 전역 커스텀 이벤트

- navigate: `app:navigate` (detail: `{ href }`)
- recent search sync: `recent-search:changed`
- search drawer close bridge: `app:searchDrawerClose`
- orders changed: `reve:orders-changed`
- coupon ledger changed: `reve:coupon-ledger-changed`

---

## 12) 멤버십(Membership) 단일 소스

- `src/utils/membership.js`
- `getMembershipSnapshot({ totalSpent, checkoutTotal })`

---

## 13) 마이페이지(MyPage) ✅ (최종 통합본 반영)

마이페이지를 “탭 기반 운영 화면”으로 구성하고, 스토어 구독으로 자동 동기화되도록 설계했습니다.

### 탭 구성

- 내 정보 / 배송지 / 주문내역 / 주문·배송 / 회원등급 / 쿠폰·혜택

### 딥링크(탭/자동 액션) 지원

- `/mypage?tab=address&open=add`
   - 배송지 추가 모달을 **1회 자동 오픈**
- `/mypage?tab=orders&open=detail&orderId=...`
   - 주문 상세 모달을 **1회 자동 오픈**
- `/mypage?tab=coupon&focus=register`
   - 쿠폰 입력창을 **1회 자동 포커스**

### UX 규칙(최종)

- 탭 클릭 시 URL의 `tab` 쿼리를 `pushState`로 동기화
- `popstate(뒤로/앞으로가기)`에서도 탭 + 딥링크 상태 복원
- `open/focus/orderId`는 1회 실행 후 URL에서 consume(`replaceState`)하여 **반복 트리거 방지**

### MyPage 최종 안정화 작업 기록 ✅

1. **전체 파일 완전 통합본으로 정리**

- `src/pages/mypage/index.js`를 “단일 파일”로 완전 통합(중간 함수 포함)
- 탭/렌더/이벤트/딥링크/모달/유틸 함수까지 한 덩어리로 유지

2. **딥링크 중복 트리거 방지 강화**

- `runDeepLinkOnce()` 가드(키 기반)로
   - `popstate` / 재렌더 / subscribe 타이밍에서 모달이 반복 실행되는 현상을 차단

3. **유저 주문내역에서 테스트 상태 변경 버튼 제거**

- 주문내역의 `배송 시작(테스트)` / `배송 완료(테스트)` 버튼 제거
- 유저 영역은 조회 전용
- 상태 변경은 Admin에서만 수행(권한 경계/UX 정합성 개선)

4. **구독 렌더 최적화(탭 기준)**

- store subscribe 시 현재 활성 탭 기준으로만 paint
   - 불필요한 DOM 갱신 감소
   - 딥링크 모달/포커스와의 충돌 가능성 최소화

---

## 14) 승급 쿠폰 지급(Upgrade Reward)

- 점프 승급 시 중간 등급 포함 지급
- `couponStore.register(code)`로 중복 방지

---

## 15) 주문(Order) 시스템 ✅ (statusHistory 정식 반영 완료)

- `orderStore.createOrder()`로 결제 후 주문 저장
- 주문 상태: `PAID | SHIPPING | DELIVERED | CANCELED`
- **statusHistory 정식 반영**
   - 상태 전환 순간의 타임스탬프를 `order.statusHistory`에 기록
      - `{ PAID, SHIPPING, DELIVERED, CANCELED } (ms)`
   - 단계별 최초 1회 기록 규칙을 **API 레벨(create/update)에서 강제**
   - 기존 데이터(히스토리 없는 주문)는 `readState()`에서 **1회 마이그레이션**
- 동기화 안정화
   - storage/reload 흐름은 `emit-only`
   - 실제 액션에서만 `persist + emit`

### (현실감 강화) 운송장/배송조회 템플릿 ✅

- MyPage “주문/배송” 탭에서
   - 운송장 코드 템플릿: `REVE-xxxxxx` (orderId tail 기반)
   - “배송조회” 모달 제공(택배사 연동 없이 UI 템플릿만)

---

## 16) 결제 완료 페이지(Checkout Success)

- `/checkout/success?orderId=...`
- 주문 요약 + 주문 상품 리스트 + 멤버십 안내 + 배송지 스냅샷

---

## 17) 관리자(Admin) 운영툴 ✅ (P3)

경로: `/admin` (app.js에서 `requireAdmin` 가드 적용)

### 탭 구성

- 상품 관리 / 주문 관리 / 주문 타임라인 / 쿠폰/이벤트 / 유저 / 감사 로그 / 백업/복구

### 상품 관리 ✅ (등록/수정/삭제 + 대/중분류 + 이미지 + 브랜드/태그 + 할인)

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

#### 5) 할인율(discountRate) + 정가 자동 계산 ✅

- 상품 등록/수정 폼에 `discountRate(0~1)` 추가
- 판매가(price) + 할인율 입력 시 정가(basePrice) 자동 계산
- validate 단계에서 discountRate 정규화/범위 검증

### 주문 관리 ✅

- 주문 조회 + 상태 변경 + 상세 보기 모달(상태 이력 표시)
- 취소 정책 반영: **PAID에서만 취소 버튼 활성화**
- 상태 변경 즉시 동기화(`reve:orders-changed`)

### 주문 타임라인 ✅

- 주문 statusHistory를 toStatusTimeline으로 파싱해 최신순 리스트 표시
- 새로고침 버튼/paintTimeline 렌더 플로우

### 쿠폰/이벤트 ✅

- 등록/수정/삭제 + 활성 토글 + 필터
- 운영 쿠폰이 storefront 등록 로직에 연결됨(운영 쿠폰 우선)

### 감사 로그 ✅

- 관리자 액션 기록 + 로그 비우기 + 새로고침

### 백업/복구 ✅

- Export JSON 번들 생성
- Import JSON 덮어쓰기 복원(confirm 포함)

---

## 17.1) Admin 쿠폰 배포/유저 관리 (운영툴 고도화)

### 유저 탭(Users)

- localStorage `reve_users_v1` 기반으로 유저 리스트/ROLE/GRADE/POINTS/TOTAL SPENT 조회
- 검색/등급 필터/정렬 제공
- 누적 구매(`totalSpent`)는 **주문 저장소 합산값이 정답 루트**
   - `adminOrderStore.getAllOrders()`의 `__ownerKey` 기준 합산

### 쿠폰 배포(Distribute)

- 배포 방식:
   - 전체 지급(ALL)
   - 특정 등급 지급(GRADE)
   - 특정 유저 지급(USER: userIds 쉼표 입력)
- 지급 방식:
   - 각 유저의 쿠폰 저장소 `reve_coupons_v1:<ownerKey>`에 직접 upsert
   - 동일 code 중복 지급 방지(이미 보유 시 skip)
- 감사로그 기록: `COUPON_DISTRIBUTE`

---

## 17.2) Admin Users Patch ✅ (완료)

관리자(Admin) 페이지의 **유저 탭**을 “정답 데이터 루트” 기준으로 정리하고,  
정렬/표시 버그를 수정했으며 **POINTS 동기화 안정화 + 회원 탈퇴(삭제) UI**까지 최종 연결했습니다.

### ✅ 최종 설계 (현재 코드 기준)

- **users 원본:** `adminUserStore.getUsers()` (`reve_users_v1`)
- **누적 구매(totalSpent) 정답 루트:** `adminOrderStore.getAllOrders()`의 `__ownerKey` 기준 합산
- **표시/검색/필터/정렬:** `deriveUsers()`에서 파이프 처리
- **등급(grade):** 합산된 `totalSpent` 기준으로 재계산

### 변경 사항

#### 1) `src/utils/user/deriveUsers.js`

- ✅ 정렬 버그 수정
   - `sortDir`(asc/desc)가 뒤집히지 않도록 `dirMul` 방식으로 정리
   - 숫자 필드 강제 숫자 정렬: `totalSpent`, `points`, `createdAt`, `updatedAt`
   - 문자열 필드 강제 문자열 정렬: `id`, `username`, `role`, `grade`
- ✅ 표시 안정화
   - `points`가 0/누락으로 보이는 케이스 방어(숫자 변환/기본값 처리)
- ✅ 등급 계산 기준 통일(정답)
   - 등급은 user 저장값이 아니라 주문 합산 `totalSpent` 기준으로 재계산

#### 2) `src/store/adminUserStore.js`

- ✅ 회원 탈퇴(삭제) API 추가
   - `remove(id)` 추가
   - `reve_users_v1` 배열에서 해당 유저 제거
   - 삭제 성공/실패 결과 `{ ok, message, removedId }` 반환
- ✅ UI 갱신 대응
   - `subscribe/emit` 구조 추가(선택적 사용)
   - remove 실행 시 emit 호출로 화면 갱신 트리거 가능

#### 3) `src/pages/admin/index.js`

- ✅ 회원 탈퇴 UI 액션 연결
   - 테이블 버튼 → confirm → store.remove → toast → repaint
   - ADMIN 계정 보호(버튼 disabled + 이중 방어)

---

## 17.3) Admin 이벤트/쿠폰 운영 고도화 ✅

> “운영자가 실제로 굴릴 수 있는” 쿠폰/이벤트 운영을 목표로  
> **타겟팅 규칙 + 발급 이력 + 사용 이력 + 사용 통계**를 Admin에 정식 탑재.

### ✅ 기능 요약

1. **타겟팅 규칙(Targeting Rules)**

- 배포 모드 확장
   - `ALL`: 전체 지급
   - `GRADE`: 특정 등급 지급
   - `USER`: 특정 유저 id 목록 지급
- 조건형 필터(AND로 적용)
   - `minPoints`: 최소 보유 포인트
   - `minTotalSpent`: 최소 누적 구매
   - `joinedAfter / joinedBefore`: 가입 기간 필터(ms 기준)
   - (기존) `minOrderTotal`: 최소 주문금액 조건은 쿠폰 자체 정책으로 유지

2. **발급 원장(ISSUE Ledger)**

- “누가(OwnerKey) / 어떤 쿠폰을 / 언제 / 어떤 타겟팅으로” 지급받았는지 기록
- 중복 지급 방지(이미 보유 시 skip) 결과도 배포 결과(granted/skipped)로 확인

3. **사용 원장(USE Ledger)**

- 결제 성공 시 `couponStore.markUsed(code, meta)`를 통해 사용 기록 저장
- meta 예시: `{ orderId, total }`

4. **사용 통계(Stats)**

- 기간 선택: `ALL / 7D / 30D`
- 집계:
   - 총 발급수, 총 사용수, 사용률
   - 쿠폰별 발급/사용/사용률 Top 리스트

### ✅ 데이터 설계 (storage)

- ledger key: `reve_admin_coupon_ledger_v1`
- row type:
   - `ISSUE`: `{ type, at, ownerKey, couponCode, mode, meta(targeting) }`
   - `USE`: `{ type, at, ownerKey, couponCode, orderId, total, meta }`
- 원장 변경 이벤트:
   - `reve:coupon-ledger-changed`

### ✅ Admin UI 동작

- Admin 쿠폰/이벤트 탭에서:
   - 통계 패널(기간 선택 + 새로고침)
   - 원장 테이블(최근순)
   - 원장 비우기(Confirm 포함 가능)
- 운영 효율:
   - “배포 후 실제 사용률”을 숫자로 확인 가능
   - 타겟팅 정책을 점진적으로 강화 가능

---

## 18) 품질/안정성 체크리스트(P2)

- 입력 검증: 상품/쿠폰/주문 상태 전이
- 안전 렌더링: `escapeHtml` + 이미지 allowlist + fallback
- 데이터 정규화: load 시 normalize/repair + `createdAt/updatedAt` 보장
- 운영 편의: 감사 로그 + Export/Import
- ✅ 운영 데이터 가시성: 쿠폰 ledger + stats 추가

---

## 19) 다음 작업 후보(TODO)

> 완료된 항목은 제거하고, 남은 것만 유지

### P3. 운영/안정성 🌿

- localStorage 용량 한계 대응(이미지 업로더 어댑터: Firebase/S3 등으로 교체)
- import/export 스키마 버전업 및 마이그레이션 가이드
- 에러 리포팅(개발 모드 로그/프로덕션 최소 로그)

(선택) 더 고도화하고 싶을 때

- 운송장/택배사 “실데이터 필드” 추가 + 실제 조회 링크(택배사 URL) 연동
- 주문 상태 전이 validate를 user store에도 공통 유틸로 적용(권한 액션이 없으면 생략 가능)

---

## 20) 진행률(체감)

**현재 작업 완료도: 약 95~97%** ✅

- ✅ 핵심 쇼핑몰 흐름(검색 → 상품 → 장바구니 → 쿠폰 → 결제(mock) → 주문 → 마이페이지) 완성
- ✅ orderStore: statusHistory 정식 반영(최초 1회 기록 + 마이그레이션 + 동기화 루프 방지) 완료
- ✅ MyPage 최종 통합/안정화(딥링크 1회 실행 가드 + 유저 주문 상태 변경 제거 + 탭 기준 렌더 최적화) 완료
- ✅ Admin 운영툴(상품/주문/쿠폰/감사/백업 + 타임라인 + 유저/배포/탈퇴 + 원장/통계) 완성
- ⏳ 남은 건 “운영 안정화” 영역
   - 저장소 용량/백업 스키마/리포팅 등 운영 안정성 강화
