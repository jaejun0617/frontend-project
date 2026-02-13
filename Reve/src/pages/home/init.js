/**
 * =============================================
 * 📍 위치: src/pages/home/init.js
 * 역할:
 * 1) Hero Fade Swiper - 5초 자동 루프 + dot 클릭
 * 2) Home Featured Products - limit만큼 ProductCard 렌더
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';

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

   // dot 클릭 이동
   root.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-hero-dot]');
      if (!dot) return;

      const idx = Number(dot.getAttribute('data-hero-dot'));
      if (!Number.isFinite(idx)) return;

      setActive(idx);
      start();
   });

   // 접근성/배터리: 탭 비활성 시 멈춤
   document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
   });

   // start
   setActive(active);
   start();
}

/* =========================================================
   2) HOME: Featured products
   ========================================================= */

import { cartStore } from '../../store/cartStore.js';

function syncHomeCartUi(gridEl) {
   const cards = gridEl.querySelectorAll('[data-product-id]');
   cards.forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;

      const inCart = cartStore.hasLine?.(productId) ?? false;
      card.classList.toggle('is-in-cart', inCart);
      card.dataset.inCart = inCart ? '1' : '0';
   });
}

export async function initHomeProducts({ limit = 16 } = {}) {
   const gridEl = document.querySelector('[data-home-product-grid]');
   if (!gridEl) return;

   try {
      const res = await getProducts();
      const products = Array.isArray(res)
         ? res
         : Array.isArray(res?.items)
           ? res.items
           : [];
      const slice = products.slice(0, limit);

      gridEl.innerHTML = slice.map(ProductCard).join('');

      // ✅ 렌더 직후 1회 동기화 (색 변함)
      syncHomeCartUi(gridEl);

      // ✅ 장바구니 변경 시 홈도 같이 반영
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
