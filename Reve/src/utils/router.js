/**
 * =============================================
 * 📍 위치: src/utils/router.js
 * 역할: 커스텀 SPA 라우터 (정적 + 동적 경로 지원)
 * =============================================
 */

export function initRouter({ mount, layout, routes }) {
   if (!mount || !layout || !routes) {
      throw new Error(
         '[router] initRouter({ mount, layout, routes }) 형태로 넘겨줘야 해!',
      );
   }

   function getPathname() {
      return window.location.pathname || '/';
   }

   function matchRoute(path) {
      // 1) 정적 라우트 우선
      if (routes[path]) return { route: routes[path], params: {} };

      // 2) 동적 라우트 탐색: /product/:id 같은 형태
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
         keys.forEach(
            (k, idx) => (params[k] = decodeURIComponent(m[idx + 1] ?? '')),
         );
         return { route, params };
      }

      return { route: routes['/404'], params: {} };
   }

   async function renderRoute() {
      const path = getPathname();
      const { route, params } = matchRoute(path);

      const pageHtml = route?.render ? route.render(params) : '<h1>404</h1>';

      // 1) 먼저 그림
      mount(layout(pageHtml));

      // 2) afterRender(params)
      if (route?.afterRender) {
         await route.afterRender(params);
      }

      // 3) 새 DOM 이벤트
      window.dispatchEvent(new CustomEvent('app:render'));

      // 4) 패널 닫기
      document.body.classList.remove('is-sidebar-open');
      // document.body.classList.remove('is-search-open');
   }

   function navigate(href) {
      const nextUrl = new URL(href, window.location.origin);
      window.history.pushState({}, '', nextUrl.pathname + nextUrl.search);
      renderRoute();
   }

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

   document.addEventListener('click', onLinkClick);
   window.addEventListener('popstate', renderRoute);

   // ✅ 외부에서 라우팅 요청(상세 -> 장바구니 이동 등)
   window.addEventListener('app:navigate', (e) => {
      const href = e?.detail?.href;
      if (href) navigate(href);
   });

   renderRoute();

   return { renderRoute, navigate };
}
