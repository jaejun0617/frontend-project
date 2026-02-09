/**
 * =============================================
 * 📍 위치: app.js
 * 역할: 앱 진입점(Entry)
 * - 라우터/레이아웃 조립
 * - 전역 UI 초기화 (Sidebar/SearchDrawer/Toast/AuthUi)
 * - 전역 이벤트 위임 (상품 카드: 사이즈 선택/장바구니 토글)
 *
 * ✅ 이번 수정 포인트(안정성/UX)
 * 1) /checkout/success 라우트 render/afterRender 패턴 통일
 * 2) requireAuth redirectTo: pathname + search(쿼리)까지 포함
 * 3) 상품 카드에서 "제거"는 상품 라인의 key 1개가 아니라
 *    같은 productId 라인을 모두 제거(멀티 사이즈 담김 대비)
 * =============================================
 */

import { Header } from './src/components/Header.js';
import { Footer } from './src/components/Footer.js';

// Pages
import { HomePage } from './src/pages/home/index.js';
import { SearchPage, initSearchPage } from './src/pages/search/index.js';
import { ProductPage, initProductPage } from './src/pages/product/index.js';
import {
   ProductDetailPage,
   initProductDetailPage,
} from './src/pages/productDetail/index.js';
import { CartPage, initCartPage } from './src/pages/cart/index.js';
import { MyPage, initMyPage } from './src/pages/mypage/index.js';
import { AuthPage, initAuthPage } from './src/pages/auth/index.js';
import { AdminPage, initAdminPage } from './src/pages/admin/index.js';
import {
   CheckoutSuccessPage,
   initCheckoutSuccessPage,
} from './src/pages/checkoutSuccess/index.js';

// Utils
import { initSidebar } from './src/utils/sidebar.js';
import { initSearchDrawer } from './src/utils/searchDrawer.js';
import { initRouter } from './src/utils/router.js';
import { requireAuth, requireAdmin } from './src/utils/guards.js';
import { initAuthUi } from './src/utils/authUi.js';

// Stores / Components
import { cartStore } from './src/store/cartStore.js';
import { authStore } from './src/store/authStore.js';
import { initToast } from './src/components/Toast.js';
import { confirmModal } from './src/components/ConfirmModal.js';
import { couponStore } from './src/store/couponStore.js';
import { orderStore } from './src/store/orderStore.js';
import { addressStore } from './src/store/addressStore.js';
/* ==============================
   0) DOM 마운트 유틸
   ============================== */

function mount(html) {
   const mountEl = document.querySelector('#app');
   if (!mountEl) {
      throw new Error(
         '[app] #app 엘리먼트를 찾지 못했어. index.html에 <div id="app"></div>가 필요해!',
      );
   }
   mountEl.innerHTML = html;
}

/* ==============================
   1) 공통 레이아웃
   ============================== */

function layout(pageHtml) {
   return `
      ${Header()}
      <main class='app-main' aria-label='Main Content'>
        ${pageHtml}
      </main>
      ${Footer()}
   `;
}

/* ==============================
   2) 라우트 등록
   ============================== */

const routes = {
   '/': { render: () => HomePage() },

   '/product': {
      render: () => ProductPage(),
      afterRender: () => initProductPage(),
   },

   '/product/:id': {
      render: () => ProductDetailPage(),
      afterRender: (params) => initProductDetailPage(params),
   },

   '/search': {
      render: () => SearchPage(),
      afterRender: () => initSearchPage(),
   },

   '/cart': {
      render: () => CartPage(),
      afterRender: () => initCartPage(),
   },

   '/auth': {
      render: () => AuthPage(),
      afterRender: () => initAuthPage(),
   },

   '/mypage': {
      render: () => MyPage(),
      afterRender: () => {
         const redirectTo = window.location.pathname + window.location.search;
         const ok = requireAuth({ redirectTo });
         if (!ok) return;
         initMyPage();
      },
   },

   '/admin': {
      render: () => AdminPage(),
      afterRender: () => {
         // ✅ 관리자만 접근
         const ok = requireAdmin({ redirectTo: '/admin' });
         if (!ok) return;
         initAdminPage();
      },
   },

   // ✅ 결제 완료 페이지 (패턴 통일: render는 항상 "함수 호출" 형태)
   '/checkout/success': {
      render: () => CheckoutSuccessPage(),
      afterRender: () => initCheckoutSuccessPage(),
   },

   '/404': {
      render: () =>
         "<section class='page'><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>",
   },
};

/* ==============================
   3) 앱 시작 (Router & Global UI)
   ============================== */

initRouter({ mount, layout, routes });

