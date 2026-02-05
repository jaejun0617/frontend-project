/**
 * =============================================
 * 위치: src/pages/product/index.js
 * 역할: 상품(Product) 리스트 페이지
 *
 * 핵심 책임
 * 1) 상품 목록을 로드하여 ProductCard로 렌더링한다.
 * 2) 상품 리스트에서 “담김 상태” UI를 cartStore 기준으로 동기화한다.
 *    - 카드에 .is-in-cart 클래스 및 data-in-cart 플래그를 반영한다.
 * 3) 사이즈 pill 선택 상태를 “카드 dataset”에 저장한다.
 *    - 기본 선택은 없다.
 *    - 동일 사이즈 재클릭 시 선택 해제(토글)한다.
 *
 * 설계 원칙
 * - 이벤트는 위임 방식으로 1회만 바인딩한다(라우팅 재진입 중복 방지).
 * - 구독은 MVP 수준에서 유지하되, DOM이 사라진 경우 안전하게 무시한다.
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';
import { cartStore } from '../../store/cartStore.js';

export const ProductPage = () => {
   return `
    <section class='page product-page' aria-label='Product Page' data-product-page>
      <header class='page__header'>
        <h1 class='page__title'>상품</h1>
        <p class='page__desc'>목업 데이터 기반 상품 리스트(MVP)입니다.</p>
      </header>

      <div class='page__content'>
        <div class='product-grid' data-product-grid>
          <p class='loading'>불러오는 중입니다...</p>
        </div>
      </div>
    </section>
  `;
};

export async function initProductPage() {
   const root = document.querySelector('[data-product-page]');
   const gridEl = document.querySelector('[data-product-grid]');
   if (!root || !gridEl) return;

   /**
    * 라우팅 재진입 시 중복 바인딩을 방지한다.
    * - 동일 페이지 DOM이 재사용될 수 있는 환경에서 특히 중요하다.
    */
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   /**
    * 카드 UI를 “현재 cartStore 상태”에 맞춰 동기화한다.
    * - 해당 상품이 장바구니에 1개라도 담겨 있으면:
    *   - card.classList에 is-in-cart를 부여한다.
    *   - card.dataset.inCart를 '1'로 설정한다.
    *
    * 전제
    * - ProductCard가 카드 루트에 data-product-id를 설정한다.
    */
   const syncCartUi = () => {
      const cards = gridEl.querySelectorAll('[data-product-id]');

      cards.forEach((card) => {
         const productId = card.getAttribute('data-product-id');
         if (!productId) return;

         const inCart = cartStore.hasLine(productId);

         card.classList.toggle('is-in-cart', inCart);
         card.dataset.inCart = inCart ? '1' : '0';

         // 확장 포인트:
         // const lines = cartStore.getItemsByProductId(productId);
         // card.dataset.inCartLines = String(lines.length);
      });
   };

   /**
    * 사이즈 pill 선택 UX를 구성한다.
    *
    * 전제(마크업 계약)
    * - 카드 루트: [data-product-id] + data-selected-size=""(초기 빈 값 권장)
    * - pill 요소: [data-size-pill] + data-size="S|M|..."
    *
    * 동작
    * - pill 클릭 시 선택값을 card의 data-selected-size로 저장한다.
    * - 동일 값 재클릭 시 선택 해제한다.
    * - 같은 카드 내 pill UI(is-active, aria-*)를 즉시 동기화한다.
    */
   const bindSizePills = () => {
      gridEl.addEventListener('click', (e) => {
         const pill = e.target.closest('[data-size-pill]');
         if (!pill) return;

         const card = pill.closest('[data-product-id]');
         if (!card) return;

         const picked = String(pill.getAttribute('data-size') || '').trim();
         if (!picked) return;

         const prev = String(card.getAttribute('data-selected-size') || '');

         // 동일 사이즈 재클릭은 선택 해제한다.
         const next = prev === picked ? '' : picked;

         card.setAttribute('data-selected-size', next);

         // 같은 카드 내부 pill 상태를 일괄 갱신한다.
         card.querySelectorAll('[data-size-pill]').forEach((el) => {
            const v = String(el.getAttribute('data-size') || '').trim();
            const active = Boolean(next) && v === next;

            el.classList.toggle('is-active', active);

            // 요소 타입에 따라 접근성 속성을 구분한다.
            if (el.tagName === 'BUTTON') {
               el.setAttribute('aria-pressed', active ? 'true' : 'false');
            } else {
               el.setAttribute('aria-selected', active ? 'true' : 'false');
            }
         });
      });
   };

   // 이벤트 위임은 1회 바인딩한다.
   bindSizePills();

   try {
      const products = await getProducts();

      /**
       * ProductCard가 기본 선택 없이 렌더링되도록 유지한다.
       * - 각 카드의 data-selected-size는 초기값 ''이 바람직하다.
       */
      gridEl.innerHTML = products.map(ProductCard).join('');

      // 최초 렌더 직후: 장바구니 담김 상태를 반영한다.
      syncCartUi();
   } catch (err) {
      gridEl.innerHTML = `
        <p class='error'>상품을 불러오지 못했습니다. 새로고침 후 다시 시도해 주시기 바랍니다.</p>
      `;
      console.error('[product] load failed:', err);
      return;
   }

   /**
    * cartStore 변화(담기/삭제/옵션 변경/owner 스위칭 등)에 맞춰
    * 리스트의 담김 상태 UI를 자동으로 갱신한다.
    *
    * 주의
    * - 라우팅으로 페이지가 바뀌어 DOM이 사라진 경우를 대비해,
    *   존재 여부를 확인한 뒤 동기화를 수행한다.
    */
   cartStore.subscribe(() => {
      const stillHere = document.querySelector('[data-product-grid]');
      if (!stillHere) return;
      syncCartUi();
   });
}
