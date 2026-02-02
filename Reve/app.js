/**
 * =============================================
 * 📍 위치: app.js
 * 역할: 앱 진입점(Entry) - 라우터/레이아웃 조립 + init 함수 실행
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

// Utils
import { initSidebar } from './src/utils/sidebar.js';
import { initSearchDrawer } from './src/utils/searchDrawer.js';
import { initRouter } from './src/utils/router.js';

import { cartStore } from './src/store/cartStore.js';
import { initToast } from './src/components/Toast.js';

import { initAuthUi } from './src/utils/authUi.js';
import { requireAuth, requireAdmin } from './src/utils/guards.js';
import { authStore } from './src/store/authStore.js';
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
   '/': {
      render: () => HomePage(),
   },

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
         // ✅ 로그인 가드
         const ok = requireAuth({ redirectTo: '/mypage' });
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

   '/404': {
      render: () =>
         "<section class='page'><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>",
   },
};

/* ==============================
   3) 앱 시작
   ============================== */

initRouter({ mount, layout, routes });

initSidebar();

const searchDrawer = initSearchDrawer();
const toast = initToast();
const authUi = initAuthUi();

// 앱 시작 후 1번
const user = authStore.getUser?.();
cartStore.setOwner(user?.id || null);

// 로그인/로그아웃 순간마다 스위칭
authStore.subscribe(() => {
   const u = authStore.getUser?.();
   cartStore.setOwner(u?.id || null);
});

/* ==============================
   4) UI 상태 갱신 유틸
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
   5) 렌더 후 훅
   ============================== */

window.addEventListener('app:render', () => {
   searchDrawer.refresh();
   updateCartCount();
   authUi.refresh();
});

// 최초 1회도 안전하게 실행
updateCartCount();
authUi.refresh();

// 장바구니 상태 변화 시 즉시 반영
cartStore.subscribe(() => {
   updateCartCount();
});

/* ==============================
   6) 전역 이벤트: 장바구니 담기
   ============================== */

document.addEventListener('click', async (e) => {
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   // ✅ 로그인 가드: guest면 로그인 페이지로 보내고, 현재 위치로 되돌아오게
   const ok = requireAuth({
      redirectTo: window.location.pathname || '/product',
   });
   if (!ok) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!productId) return;

   await cartStore.addById(productId, 1);

   // UX 피드백 + 토스트
   btn.textContent = '담김 ✓';
   btn.disabled = true;

   toast.show('장바구니에 담겼어요');

   setTimeout(() => {
      btn.textContent = '장바구니';
      btn.disabled = false;
   }, 1400);
});

let prevLogin = authStore.isLoggedIn();

authStore.subscribe(() => {
   const nowLogin = authStore.isLoggedIn();

   // 로그인 순간
   if (!prevLogin && nowLogin) {
      const user = authStore.getUser();
      const name = user?.name || '사용자';
      toast.show(`${name}님 환영합니다 👋`, { duration: 1400 });
   }

   // 로그아웃 순간(선택)
   if (prevLogin && !nowLogin) {
      toast.show('로그아웃 완료');
   }

   prevLogin = nowLogin;
});