// 전역 UI는 1회만 초기화 (라우팅이 바뀌어도 유지)
initSidebar();
const searchDrawer = initSearchDrawer();
const toast = initToast();
const authUi = initAuthUi();

/* =====================================================================
   ✅ SearchDrawer 외부 제어 브릿지
   - SearchPage 등에서 import 없이도 drawer를 닫을 수 있게
   - window.dispatchEvent(new CustomEvent('app:searchDrawerClose'))
   ===================================================================== */

window.addEventListener('app:searchDrawerClose', () => {
   // 안전하게: 함수 존재할 때만
   searchDrawer?.close?.();
});

/* ==============================
   4) UI 상태 갱신 유틸
   ============================== */

/**
 * ✅ 장바구니 카운트 뱃지 갱신
 */
function updateCartCount() {
   const count = cartStore.getCount();
   const badgeEls = document.querySelectorAll('[data-cart-count]');

   badgeEls.forEach((el) => {
      if (count <= 0) {
         el.hidden = true;
         el.textContent = '0';
         return;
      }
      el.hidden = false;
      el.textContent = String(count);
   });
}

/**
 * ✅ 카드 UI: 선택된 사이즈를 dataset + pill active에 반영
 * - value='' 이면 "선택 없음" 상태
 */
function setCardSelectedSize(cardEl, value) {
   const next = String(value || '').trim();
   cardEl.setAttribute('data-selected-size', next);

   const pills = cardEl.querySelectorAll('[data-size-pill]');
   pills.forEach((btn) => {
      const v = String(btn.getAttribute('data-size-value') || '').trim();
      const isOn = Boolean(next) && v === next;

      btn.classList.toggle('is-active', isOn);
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
   });
}

/**
 * ✅ 장바구니에서 특정 productId 라인들 조회
 */
function getCartLines(productId) {
   return cartStore.getItemsByProductId?.(productId) ?? [];
}

/**
 * ✅ 상품당 "현재 담긴 사이즈"를 1개 기준으로 반환
 * - 리스트 UX: 대표 1라인만 카드에 표시(현재 구조)
 */
function getCartSizeForProduct(productId) {
   const lines = getCartLines(productId);
   const first = lines[0];
   return {
      hasAny: lines.length > 0,
      key: first?.key || '',
      size: String(first?.options?.size || '').trim(),
   };
}

/**
 * ✅ (중요) 상품 카드에서 "제거"는 상품의 특정 key 1개만 지우면
 * 멀티 라인(사이즈 여러개 담김)에서 사용자가 혼란스러울 수 있음.
 * 그래서 같은 productId의 모든 라인을 지우는 헬퍼를 둔다.
 */
function removeProductLines(productId) {
   const lines = getCartLines(productId);
   lines.forEach((line) => {
      if (line?.key) cartStore.remove?.(line.key);
   });
}

/**
 * ✅ 상품 카드 "담김 상태" 동기화
 * - 장바구니에 있으면 아이콘 빨강(is-added)
 * - 담긴 사이즈가 있으면 해당 pill도 active로 맞춤
 * - 담긴 게 없으면 기본 선택 없음(= active 없음)
 */
function syncProductCardsWithCart() {
   const cards = document.querySelectorAll('[data-product-id]');
   if (!cards.length) return;

   cards.forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;

      const favBtn = card.querySelector('[data-add-cart]');
      const inCart = cartStore.hasLine?.(productId) ?? false;

      if (favBtn) favBtn.classList.toggle('is-added', inCart);

      // 사이즈 pill이 있는 카드라면 "담긴 사이즈"를 active로 표시
      const hasPills = Boolean(card.querySelector('[data-size-pill]'));
      if (!hasPills) return;

      const cartInfo = getCartSizeForProduct(productId);

      if (cartInfo.hasAny && cartInfo.size) {
         // 담긴 사이즈를 UI에 표시 (리스트에서도 내가 뭘 담았는지 보이게)
         setCardSelectedSize(card, cartInfo.size);
      } else {
         // 기본값 선택 없음
         setCardSelectedSize(card, '');
      }

      // (선택) 담긴 사이즈 pill에 추가 표시(원하면 CSS로 점/테두리)
      const lines = getCartLines(productId);
      const sizesInCart = new Set(
         lines
            .map((it) => String(it?.options?.size || '').trim())
            .filter(Boolean),
      );

      card.querySelectorAll('[data-size-pill]').forEach((pill) => {
         const v = String(pill.getAttribute('data-size-value') || '').trim();
         pill.classList.toggle('is-in-cart', sizesInCart.has(v));
      });
   });
}

/* ==============================
   5) 회원가입 후 메인에서 모달 띄우기
   ============================== */

