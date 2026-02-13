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
 *
 * ✅ 이번 수정 핵심
 * - 홈 afterRender에서 initHomePage() 단일 엔트리 호출
 *   (CTA / 히어로 / 상품 / 웰컴 쿠폰 링크가 한 번에 초기화되도록)
 * - 홈 CTA(/auth 고정) 문제 방지: initHomePage 내부에서 authStore 기반으로 href/클릭 라우팅 처리
 * =============================================
 */

import { Header } from './src/components/Header.js';
import { Footer, initFooter } from './src/components/Footer.js';

// Pages
import { HomePage } from './src/pages/home/index.js';
import { initHomePage } from './src/pages/home/init.js';

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

/* =========================================================
   0) DOM 마운트 유틸
   - #app에 레이아웃 HTML 주입
========================================================= */
function mount(html) {
   const mountEl = document.querySelector('#app');
   if (!mountEl) {
      throw new Error(
         '[app] #app 엘리먼트를 찾지 못했어. index.html에 <div id="app"></div>가 필요해!',
      );
   }
   mountEl.innerHTML = html;
}

/* =========================================================
   1) 공통 레이아웃
   - Header / Main / Footer 구성
========================================================= */
function layout(pageHtml) {
   return `
    ${Header()}
    <main class="app-main" aria-label="Main Content">
      ${pageHtml}
    </main>
    ${Footer()}
  `;
}

/* =========================================================
   2) 라우트 등록
   - render: HTML 반환
   - afterRender: DOM 바인딩/데이터 패치
========================================================= */
const routes = {
   /* ------------------------------
      HOME
      - ✅ initHomePage()로 통합 호출
      - (Hero / Featured / Welcome CTA)
   ------------------------------ */
   '/': {
      render: () => HomePage(),
      afterRender: () => {
         initHomePage();
      },
   },

   /* ------------------------------
      PRODUCT LIST
   ------------------------------ */
   '/product': {
      render: () => ProductPage(),
      afterRender: () => initProductPage(),
   },

   /* ------------------------------
      PRODUCT DETAIL
   ------------------------------ */
   '/product/:id': {
      render: () => ProductDetailPage(),
      afterRender: (params) => initProductDetailPage(params),
   },

   /* ------------------------------
      SEARCH
   ------------------------------ */
   '/search': {
      render: () => SearchPage(),
      afterRender: () => initSearchPage(),
   },

   /* ------------------------------
      CART
   ------------------------------ */
   '/cart': {
      render: () => CartPage(),
      afterRender: () => initCartPage(),
   },

   /* ------------------------------
      AUTH (LOGIN / SIGNUP)
   ------------------------------ */
   '/auth': {
      render: () => AuthPage(),
      afterRender: () => initAuthPage(),
   },

   /* ------------------------------
      MYPAGE (Protected)
   ------------------------------ */
   '/mypage': {
      render: () => MyPage(),
      afterRender: () => {
         // ✅ redirectTo에 pathname + search 포함
         const redirectTo = window.location.pathname + window.location.search;

         const ok = requireAuth({ redirectTo });
         if (!ok) return;

         initMyPage();
      },
   },

   /* ------------------------------
      ADMIN (Protected + Role)
   ------------------------------ */
   '/admin': {
      render: () => AdminPage(),
      afterRender: () => {
         const ok = requireAdmin({ redirectTo: '/admin' });
         if (!ok) return;

         initAdminPage();
      },
   },

   /* ------------------------------
      CHECKOUT SUCCESS
   ------------------------------ */
   '/checkout/success': {
      render: () => CheckoutSuccessPage(),
      afterRender: () => initCheckoutSuccessPage(),
   },

   /* ------------------------------
      404
   ------------------------------ */
   '/404': {
      render: () =>
         "<section class='page'><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>",
   },
};

/* =========================================================
   3) 앱 시작 (Router & Global UI)
========================================================= */
initRouter({ mount, layout, routes });

/* =========================================================
   4) 전역 UI 초기화 (1회)
========================================================= */
initSidebar();
const searchDrawer = initSearchDrawer();
const toast = initToast();
const authUi = initAuthUi();

/* =========================================================
   5) SearchDrawer 외부 제어 브릿지
   - window.dispatchEvent(new CustomEvent('app:searchDrawerClose'))
========================================================= */
window.addEventListener('app:searchDrawerClose', () => {
   searchDrawer?.close?.();
});

/* =========================================================
   6) UI 상태 갱신 유틸 (Cart Count)
========================================================= */
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

/* =========================================================
   7) ProductCard UI 동기화 (사이즈/담김)
   ⚠️ 사용자 요청: product/index.js의 bindSizePills()는 건드리지 않음
========================================================= */
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

      // 1) "장바구니 담김" 아이콘 토글
      const favBtn = card.querySelector('[data-add-cart]');
      const inCart = cartStore.hasLine?.(productId) ?? false;
      if (favBtn) favBtn.classList.toggle('is-added', inCart);

      // 2) 사이즈 pills 없으면 여기서 종료
      const hasPills = Boolean(card.querySelector('[data-size-pill]'));
      if (!hasPills) return;

      // 3) 카트에 담긴 사이즈를 selected로 복원
      const cartInfo = getCartSizeForProduct(productId);
      if (cartInfo.hasAny && cartInfo.size)
         setCardSelectedSize(card, cartInfo.size);
      else setCardSelectedSize(card, '');

      // 4) 사이즈별 "이미 담김" 표시(is-in-cart)
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

