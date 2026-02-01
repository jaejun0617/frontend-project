/**
 * =============================================
 * 📍 위치: app.js
 * 역할: 앱 진입점(Entry) - (현재) HomePage만 화면에 그리기
 * 메모: 라우터는 나중 단계에서 initRouter로 연결
 * =============================================
 */

import { HomePage } from './src/pages/home/index.js';
import { Header } from './src/components/Header.js';
import { Footer } from './src/components/Footer.js';
import { initSidebar } from './src/utils/sidebar.js';
import { initSearchDrawer } from './src/utils/searchDrawer.js';

function mount(html) {
   const mountEl = document.querySelector('#app');
   if (!mountEl) {
      throw new Error(
         '[app] #app 엘리먼트를 찾지 못했어. index.html에 <div id="app"></div>가 필요해!',
      );
   }
   mountEl.innerHTML = html;
}

function layout(pageHtml) {
   return `
        ${Header()}
        <main>${pageHtml}</main>
        ${Footer()}
    `;
}

mount(layout(HomePage()));
initSidebar();
initSearchDrawer();