let didRunSignupModal = false;

function runAfterSignupModalIfNeeded() {
   if (didRunSignupModal) return;

   const raw = sessionStorage.getItem('reve_after_signup_modal');
   if (!raw) return;

   sessionStorage.removeItem('reve_after_signup_modal');
   didRunSignupModal = true;

   let data = null;
   try {
      data = JSON.parse(raw);
   } catch {
      return;
   }

   const name = data?.name || '고객';
   const coupon = data?.coupon; // {title, code, rateText}
   const delayMs = Number(data?.delayMs ?? 0);
   const confirmHref = String(data?.confirmHref || '/mypage');

   setTimeout(async () => {
      const message = coupon
         ? `${name}님, 가입을 환영합니다 ✨\n\n🎫 ${coupon.title}이 지급되었어요.\n• 코드: ${coupon.code}\n• 혜택: ${coupon.rateText}\n\n지금 마이페이지 쿠폰함에서 확인할까요?`
         : `${name}님, 가입을 환영합니다 ✨\n\n마이페이지에서 혜택을 확인할 수 있어요.\n지금 이동할까요?`;

      const ok = await confirmModal({
         title: '가입 완료 🎉',
         message,
         confirmText: '쿠폰함 보기',
         cancelText: '나중에',
      });

      if (ok) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: confirmHref } }),
         );
      }
   }, delayMs);
}

/* ==============================
   6) 렌더 후 훅 (라우팅마다 실행)
   ============================== */

window.addEventListener('app:render', () => {
   // 새로 렌더된 DOM 기준으로 갱신
   searchDrawer.refresh();
   updateCartCount();
   authUi.refresh();

   runAfterSignupModalIfNeeded();

   // 상품 리스트가 새로 렌더되면 "담김 상태"도 다시 맞춰야 함
   syncProductCardsWithCart();
});

// 최초 1회
updateCartCount();
authUi.refresh();

/* ==============================
   7) authStore 구독: owner 전환 + 토스트
   ============================== */

// ✅ 앱 시작 시 현재 유저 기준 owner 세팅(1회)
{
   const u = authStore.getUser?.();
   const owner = u?.id || 'guest';
   cartStore.setOwner(owner);
   couponStore.setOwner(owner);
   orderStore.setOwner(owner);
   addressStore.setOwner(owner);
}

let prevLogin = authStore.isLoggedIn();
let prevOwner = authStore.getUser?.()?.id || 'guest';

authStore.subscribe(() => {
   const nowLogin = authStore.isLoggedIn();
   const u = authStore.getUser?.();
   const owner = u?.id || 'guest';

   // ✅ owner가 바뀔 때만 스토어 스위칭
   if (owner !== prevOwner) {
      cartStore.setOwner(owner);
      couponStore.setOwner(owner);
      orderStore.setOwner(owner);
      addressStore.setOwner(owner);
      prevOwner = owner;
   }

   // ✅ 로그인/로그아웃 토스트
   if (!prevLogin && nowLogin) {
      toast.show(`${u?.name || '사용자'}님 환영합니다 👋`, { duration: 1400 });
   }
   if (prevLogin && !nowLogin) {
      toast.show('로그아웃 완료', { duration: 1400 });
   }

   prevLogin = nowLogin;
});

// ✅ 장바구니 변화 시: 카운트 + 리스트 카드 상태 동기화
cartStore.subscribe(() => {
   updateCartCount();
   syncProductCardsWithCart();
});

/* ==============================
   8) 전역 이벤트 위임 (상품 카드)
   - (A) 사이즈 pill 클릭
   - (B) 장바구니 아이콘 클릭 (토글 + 사이즈 변경 모달)
   ============================== */

