/**
 * =============================================
 * 📍 위치: src/utils/router.js
 * 역할: 커스텀 SPA 라우터 (정적 + 동적 경로 지원)
 *
 * ✅ 개선 UX
 * - 라우트 이동 시 "무조건" 상단으로 스크롤 리셋
 *   (window 스크롤 + 컨테이너 스크롤(app-main 등) 모두 대응)
 *
 * ✅ 지원
 * - 정적 라우트: '/product'
 * - 동적 라우트: '/product/:id'
 * - data-link 기반 내부 라우팅
 * - app:navigate 커스텀 이벤트 브릿지
 * =============================================
 */

export function initRouter({ mount, layout, routes }) {
   /* =========================================================
      0) Guard
      ========================================================= */
   if (!mount || !layout || !routes) {
      throw new Error(
         '[router] initRouter({ mount, layout, routes }) 형태로 넘겨줘야 해!',
      );
   }

   /* =========================================================
      1) Scroll UX (robust)
      - window + document.scrollingElement + app-main 같은 스크롤 컨테이너까지
      - behavior는 'auto'로 고정(호환성 최강)
      ========================================================= */
   function scrollToTop() {
      // 1) 표준 스크롤 엘리먼트(html/body 중 브라우저가 쓰는 쪽)
      const se = document.scrollingElement || document.documentElement;

      // 2) 네 레이아웃에서 main이 스크롤 컨테이너일 가능성 대응
      const main = document.querySelector('.app-main');

      // 3) window 스크롤
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      // 4) 문서 스크롤 엘리먼트도 확실히
      if (se) se.scrollTop = 0;

      // 5) 스크롤 컨테이너도 확실히
      if (main) main.scrollTop = 0;
      document.body.scrollTop = 0; // 일부 구형/특이 케이스
   }

   /* =========================================================
      2) Location Helper
      ========================================================= */
   function getPathname() {
      return window.location.pathname || '/';
   }

   /* =========================================================
      3) Route Matcher
      ========================================================= */
   function matchRoute(path) {
      // 1) 정적 라우트 우선
      if (routes[path]) return { route: routes[path], params: {} };

      // 2) 동적 라우트 탐색
      for (const [pattern, route] of Object.entries(routes)) {
         if (!pattern.includes(':')) continue;

         const keys = [];
         const regexStr = pattern
            .split('/')
            .map((seg) => {
               if (seg.startsWith(':')) {
                  keys.push(seg.slice(1));
                  return '([^/]+)';
               }
               return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            })
            .join('/');

         const regex = new RegExp(`^${regexStr}$`);
         const m = path.match(regex);
         if (!m) continue;

         const params = {};
         keys.forEach((k, idx) => {
            params[k] = decodeURIComponent(m[idx + 1] ?? '');
         });
         return { route, params };
      }

      return { route: routes['/404'], params: {} };
   }

   /* =========================================================
      4) Render Pipeline
      - mount -> afterRender -> app:render
      - ✅ 상단 스크롤은 "DOM 교체 직후" + "afterRender 이후" 2번 쏴서 확실히
      ========================================================= */
   async function renderRoute() {
      const path = getPathname();
      const { route, params } = matchRoute(path);

      const pageHtml = route?.render ? route.render(params) : '<h1>404</h1>';

      // 1) 먼저 그림
      mount(layout(pageHtml));

      // ✅ DOM이 바뀌는 순간에 한번 올려주기 (즉시 체감)
      scrollToTop();

      // 2) afterRender
      if (route?.afterRender) {
         await route.afterRender(params);
      }

      // 3) render 이벤트
      window.dispatchEvent(new CustomEvent('app:render'));

      // 4) 패널 닫기
      document.body.classList.remove('is-sidebar-open');
      // document.body.classList.remove('is-search-open');

      // ✅ 데이터 로딩/이미지 로딩/레이아웃 변화로 스크롤 튈 수 있어서 한번 더 고정
      scrollToTop();
   }

   /* =========================================================
      5) Navigation
      ========================================================= */
   function navigate(href) {
      const nextUrl = new URL(href, window.location.origin);
      window.history.pushState({}, '', nextUrl.pathname + nextUrl.search);
      renderRoute();
   }

   /* =========================================================
      6) Link Interceptor
      ========================================================= */
   function onLinkClick(e) {
      const anchor = e.target.closest('a[data-link]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const target = anchor.getAttribute('target');
      const isExternal = /^https?:\/\//i.test(href);

      if (target === '_blank' || anchor.hasAttribute('download') || isExternal)
         return;

      e.preventDefault();
      navigate(href);
   }

   /* =========================================================
      7) Events
      ========================================================= */
   document.addEventListener('click', onLinkClick);
   window.addEventListener('popstate', renderRoute);

   window.addEventListener('app:navigate', (e) => {
      const href = e?.detail?.href;
      if (href) navigate(href);
   });

   /* =========================================================
      8) Initial Render
      ========================================================= */
   renderRoute();

   return { renderRoute, navigate };
}
