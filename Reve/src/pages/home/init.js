/**
 * =============================================
 * 📍 위치: src/pages/home/init.js
 * 역할:
 * 1) Hero Fade Swiper - 5초 자동 루프 + dot 클릭
 * 2) Home Featured Products - limit만큼 ProductCard 렌더
 * 3) Welcome Coupon CTA - 로그인 상태에 따라 링크 분기
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';
import { cartStore } from '../../store/cartStore.js';
import { authStore } from '../../store/authStore.js';

/* =========================================================
   0) Auth state helper (단일 소스)
   - ✅ localStorage 직접 조회 제거
   - ✅ 앱 전체 기준(authStore)과 동일하게 맞춤
   ========================================================= */
function isLoggedIn() {
   // authStore.isLoggedIn()이 있으면 그걸 최우선
   if (typeof authStore?.isLoggedIn === 'function')
      return authStore.isLoggedIn();

   // fallback: getUser가 있으면 user 존재로 판단
   const u = authStore?.getUser?.();
   return Boolean(u && typeof u === 'object');
}

/* =========================================================
   1) HERO: Fade Swiper
   ========================================================= */
export function initHomeHero() {
   const root = document.querySelector('[data-hero]');
   if (!root) return;

   if (root.dataset.boundHero === '1') return;
   root.dataset.boundHero = '1';

   const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
   const dots = Array.from(root.querySelectorAll('[data-hero-dot]'));
   if (!slides.length) return;

   const INTERVAL_MS = 5000;
   const FADE_MS = 700; // CSS --hero-fade 와 맞추기

   let active = slides.findIndex((el) => el.classList.contains('is-active'));
   if (active < 0) active = 0;

   let timer = null;
   let locked = false;

   const setActive = (nextIdx) => {
      if (locked) return;
      locked = true;

      const next = (nextIdx + slides.length) % slides.length;

      slides.forEach((el, i) => {
         const on = i === next;
         el.classList.toggle('is-active', on);
         el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });

      dots.forEach((d, i) => {
         const on = i === next;
         d.classList.toggle('is-active', on);
         d.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      active = next;

      window.setTimeout(() => {
         locked = false;
      }, FADE_MS);
   };

   const next = () => setActive(active + 1);

   const start = () => {
      stop();
      timer = window.setInterval(next, INTERVAL_MS);
   };

   const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
   };

   root.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-hero-dot]');
      if (!dot) return;

      const idx = Number(dot.getAttribute('data-hero-dot'));
      if (!Number.isFinite(idx)) return;

      setActive(idx);
      start();
   });

   document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
   });

   setActive(active);
   start();
}

/* =========================================================
   2) HOME: Featured products + heart sync
   ========================================================= */

function isInCartByProductId(productId) {
   // - product 리스트 페이지에서는 hasLine(productId)로 쓰고 있었으니 동일 규칙 유지
   return cartStore.hasLine?.(productId) ?? false;
}

function syncHomeCartUi(gridEl) {
   const cards = gridEl.querySelectorAll('[data-product-id]');
   cards.forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;

      const inCart = isInCartByProductId(productId);
      card.classList.toggle('is-in-cart', inCart);
      card.dataset.inCart = inCart ? '1' : '0';
   });
}

export async function initHomeProducts({ limit = 16 } = {}) {
   const gridEl = document.querySelector('[data-home-product-grid]');
   if (!gridEl) return;

   // ✅ 홈 재진입 시 subscribe 중복 방지
   if (gridEl.dataset.boundProducts === '1') return;
   gridEl.dataset.boundProducts = '1';

   try {
      const res = await getProducts();
      const products = Array.isArray(res)
         ? res
         : Array.isArray(res?.items)
           ? res.items
           : [];

      const slice = products.slice(0, limit);

      gridEl.innerHTML = slice.map(ProductCard).join('');

      // ✅ 렌더 직후 1회 동기화
      syncHomeCartUi(gridEl);

      // ✅ 장바구니 변경 시 홈도 같이 반영 (중복 subscribe 방지됨)
      cartStore.subscribe(() => {
         const stillHere = document.querySelector('[data-home-product-grid]');
         if (!stillHere) return;
         syncHomeCartUi(stillHere);
      });
   } catch (e) {
      gridEl.innerHTML = `<p class="error">상품을 불러오지 못했어요.</p>`;
      console.error('[home] products load failed:', e);
   }
}

/* =========================================================
   3) Welcome Coupon CTA
   - ✅ href 동기화 + 클릭 시점 라우팅(더 강력)
   - ✅ 로그인 상태는 authStore 기준(앱 전체와 동일)
   ========================================================= */

export function initWelcomeCouponCta() {
   const btn = document.querySelector('[data-coupon-cta]');
   if (!btn) return;

   // ✅ 중복 바인딩 방지
   if (btn.dataset.boundCta === '1') return;
   btn.dataset.boundCta = '1';

   const computeHref = () => (isLoggedIn() ? '/mypage?tab=coupon' : '/auth');

   const setHref = () => {
      btn.setAttribute('href', computeHref());
   };

   // 1) 초기 1회
   setHref();

   // 2) auth 변동 시 href 갱신
   authStore.subscribe?.(setHref);

   // 3) 클릭 시점에 강제 라우팅(앱이 CustomEvent 기반 라우터면 특히 안정적)
   btn.addEventListener('click', (e) => {
      // 기본 a 이동 막고 SPA 라우팅으로 보냄
      e.preventDefault();

      const href = computeHref();

      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href } }),
      );
   });
}

/* =========================================================
   4) Home init entry (한 방에 호출용)
   - route.afterRender에서 이 함수만 호출하면 됨
   ========================================================= */
export function initHomePage() {
   initHomeHero();
   initHomeProducts({ limit: 16 });
   initWelcomeCouponCta();
}
