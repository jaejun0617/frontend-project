/**
 * =============================================
 * 📍 위치: src/utils/router.js
 * 역할: 커스텀 SPA 라우터 (경로(path) -> 페이지 렌더링)
 *
 * ✅ 라우터 MVP 체크
 * 1) [data-link] 클릭 -> pushState -> renderRoute()
 * 2) popstate(뒤로가기) -> renderRoute()
 * 3) 404 fallback
 * 4) /search?q= 처럼 query가 있어도 path(/search)로 페이지 선택
 *
 * 🔔 app:render 이벤트
 * - 라우팅 시 #app의 DOM을 통째로 교체하므로(Header 포함)
 * - SearchDrawer 같은 모듈이 새 DOM을 다시 잡을 수 있도록
 *   renderRoute() 끝에서 window에 CustomEvent('app:render')를 발행한다.
 * =============================================
 */

/**
 * @typedef {Object} Route
 * @property {() => string} render - 페이지 HTML 템플릿 반환
 * @property {() => (void|Promise<void>)} [afterRender] - 렌더 직후 실행(선택)
 */

/**
 * 라우터 초기화
 * @param {Object} params
 * @param {(html: string) => void} params.mount - #app에 HTML을 꽂는 함수
 * @param {(pageHtml: string) => string} params.layout - Header/Footer를 감싸는 레이아웃 함수
 * @param {Record<string, Route>} params.routes - path -> Route 매핑
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

   async function renderRoute() {
      const path = getPathname();

      const route = routes[path] || routes['/404'];
      const pageHtml = route?.render ? route.render() : '<h1>404</h1>';

      // 1) 화면에 먼저 그리기(동기)
      // ⚠️ mount()는 #app 내부를 통째로 갈아끼우므로,
      //    Header/SearchDrawer 같은 DOM도 매번 새로 생성됨
      mount(layout(pageHtml));

      // 2) 렌더 이후 로직(선택)
      if (route?.afterRender) {
         await route.afterRender();
      }

      // 3) 새 DOM이 만들어진 뒤, 다른 모듈들이 다시 DOM을 잡을 수 있게 이벤트 발행
      window.dispatchEvent(new CustomEvent('app:render'));

      // 4) 네비게이션 전환 시 열린 패널이 남아있지 않게(UX)
      document.body.classList.remove('is-sidebar-open');
      document.body.classList.remove('is-search-open');
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
      if (
         target === '_blank' ||
         anchor.hasAttribute('download') ||
         isExternal
      ) {
         return;
      }

      e.preventDefault();
      navigate(href);
   }

   document.addEventListener('click', onLinkClick);
   window.addEventListener('popstate', renderRoute);

   renderRoute();

   return { renderRoute, navigate };
}
