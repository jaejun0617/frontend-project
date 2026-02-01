/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지 엔트리
 * 경로: /cart
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/format.js';

/* ==============================
   1) 템플릿(뼈대)
   ============================== */

export const CartPage = () => {
   return `
    <section class='page cart-page' aria-label='Cart Page'>
      <header class='page__header'>
        <h1 class='page__title'>장바구니</h1>
        <p class='page__desc'>담은 상품을 확인하고 수량/합계를 조정합니다.</p>
      </header>

      <div class='page__content'>
        <div class='cart' data-cart>
          <p class='loading'>불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
};

/* ==============================
   2) 렌더 유틸
   ============================== */

function renderEmpty() {
   return `
    <div class='cart-empty'>
      <p class='empty'>장바구니가 비어 있어요.</p>
      <a class='btn' href='/product' data-link>상품 보러가기</a>
    </div>
  `;
}

function calcTotal(detailedItems) {
   return detailedItems.reduce(
      (acc, row) => acc + row.product.price * row.qty,
      0,
   );
}

function renderCart(detailedItems) {
   const total = calcTotal(detailedItems);

   return `
    <div class='cart__list' aria-label='Cart Items'>
      ${detailedItems
         .map(({ product, qty }) => {
            return `
          <article class='cart-item' data-cart-item data-product-id='${product.id}'>
            <div class='cart-item__info'>
              <p class='cart-item__name'>${product.name}</p>
              <p class='cart-item__price'>₩ ${formatPrice(product.price)}</p>
            </div>

            <div class='cart-item__controls' aria-label='Quantity Controls'>
              <button type='button' data-qty-dec aria-label='Decrease quantity'>-</button>
              <span class='cart-item__qty' data-qty>${qty}</span>
              <button type='button' data-qty-inc aria-label='Increase quantity'>+</button>
            </div>

            <button type='button' class='cart-item__remove' data-remove aria-label='Remove item'>
              삭제
            </button>
          </article>
        `;
         })
         .join('')}
    </div>

    <footer class='cart__summary' aria-label='Cart Summary'>
      <div class='cart__row'>
        <span>총 상품금액</span>
        <strong>₩ ${formatPrice(total)}</strong>
      </div>

      <button type='button' class='cart__clear' data-cart-clear>
        전체 비우기
      </button>

      <button type='button' class='cart__checkout' disabled>
        구매하기 (MVP: 비활성)
      </button>
    </footer>
  `;
}

/* ==============================
   3) 페이지 init
   ============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   // (1) 최초 렌더
   const detailed = await cartStore.getDetailedItems();
   cartEl.innerHTML = detailed.length ? renderCart(detailed) : renderEmpty();

   // (2) 상태가 바뀌면 자동으로 다시 렌더
   // - 장바구니 담기/삭제/수량변경이 발생하면 UI가 즉시 갱신됨
   cartStore.subscribe(async () => {
      const nextDetailed = await cartStore.getDetailedItems();
      cartEl.innerHTML = nextDetailed.length
         ? renderCart(nextDetailed)
         : renderEmpty();
   });

   // (3) 이벤트 위임: 수량 +/- / 삭제 / 전체비우기
   cartEl.addEventListener('click', (e) => {
      const itemEl = e.target.closest('[data-cart-item]');
      const productId = itemEl?.getAttribute('data-product-id');

      // 전체 비우기
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      if (!productId) return;

      // 삭제
      if (e.target.closest('[data-remove]')) {
         cartStore.remove(productId);
         return;
      }

      // 수량 증가/감소
      const state = cartStore.getState();
      const current =
         state.items.find((it) => it.productId === productId)?.qty || 1;

      if (e.target.closest('[data-qty-inc]')) {
         cartStore.updateQty(productId, current + 1);
         return;
      }

      if (e.target.closest('[data-qty-dec]')) {
         cartStore.updateQty(productId, current - 1);
      }
   });
}