/* =========================================================
   8) 회원가입 후 메인에서 웰컴 모달 (1회)
   - sessionStorage 플래그를 소비(consume)해서 재등장 방지
========================================================= */
let didRunSignupModal = false;

function runAfterSignupModalIfNeeded() {
   if (didRunSignupModal) return;

   const raw = sessionStorage.getItem('reve_after_signup_modal');
   if (!raw) return;

   // ✅ 1회성 소비
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

/* =========================================================
   9) 렌더 후 훅 (라우팅마다 실행)
   - router가 페이지를 mount/layout/render한 뒤에 호출된다고 가정
========================================================= */
window.addEventListener('app:render', () => {
   // 1) Drawer/Badge/Auth UI 갱신
   searchDrawer?.refresh?.();
   updateCartCount();
   authUi?.refresh?.();

   // 2) 가입 직후 모달 / 카드 동기화
   runAfterSignupModalIfNeeded();
   syncProductCardsWithCart();

   // 3) Footer DOM 바인딩
   initFooter();
});

// 최초 1회
updateCartCount();
authUi?.refresh?.();

/* =========================================================
   10) authStore 구독
   - owner 전환(guest -> userId) 시 관련 store owner 동기화
   - 로그인/로그아웃 토스트
========================================================= */
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

   // ✅ owner가 바뀌면 각 store owner 동기화
   if (owner !== prevOwner) {
      cartStore.setOwner(owner);
      couponStore.setOwner(owner);
      orderStore.setOwner(owner);
      addressStore.setOwner(owner);
      prevOwner = owner;
   }

   // ✅ 토스트
   if (!prevLogin && nowLogin)
      toast.show(`${u?.name || '사용자'}님 환영합니다 👋`, { duration: 1400 });

   if (prevLogin && !nowLogin) toast.show('로그아웃 완료', { duration: 1400 });

   prevLogin = nowLogin;
});

/* =========================================================
   11) cartStore 구독
   - 배지/카드 동기화
========================================================= */
cartStore.subscribe(() => {
   updateCartCount();
   syncProductCardsWithCart();
});

/* =========================================================
   12) 전역 이벤트 위임 (상품 카드)
   - A) 사이즈 선택
   - B) 장바구니 담기/제거
========================================================= */
document.addEventListener('click', async (e) => {
   /* -------------------------------------------------------
      A) 사이즈 pill 클릭
      - 같은 사이즈 재클릭 => (카트에 담긴 값 있으면) 복원 / 없으면 해제
      - 담긴 사이즈가 다른데 변경하려고 하면 confirmModal
   -------------------------------------------------------- */
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

      // 1) 같은 pill를 다시 눌렀을 때: 선택 해제(단, 카트에 담긴 값 있으면 복원)
      if (currentSelected === picked) {
         const cartInfo = getCartSizeForProduct(productId);

         if (cartInfo.hasAny && cartInfo.size) {
            setCardSelectedSize(card, cartInfo.size);
            return;
         }

         setCardSelectedSize(card, '');
         return;
      }

      // 2) 카트에 이미 다른 사이즈가 담겨있는데 변경하려는 경우
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

         // ✅ 실제 카트 옵션 변경 + UI 반영
         cartStore.updateOptions?.(cartInfo.key, { size: picked });
         setCardSelectedSize(card, picked);
         syncProductCardsWithCart();
         toast.show('사이즈가 변경됐어요', { duration: 1400 });
         return;
      }

      // 3) 그냥 선택만 바꿈(장바구니 담기 전 상태)
      setCardSelectedSize(card, picked);
      return;
   }

   /* -------------------------------------------------------
      B) 장바구니 아이콘 클릭
      - 로그인 필요: requireAuth(redirectTo 포함)
      - 사이즈 없는 상품: 토글 방식
      - 사이즈 있는 상품:
        - 선택 안했으면 안내
        - 같은 사이즈 담김이면 제거
        - 다른 사이즈 담김이면 변경(confirm)
   -------------------------------------------------------- */
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!card || !productId) return;

   // ✅ 로그인 가드: 현재 경로 + 쿼리를 redirectTo로 전달
   const redirectTo = window.location.pathname + window.location.search;
   const okAuth = requireAuth({ redirectTo: redirectTo || '/product' });
   if (!okAuth) return;

   const hasSizePills = Boolean(card.querySelector('[data-size-pill]'));
   const selectedSize = String(
      card.getAttribute('data-selected-size') || '',
   ).trim();

   const cartInfo = getCartSizeForProduct(productId);

   // 1) 이미 담긴 라인 존재 + 현재 선택값 없음 => "전체 제거"
   //    (멀티 사이즈 대비: productId의 모든 라인 제거)
   if (cartInfo.hasAny && !selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   // 2) 사이즈 pills가 있는데 선택 안함 => 막기
   if (hasSizePills && !selectedSize) {
      toast.show('사이즈를 선택한 뒤 장바구니에 담아 주세요 👟', {
         duration: 1400,
      });
      return;
   }

   // 3) 이미 같은 사이즈로 담겨있다 => 제거
   if (cartInfo.hasAny && cartInfo.size === selectedSize) {
      removeProductLines(productId);
      syncProductCardsWithCart();
      toast.show('장바구니에서 제거했어요', { duration: 1400 });
      return;
   }

   // 4) 이미 다른 사이즈 담김 => 변경(confirm)
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

   // 5) 신규 담기
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

   // ✅ 클릭 피드백 애니메이션
   btn.classList.add('is-pulse');
   setTimeout(() => btn.classList.remove('is-pulse'), 400);
});
