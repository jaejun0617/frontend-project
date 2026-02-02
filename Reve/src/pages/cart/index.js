/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/format.js';

const FREE_SHIPPING_THRESHOLD = 300000;
const SHIPPING_FEE = 3000;

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

function renderEmpty() {
   return `
    <div class='cart-empty'>
      <p class='empty'>장바구니가 비어 있어요.</p>
      <a class='btn' href='/product' data-link>상품 보러가기</a>
    </div>
  `;
}

function calcSubtotal(detailedItems) {
   return detailedItems.reduce((acc, row) => {
      const price = Number(row?.product?.price ?? 0);
      const qty = Number(row?.qty ?? 0);
      return acc + price * qty;
   }, 0);
}

function calcShipping(subtotal) {
   if (subtotal <= 0) return 0;
   return subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
}

function countCouponEligibleItems(detailedItems) {
   // 라인아이템 기준(옵션 다르면 다른 라인)
   return detailedItems.filter((row) => !!row?.product?.couponEligible).length;
}

function renderCart(detailedItems) {
   const subtotal = calcSubtotal(detailedItems);
   const shipping = calcShipping(subtotal);
   const total = subtotal + shipping;

   const couponEligibleCount = countCouponEligibleItems(detailedItems);

   const freeShippingText =
      subtotal <= 0
         ? '담긴 상품이 없어요.'
         : subtotal < FREE_SHIPPING_THRESHOLD
           ? `무료배송까지 ₩ ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} 남음`
           : '무료배송 적용 ✅';

   const canCheckout = detailedItems.length > 0 && total > 0;

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <!-- 왼쪽: 상품 리스트 -->
      <div class='cart__list' aria-label='Cart Items'>
        ${detailedItems
           .map(({ key, product, qty, options }) => {
              const optionText = [
                 options?.color ? `컬러: ${options.color}` : '',
                 options?.size ? `사이즈: ${options.size}` : '',
              ]
                 .filter(Boolean)
                 .join(' · ');

              return `
                <article class='cart-item' data-cart-item data-cart-key='${key}'>
                  <div class='cart-item__info'>
                    <p class='cart-item__name'>${product.name}</p>
                    <p class='cart-item__price'>₩ ${formatPrice(product.price)}</p>
                  </div>

                  ${optionText ? `<p class='cart-item__meta'>${optionText}</p>` : ''}

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

      <!-- 오른쪽: 요약/결제 -->
      <aside class='cart__summary' aria-label='Cart Summary'>
        <p class='cart__hint'>${freeShippingText}</p>

        <div class='cart__row'>
          <span>상품 합계</span>
          <strong>₩ ${formatPrice(subtotal)}</strong>
        </div>

        <div class='cart__row'>
          <span>배송비</span>
          <strong>₩ ${formatPrice(shipping)}</strong>
        </div>

        <div class='cart__row'>
          <span>쿠폰 적용</span>
          <strong>${couponEligibleCount}개 상품 가능</strong>
        </div>

        <div class='cart__row cart__row--total'>
          <span>최종 결제금액</span>
          <strong>₩ ${formatPrice(total)}</strong>
        </div>

        <button type='button' class='cart__clear' data-cart-clear>
          전체 비우기
        </button>

        <button type='button' class='cart__checkout' data-checkout ${canCheckout ? '' : 'disabled'}>
          구매하기 ${canCheckout ? '' : '(조건 미충족)'}
        </button>
      </aside>
    </div>
  `;
}

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   // ✅ 렌더 함수 분리(중복 호출/동시성 방지)
   let renderTick = 0;

   async function paint() {
      const myTick = ++renderTick;
      const detailed = await cartStore.getDetailedItems();
      if (myTick !== renderTick) return; // 최신 렌더만 반영

      cartEl.innerHTML = detailed.length ? renderCart(detailed) : renderEmpty();
   }

   // (1) 최초 렌더
   await paint();

   // (2) 상태 변경 시 재렌더
   // subscribe는 "즉시 1회 호출"이 기본이라,
   // 여기서는 listener 내부에서 paint만 호출하고, 최초 렌더는 위에서 끝냄.
   cartStore.subscribe(() => {
      paint();
   });

   // (3) 이벤트 위임
   cartEl.addEventListener('click', (e) => {
      // 전체 비우기
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      // 구매하기(MVP)
      const checkout = e.target.closest('[data-checkout]');
      if (checkout) {
         if (checkout.hasAttribute('disabled')) return;
         alert('MVP: 결제는 아직 비활성! 😼');
         return;
      }

      const itemEl = e.target.closest('[data-cart-item]');
      const key = itemEl?.getAttribute('data-cart-key');
      if (!key) return;

      // 삭제
      if (e.target.closest('[data-remove]')) {
         cartStore.remove(key);
         return;
      }

      // 수량 변경
      const state = cartStore.getState();
      const current = state.items.find((it) => it.key === key)?.qty || 1;

      if (e.target.closest('[data-qty-inc]')) {
         cartStore.updateQty(key, current + 1);
         return;
      }

      if (e.target.closest('[data-qty-dec]')) {
         cartStore.updateQty(key, current - 1);
      }
   });
}
