/**
 * =============================================
 * 📍 위치: app.js
 * 역할: 앱 진입점(Entry)
 * - 라우터/레이아웃 조립
 * - 전역 UI 초기화 (Sidebar/SearchDrawer/Toast/AuthUi)
 * - 전역 이벤트 위임 (상품 카드: 사이즈 선택/장바구니 토글)
 *
 * ✅ 안정성/UX 포인트
 * 1) 모든 render/afterRender 패턴 통일
 * 2) requireAuth redirectTo: pathname + search 포함
 * 3) 상품 카드 "제거"는 productId의 모든 라인 제거(멀티 사이즈 대비)
 * =============================================
 */

import { Header } from './src/components/Header.js';
import { Footer, initFooter } from './src/components/Footer.js';
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
   - #app에 레이아웃 HTML 주입
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
   - Header / Main / Footer 구성
============================== */
function layout(pageHtml) {
   return `
    ${Header()}
    <main class="app-main" aria-label="Main Content">
      ${pageHtml}
    </main>
    ${Footer()}
  `;
}

/* ==============================
   2) 라우트 등록
   - render: HTML 반환
   - afterRender: DOM 바인딩/데이터 패치
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
         const ok = requireAdmin({ redirectTo: '/admin' });
         if (!ok) return;
         initAdminPage();
      },
   },

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

// 전역 UI는 1회만 초기화
initSidebar();
const searchDrawer = initSearchDrawer();
const toast = initToast();
const authUi = initAuthUi();

/* ==============================
   4) SearchDrawer 외부 제어 브릿지
   - window.dispatchEvent(new CustomEvent('app:searchDrawerClose'))
============================== */
window.addEventListener('app:searchDrawerClose', () => {
   searchDrawer?.close?.();
});

/* ==============================
   5) UI 상태 갱신 유틸
============================== */
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

/* ==============================
   6) ProductCard UI 동기화(사이즈/담김)
   ⚠️ 사용자 요청: product/index.js의 bindSizePills()는
      건드리지 않는 방향 유지
============================== */
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

function getCartLines(productId) {
   return cartStore.getItemsByProductId?.(productId) ?? [];
}

function getCartSizeForProduct(productId) {
   const lines = getCartLines(productId);
   const first = lines[0];
   return {
      hasAny: lines.length > 0,
      key: first?.key || '',
      size: String(first?.options?.size || '').trim(),
   };
}

function removeProductLines(productId) {
   const lines = getCartLines(productId);
   lines.forEach((line) => {
      if (line?.key) cartStore.remove?.(line.key);
   });
}

function syncProductCardsWithCart() {
   const cards = document.querySelectorAll('[data-product-id]');
   if (!cards.length) return;

   cards.forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;

      const favBtn = card.querySelector('[data-add-cart]');
      const inCart = cartStore.hasLine?.(productId) ?? false;
      if (favBtn) favBtn.classList.toggle('is-added', inCart);

      const hasPills = Boolean(card.querySelector('[data-size-pill]'));
      if (!hasPills) return;

      const cartInfo = getCartSizeForProduct(productId);

      if (cartInfo.hasAny && cartInfo.size)
         setCardSelectedSize(card, cartInfo.size);
      else setCardSelectedSize(card, '');

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
   7) 회원가입 후 메인에서 웰컴 모달(1회)
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
   const coupon = data?.coupon;
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
   8) 렌더 후 훅 (라우팅마다 실행)
============================== */
window.addEventListener('app:render', () => {
   searchDrawer?.refresh?.();
   updateCartCount();
   authUi?.refresh?.();

   runAfterSignupModalIfNeeded();
   syncProductCardsWithCart();

   initFooter();
});

// 최초 1회
updateCartCount();
authUi?.refresh?.();

/* ==============================
   9) authStore 구독: owner 전환 + 토스트
============================== */
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

   if (owner !== prevOwner) {
      cartStore.setOwner(owner);
      couponStore.setOwner(owner);
      orderStore.setOwner(owner);
      addressStore.setOwner(owner);
      prevOwner = owner;
   }

   if (!prevLogin && nowLogin)
      toast.show(`${u?.name || '사용자'}님 환영합니다 👋`, { duration: 1400 });
   if (prevLogin && !nowLogin) toast.show('로그아웃 완료', { duration: 1400 });

   prevLogin = nowLogin;
});

cartStore.subscribe(() => {
   updateCartCount();
   syncProductCardsWithCart();
});

/* ==============================
   10) 전역 이벤트 위임 (상품 카드)
============================== */
document.addEventListener('click', async (e) => {
   /* ------------------------------
     A) 사이즈 pill 클릭
  ------------------------------ */
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

      if (currentSelected === picked) {
         const cartInfo = getCartSizeForProduct(productId);
         if (cartInfo.hasAny && cartInfo.size) {
            setCardSelectedSize(card, cartInfo.size);
            return;
         }
         setCardSelectedSize(card, '');
         return;
      }

      const cartInfo = getCartSizeForProduct(productId);
      if (cartInfo.hasAny && cartInfo.size && cartInfo.size !== picked) {
         const ok = await confirmModal({
            title: '사이즈 변경',
            message: `현재 담긴 사이즈는 ${cartInfo.size}예요.\n${picked}로 변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });

         if (!ok) {
            setCardSelectedSize(card, cartInfo.size);
            return;
         }

         cartStore.updateOptions?.(cartInfo.key, { size: picked });
         setCardSelectedSize(card, picked);
         syncProductCardsWithCart();
         toast.show('사이즈가 변경됐어요', { duration: 1400 });
         return;
      }

      setCardSelectedSize(card, picked);
      return;
   }

   /* ------------------------------
     B) 장바구니 아이콘 클릭
  ------------------------------ */
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!card || !productId) return;

   const redirectTo = window.location.pathname + window.location.search;
   const okAuth = requireAuth({ redirectTo: redirectTo || '/product' });
   if (!okAuth) return;

   const hasSizePills = Boolean(card.querySelector('[data-size-pill]'));
   const selectedSize = String(
      card.getAttribute('data-selected-size') || '',
   ).trim();
   const cartInfo = getCartSizeForProduct(productId);

   if (cartInfo.hasAny && !selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   if (hasSizePills && !selectedSize) {
      toast.show('사이즈를 선택한 뒤 장바구니에 담아 주세요 👟', {
         duration: 1400,
      });
      return;
   }

   if (cartInfo.hasAny && cartInfo.size === selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   if (cartInfo.hasAny && cartInfo.size && cartInfo.size !== selectedSize) {
      const ok = await confirmModal({
         title: '사이즈 변경',
         message: `현재 담긴 사이즈는 ${cartInfo.size}예요.\n${selectedSize}로 변경할까요?`,
         confirmText: '변경',
         cancelText: '취소',
      });

      if (!ok) {
         setCardSelectedSize(card, cartInfo.size);
         return;
      }

      cartStore.updateOptions?.(cartInfo.key, { size: selectedSize });
      syncProductCardsWithCart();
      toast.show('사이즈가 변경됐어요', { duration: 1400 });
      return;
   }

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

   btn.classList.add('is-pulse');
   setTimeout(() => btn.classList.remove('is-pulse'), 400);
});
