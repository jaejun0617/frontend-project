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

// Utils
import { initSidebar } from './src/utils/sidebar.js';
import { initSearchDrawer } from './src/utils/searchDrawer.js';
import { initRouter } from './src/utils/router.js';

import { cartStore } from './src/store/cartStore.js';
import { initToast } from './src/components/Toast.js';

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
      render: () =>
         "<section class='page'><h1>Auth</h1><p>로그인/회원가입 페이지 (TODO)</p></section>",
   },
   '/mypage': {
      render: () =>
         "<section class='page'><h1>MyPage</h1><p>마이페이지 (TODO)</p></section>",
   },
   '/admin': {
      render: () =>
         "<section class='page'><h1>Admin</h1><p>관리자 페이지 (TODO)</p></section>",
   },

   // 404
   '/404': {
      render: () =>
         "<section class='page'><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>",
   },
};

/* ==============================
   3) 앱 시작
   ============================== */

// 라우터가 최초 렌더까지 담당
initRouter({ mount, layout, routes });

// 이벤트는 문서 위임 방식이라, 렌더가 바뀌어도 재사용 가능
initSidebar();

// ⚠️ 라우터가 페이지 이동할 때마다 #app의 DOM을 통째로 갈아끼우므로
// Search Drawer 내부(최근/추천 리스트) DOM도 새로 생성됨.
// initSearchDrawer()는 1번만 호출하고, 매 렌더마다 refresh()로 리스트를 다시 렌더링한다.
const searchDrawer = initSearchDrawer();

// 전역 토스트(중앙) - 라우팅이 바뀌어도 body에 남아있음
const toast = initToast();

function updateCartCount() {
   const count = cartStore.getCount();
   const badgeEls = document.querySelectorAll('[data-cart-count]');

   badgeEls.forEach((el) => {
      // 0이면 뱃지 숨김(UX)
      if (count <= 0) {
         el.hidden = true;
         el.textContent = '0';
         return;
      }

      el.hidden = false;
      el.textContent = String(count);
   });
}

// 최초 1회(첫 렌더 직후에도 안전하게 동작)
updateCartCount();

// 라우터가 렌더를 끝낼 때마다: SearchDrawer + CartCount 둘 다 새 DOM에 맞춰 갱신
window.addEventListener('app:render', () => {
   searchDrawer.refresh();
   updateCartCount();
});

// 장바구니 상태가 바뀌면 즉시 카운트 갱신
cartStore.subscribe(() => {
   updateCartCount();
});

/* ==============================
   4) 전역 이벤트: 장바구니 담기
   ============================== */

// Product/Search 카드의 "장바구니" 버튼은 data-add-cart를 갖는다.
// 페이지가 바뀌어도 document 위임으로 한 번만 등록하면 됨.
document.addEventListener('click', async (e) => {
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!productId) return;

   // 1) 장바구니에 담기
   await cartStore.addById(productId, 1);

   // 2) 사용자가 체감할 수 있도록 간단한 피드백(나중에 토스트로 교체 가능)
   btn.textContent = '담김 ✓';
   btn.disabled = true;
   setTimeout(() => {
      btn.textContent = '장바구니';
      btn.disabled = false;
   }, 1400);
   // 2) 토스트로 피드백 (중앙 표시)
   toast.show('장바구니에 담겼어요');
});