document.addEventListener('click', async (e) => {
   /* ==============================
      A) 사이즈 pill 클릭
      - 담긴 상태에서 다른 사이즈 클릭하면 "변경 모달" 후 반영
      ============================== */
   const pill = e.target.closest('[data-size-pill]');
   if (pill) {
      const card = pill.closest('[data-product-id]');
      if (!card) return;

      const productId = card.getAttribute('data-product-id');
      if (!productId) return;

      const picked = String(pill.getAttribute('data-size-value') || '').trim();
      if (!picked) return;

      const currentSelected = String(
         card.getAttribute('data-selected-size') || '',
      ).trim();

      // 같은 사이즈를 다시 누르면 "선택 해제" (실수 방지/UX)
      if (currentSelected === picked) {
         // 단, 이미 장바구니에 담긴 상태라면 "선택 해제"보다 "담긴 사이즈 유지"가 더 안전함
         const cartInfo = getCartSizeForProduct(productId);
         if (cartInfo.hasAny && cartInfo.size) {
            setCardSelectedSize(card, cartInfo.size);
            return;
         }
         // 담긴 게 없으면 선택 해제 허용
         setCardSelectedSize(card, '');
         return;
      }

      // 장바구니에 이미 담긴 상태에서 다른 사이즈를 클릭한 경우 → 변경 모달
      const cartInfo = getCartSizeForProduct(productId);
      if (cartInfo.hasAny && cartInfo.size && cartInfo.size !== picked) {
         const ok = await confirmModal({
            title: '사이즈 변경',
            message: `현재 담긴 사이즈는 ${cartInfo.size}예요.\n${picked}로 변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });

         if (!ok) {
            // 취소면 담긴 사이즈로 되돌림
            setCardSelectedSize(card, cartInfo.size);
            return;
         }

         // ✅ 옵션 변경 + 병합까지 cartStore가 처리
         cartStore.updateOptions?.(cartInfo.key, { size: picked });

         // ✅ UI 동기화
         setCardSelectedSize(card, picked);
         syncProductCardsWithCart();

         toast.show('사이즈가 변경됐어요', { duration: 1400 });
         return;
      }

      // 장바구니에 없거나(혹은 담긴 사이즈가 비어있으면) 그냥 선택만
      setCardSelectedSize(card, picked);
      return;
   }

   /* ==============================
      B) 장바구니 아이콘 클릭 (토글)
      - 1회: 담기
      - 2회: 취소(삭제)
      - 담긴 상태에서 사이즈 다르면: 변경 모달 후 변경
      ============================== */
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!card || !productId) return;

   // ✅ 로그인 가드 (redirectTo는 쿼리까지 포함하는 게 안전)
   const redirectTo = window.location.pathname + window.location.search;
   const okAuth = requireAuth({
      redirectTo: redirectTo || '/product',
   });
   if (!okAuth) return;

   const hasSizePills = Boolean(card.querySelector('[data-size-pill]'));
   const selectedSize = String(
      card.getAttribute('data-selected-size') || '',
   ).trim();
   const cartInfo = getCartSizeForProduct(productId);

   /**
    * ✅ 정책: 이미 담긴 상태에서 "선택 사이즈가 비어있으면"
    * - 사용자는 사이즈를 다시 고르지 않아도 "그냥 제거"가 가능해야 한다.
    * - 단, 멀티 라인(사이즈 여러개)일 수 있으므로 productId 라인을 전부 제거
    */
   if (cartInfo.hasAny && !selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   // ✅ 사이즈가 필요한 상품인데 선택이 없으면 담기 차단
   if (hasSizePills && !selectedSize) {
      toast.show('사이즈를 선택한 뒤 장바구니에 담아 주세요 👟', {
         duration: 1400,
      });
      return;
   }

   /**
    * ✅ 이미 담긴 상태에서 같은 사이즈면 → 제거
    * - 멀티 라인 가능성 때문에 "해당 상품 라인 전체 제거"가 UX상 더 직관적
    */
   if (cartInfo.hasAny && cartInfo.size === selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   // ✅ 이미 담긴 상태에서 사이즈가 다르면 → 변경 모달
   if (cartInfo.hasAny && cartInfo.size && cartInfo.size !== selectedSize) {
      const ok = await confirmModal({
         title: '사이즈 변경',
         message: `현재 담긴 사이즈는 ${cartInfo.size}예요.\n${selectedSize}로 변경할까요?`,
         confirmText: '변경',
         cancelText: '취소',
      });

      if (!ok) {
         // 취소면 장바구니 사이즈로 되돌리기
         setCardSelectedSize(card, cartInfo.size);
         return;
      }

      cartStore.updateOptions?.(cartInfo.key, { size: selectedSize });
      syncProductCardsWithCart();
      toast.show('사이즈가 변경됐어요', { duration: 1400 });
      return;
   }

   // ✅ 장바구니에 없으면 담기
   const result = await cartStore.addById(productId, 1, {
      ...(selectedSize ? { size: selectedSize } : {}),
   });

   if (!result?.ok) {
      toast.show(result?.message || '장바구니 담기에 실패했어요.', {
         duration: 1400,
      });
      return;
   }

   toast.show(
      selectedSize
         ? `장바구니에 담겼어요 · 사이즈 ${selectedSize}`
         : '장바구니에 담겼어요',
      { duration: 1400 },
   );

   syncProductCardsWithCart();

   // (선택) 짧은 피드백 애니메이션용 클래스
   btn.classList.add('is-pulse');
   setTimeout(() => btn.classList.remove('is-pulse'), 400);
});
