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

// Utils
import { initSidebar } from './src/utils/sidebar.js';
import { initSearchDrawer } from './src/utils/searchDrawer.js';
import { initRouter } from './src/utils/router.js';

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

   '/search': {
      render: () => SearchPage(),
      afterRender: () => initSearchPage(),
   },

   // MVP 단계: 아직 페이지 파일이 없으면 placeholder로 둬도 OK
   '/cart': {
      render: () =>
         "<section class='page'><h1>Cart</h1><p>장바구니 페이지 (TODO)</p></section>",
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

window.addEventListener('app:render', () => {
   searchDrawer.refresh();
});
