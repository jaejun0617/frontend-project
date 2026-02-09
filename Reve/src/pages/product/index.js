/**
 * =============================================
 * 📍 위치: src/pages/product/index.js
 * 역할: 상품(Product) 리스트 페이지
 * - ProductCard 렌더링
 * - 상품 리스트에서 "담김 상태" 유지(아이콘 빨강 등)
 * - 사이즈 pill 선택 상태를 카드 dataset에 저장 (기본 선택 ❌)
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
        <p class='page__desc'>목업 데이터 기반 상품 리스트 (MVP)</p>
      </header>

      <div class='page__content'>
        <div class='product-grid' data-product-grid>
          <p class='loading'>불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
};

export async function initProductPage() {
   const root = document.querySelector('[data-product-page]');
   const gridEl = document.querySelector('[data-product-grid]');
   if (!root || !gridEl) return;

   // ✅ 라우팅 재진입 시 이벤트/구독 중복 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   /**
    * ✅ 카드 UI를 "현재 cartStore 상태"에 맞춰 동기화
    * - 담긴 상품이면: card에 is-in-cart 클래스/데이터 부여
    * - 나중에 CSS에서 아이콘 배경 빨강 처리하기 쉬움
    */
   const syncCartUi = () => {
      const cards = gridEl.querySelectorAll('[data-product-id]');
      cards.forEach((card) => {
         const productId = card.getAttribute('data-product-id');
         if (!productId) return;

         // 이 상품이 장바구니에 1개라도 담겼는지
         const inCart = cartStore.hasLine(productId);

         card.classList.toggle('is-in-cart', inCart);
         card.dataset.inCart = inCart ? '1' : '0';

         // (선택) 담김 수량/라인 수 표시하고 싶으면 여기서 가능
         // const lines = cartStore.getItemsByProductId(productId);
         // card.dataset.inCartLines = String(lines.length);
      });
   };

   /**
    * ✅ 사이즈 pill UI 상태 처리
    * - ProductCard에서 아래 훅을 제공한다고 가정:
    *   - card: data-product-id + data-selected-size(초기값은 빈 문자열 권장)
    *   - pill: [data-size-pill] + data-size="S|M|..."
    *
    * - 클릭하면:
    *   - 같은 카드 내 pill만 토글
    *   - 선택값을 card.dataset.selectedSize에 저장
    *   - 다시 클릭하면 선택 해제도 가능(사용자 실수 방지)
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

         // 같은 사이즈를 다시 누르면 해제(토글)
         const next = prev === picked ? '' : picked;

         // 카드 dataset 업데이트
         card.setAttribute('data-selected-size', next);

         // 같은 카드 안의 pill 상태 갱신
         card.querySelectorAll('[data-size-pill]').forEach((el) => {
            const v = String(el.getAttribute('data-size') || '').trim();
            const active = next && v === next;

            el.classList.toggle('is-active', active);

            // 접근성: 버튼이면 aria-pressed, 그 외는 aria-selected
            if (el.tagName === 'BUTTON') {
               el.setAttribute('aria-pressed', active ? 'true' : 'false');
            } else {
               el.setAttribute('aria-selected', active ? 'true' : 'false');
            }
         });
      });
   };

   // ✅ 이벤트 위임(1회)
   bindSizePills();

   try {
      const products = await getProducts();

      // ✅ ProductCard는 "기본 사이즈 선택 없음"이 목표라면:
      // ProductCard 내부에서 data-selected-size=""로 렌더링하는 게 가장 깔끔함.
      gridEl.innerHTML = products.map(ProductCard).join('');

      // ✅ 최초 1회: 장바구니 상태 반영
      syncCartUi();
   } catch (err) {
      gridEl.innerHTML = `
        <p class='error'>상품을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>
      `;
      console.error('[product] load failed:', err);
      return;
   }

   /**
    * ✅ cartStore가 바뀔 때마다(담기/삭제/옵션변경/로그인 스위칭)
    * 상품 리스트의 “담김 상태”도 자동으로 업데이트
    *
    * ⚠️ 여기서 unsubscribe를 저장해두고 싶다면,
    * 라우터에 페이지 unmount 훅이 있을 때 해제하는 구조로 확장 가능.
    * (지금은 sync 함수가 DOM 없으면 자연스럽게 영향이 적어서 MVP로 OK)
    */
   cartStore.subscribe(() => {
      // grid가 이미 다른 페이지로 바뀌었으면 안전하게 스킵
      const stillHere = document.querySelector('[data-product-grid]');
      if (!stillHere) return;
      syncCartUi();
   });
}
