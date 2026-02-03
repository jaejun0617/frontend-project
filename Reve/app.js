/**
 * =============================================
 * 📍 위치: app.js
 * 역할: 앱 진입점(Entry)
 * - 라우터/레이아웃 조립
 * - 전역 UI 초기화 (Sidebar/SearchDrawer/Toast/AuthUi)
 * - 전역 이벤트 위임 (장바구니 담기, 사이즈 선택 등)
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
import { requireAuth, requireAdmin } from './src/utils/guards.js';
import { initAuthUi } from './src/utils/authUi.js';

// Stores / Components
import { cartStore } from './src/store/cartStore.js';
import { authStore } from './src/store/authStore.js';
import { initToast } from './src/components/Toast.js';
import { confirmModal } from './src/components/ConfirmModal.js';

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
         // ✅ 로그인 필요 페이지: 렌더 후 가드 (비로그인이면 /auth로 이동)
         const ok = requireAuth({ redirectTo: '/mypage' });
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

   // 404
   '/404': {
      render: () =>
         "<section class='page'><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>",
   },
};

/* ==============================
   3) 앱 시작 (Router & Global UI)
   ============================== */

initRouter({ mount, layout, routes });

// 전역 UI들은 1번만 init (라우팅이 바뀌어도 유지되는 구조)
initSidebar();
const searchDrawer = initSearchDrawer();
const toast = initToast();
const authUi = initAuthUi();

/* ==============================
   4) UI 상태 갱신 유틸
   ============================== */

/**
 * ✅ 장바구니 카운트 뱃지 갱신
 * - 0이면 숨김(UX)
 * - 페이지가 렌더링될 때마다 새 DOM 기준으로 갱신해야 함
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

/* ==============================
   5) 회원가입 후 메인에서 모달 띄우기
   ============================== */

/**
 * ✅ sessionStorage 플래그를 이용해 "메인 이동 후" 모달 띄우기
 * - auth 페이지에서 세션스토리지에 데이터 저장
 * - 홈으로 네비게이션 완료 후(app:render) 모달 실행
 * - 중복 실행 방지 위해 1회성 처리
 */
let didRunSignupModal = false;

function runAfterSignupModalIfNeeded() {
   if (didRunSignupModal) return;

   const raw = sessionStorage.getItem('reve_after_signup_modal');
   if (!raw) return;

   // ✅ 중복 방지: 먼저 제거
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
   // ✅ 새로 렌더된 DOM 기준으로 UI를 갱신해야 함
   searchDrawer.refresh();
   updateCartCount();
   authUi.refresh();

   // ✅ 회원가입 후 모달 (메인에서 뜨게)
   runAfterSignupModalIfNeeded();
});

// 최초 1회도 안전하게 갱신
updateCartCount();
authUi.refresh();

/* ==============================
   7) authStore 구독: 카트 owner 전환 + 환영 토스트
   ============================== */

// 앱 시작 직후 1번: 현재 로그인 유저 기준으로 cart owner 세팅
{
   const u = authStore.getUser?.();
   cartStore.setOwner(u?.id || null);
}

/**
 * ✅ authStore 변화가 생기면
 * 1) cartStore ownerKey 스위칭 (로그인/로그아웃 시 장바구니 분리)
 * 2) 로그인 순간 환영 토스트
 * 3) 로그아웃 순간 토스트
 */
let prevLogin = authStore.isLoggedIn();

authStore.subscribe(() => {
   const nowLogin = authStore.isLoggedIn();
   const u = authStore.getUser?.();

   // 1) 유저별 카트 분리 적용
   cartStore.setOwner(u?.id || null);

   // 2) 로그인 순간
   if (!prevLogin && nowLogin) {
      const name = u?.name || '사용자';
      toast.show(`${name}님 환영합니다 👋`, { duration: 1400 });
   }

   // 3) 로그아웃 순간
   if (prevLogin && !nowLogin) {
      toast.show('로그아웃 완료', { duration: 1400 });
   }

   prevLogin = nowLogin;
});

// cartStore가 바뀌면 카운트 갱신
cartStore.subscribe(() => updateCartCount());

/* ==============================
   8) 전역 이벤트 위임
   - (A) 사이즈 칩 선택
   - (B) 장바구니 담기
   ============================== */

/**
 * ✅ (A) 사이즈 칩 선택
 * - ProductCard에서 data-size-pill / data-size-value 구조를 쓰는 전제
 * - 클릭하면 카드의 data-selected-size를 갱신하고,
 *   선택 스타일(is-selected) 및 aria-checked를 업데이트
 */
document.addEventListener('click', (e) => {
   const pill = e.target.closest('[data-size-pill]');
   if (!pill) return;

   const card = pill.closest('[data-product-id]');
   if (!card) return;

   // 같은 카드 안 pill들 active 정리
   card.querySelectorAll('[data-size-pill]').forEach((btn) => {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-pressed', 'false');
   });

   pill.classList.add('is-active');
   pill.setAttribute('aria-pressed', 'true');

   // 선택값 저장(장바구니 담기에서 읽음)
   const size = String(pill.getAttribute('data-size-value') || '').trim();
   card.setAttribute('data-selected-size', size);
});

/**
 * ✅ (B) 장바구니 담기
 * - 로그인 가드
 * - 사이즈 있는 상품은 "선택 필수" 가드
 * - options: { size } 를 cartStore에 전달
 */
document.addEventListener('click', async (e) => {
   const btn = e.target.closest('[data-add-cart]');
   if (!btn) return;

   // ✅ 로그인 가드: 비로그인이면 /auth로 이동
   const ok = requireAuth({
      redirectTo: window.location.pathname || '/product',
   });
   if (!ok) return;

   const card = btn.closest('[data-product-id]');
   const productId = card?.getAttribute('data-product-id');
   if (!productId) return;

   // ✅ 사이즈 선택 필요 상품: 선택 안 했으면 토스트 후 중단
   const selectedSize =
      card?.getAttribute('data-selected-size') ||
      card
         ?.querySelector('.size-pill.is-active')
         ?.getAttribute('data-size-value') ||
      '';

   const hasSizes = Boolean(card?.querySelector('[data-size-pills]'));
   if (hasSizes && !selectedSize) {
      toast.show('사이즈를 선택해야 장바구니에 담을 수 있어요.');
      return;
   }

   await cartStore.addById(productId, 1, { size: selectedSize });

   // ✅ 담김 UI: 아이콘 빨간 배경 + 토스트
   btn.classList.add('is-added');
   toast.show('장바구니에 담겼어요');

   // 원하면 1.4초 뒤 원복(원복 싫으면 이 부분 삭제)
   setTimeout(() => {
      btn.classList.remove('is-added');
   }, 1400);
});
