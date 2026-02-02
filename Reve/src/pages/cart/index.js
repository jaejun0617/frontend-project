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
   0) UI 상태(페이지 단위)
   ============================== */

let isCouponApplied = false;

/* ==============================
   0-1) 정책 상수
   ============================== */

const SHIPPING_FREE_THRESHOLD = 300000; // 30만원 이상 무료배송
const SHIPPING_FEE = 3000; // 30만원 미만 배송비 3,000원

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

/**
 * 쿠폰 적용 가능 아이템 수(상품 종류 기준)
 * - qty가 3이어도 "상품 1개"로 카운트
 * - 원하면 "수량 기준"으로도 바꿀 수 있음
 */
function calcCouponEligibleCount(detailedItems) {
   return detailedItems.reduce((acc, row) => {
      return row.product?.couponEligible ? acc + 1 : acc;
   }, 0);
}

/**
 * 가격 breakdown 계산
 * - baseTotal: 정가 합계(basePrice 우선)
 * - saleTotal: 현재 판매가(price) 합계
 * - saleDiscount: 정가 - 판매가
 * - couponDiscount: 쿠폰 적용 시 추가 할인(상품별 couponRateCap)
 * - shippingFee: 배송비(30만원 미만 3,000원)
 * - finalTotal: saleTotal - couponDiscount + shippingFee
 */
function calcPriceBreakdown(detailedItems, { applyCoupon = false } = {}) {
   const baseTotal = detailedItems.reduce((acc, row) => {
      const base = row.product.basePrice ?? row.product.price ?? 0;
      return acc + base * row.qty;
   }, 0);

   const saleTotal = detailedItems.reduce((acc, row) => {
      const price = row.product.price ?? 0;
      return acc + price * row.qty;
   }, 0);

   const saleDiscount = Math.max(0, baseTotal - saleTotal);

   const couponDiscountRaw = applyCoupon
      ? detailedItems.reduce((acc, row) => {
           const p = row.product;

           // couponEligible + couponRateCap이 있어야 적용
           if (!p.couponEligible || !p.couponRateCap) return acc;

           const perItem = (p.price ?? 0) * p.couponRateCap;
           return acc + perItem * row.qty;
        }, 0)
      : 0;

   // ✅ 쿠폰 할인값: 1만원 단위 정리
   const couponDiscount = Math.round(couponDiscountRaw / 10000) * 10000;

   // ✅ 배송비 계산(최종 결제 기준은 보통 '할인 후 상품금액' 기준으로 잡음)
   // - 여기선 saleTotal - couponDiscount 기준으로 무료배송 판정
   const subtotalAfterDiscount = Math.max(0, saleTotal - couponDiscount);
   const shippingFee =
      subtotalAfterDiscount >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;

   const finalTotal = Math.max(0, subtotalAfterDiscount + shippingFee);

   return {
      baseTotal,
      saleTotal,
      saleDiscount,
      couponDiscount,
      shippingFee,
      finalTotal,
      subtotalAfterDiscount,
   };
}

function renderCart(detailedItems) {
   const couponEligibleCount = calcCouponEligibleCount(detailedItems);
   const breakdown = calcPriceBreakdown(detailedItems, {
      applyCoupon: isCouponApplied,
   });

   // ✅ checkout 활성 조건: 장바구니 1개 이상 + 최종금액 > 0
   const canCheckout = detailedItems.length > 0 && breakdown.finalTotal > 0;

   // ✅ 무료배송 안내 문구(감성은 살짝, 과장은 금지 😼)
   const freeShippingLeft = Math.max(
      0,
      SHIPPING_FREE_THRESHOLD - breakdown.subtotalAfterDiscount,
   );
   const shippingHint =
      breakdown.shippingFee === 0
         ? `무료배송 적용 ✅ (기준 ₩ ${formatPrice(SHIPPING_FREE_THRESHOLD)})`
         : `₩ ${formatPrice(freeShippingLeft)} 더 담으면 무료배송 🎯`;

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <!-- 왼쪽: 상품 리스트 -->
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

      <!-- 오른쪽: 요약/결제 -->
      <aside class='cart__summary' aria-label='Cart Summary'>
        <div class='cart__row'>
          <span>정가 합계</span>
          <strong>₩ ${formatPrice(breakdown.baseTotal)}</strong>
        </div>

        <div class='cart__row'>
          <span>상품 할인</span>
          <strong>- ₩ ${formatPrice(breakdown.saleDiscount)}</strong>
        </div>

        <div class='cart__row'>
          <span>쿠폰 할인</span>
          <strong>- ₩ ${formatPrice(breakdown.couponDiscount)}</strong>
        </div>

        <label class='cart__coupon-toggle'>
          <input
            type='checkbox'
            data-coupon-toggle
            ${isCouponApplied ? 'checked' : ''}
            ${couponEligibleCount === 0 ? 'disabled' : ''}
          />
          <span>
            쿠폰 적용 ${
               couponEligibleCount > 0
                  ? `( ${couponEligibleCount}개 상품 가능 )`
                  : `( 적용 가능 상품 없음 )`
            }
          </span>
        </label>

        <hr class='cart__divider' />

        <div class='cart__row'>
          <span>배송비</span>
          <strong>${
             breakdown.shippingFee === 0
                ? '무료'
                : `₩ ${formatPrice(breakdown.shippingFee)}`
          }</strong>
        </div>

        <p class='cart__shipping-hint'>${shippingHint}</p>

        <div class='cart__row cart__final'>
          <span>최종 결제금액</span>
          <strong>₩ ${formatPrice(breakdown.finalTotal)}</strong>
        </div>

        <button type='button' class='cart__clear' data-cart-clear>
          전체 비우기
        </button>

        <button
          type='button'
          class='cart__checkout'
          data-cart-checkout
          ${canCheckout ? '' : 'disabled'}
        >
          구매하기 (MVP: 비활성)
        </button>
      </aside>
    </div>
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

   // (4) 쿠폰 토글(change)
   cartEl.addEventListener('change', async (e) => {
      const toggle = e.target.closest('[data-coupon-toggle]');
      if (!toggle) return;

      // ✅ 적용 가능 상품이 없으면 강제로 OFF
      if (toggle.disabled) {
         isCouponApplied = false;
      } else {
         isCouponApplied = toggle.checked;
      }

      const nextDetailed = await cartStore.getDetailedItems();
      cartEl.innerHTML = nextDetailed.length
         ? renderCart(nextDetailed)
         : renderEmpty();
   });
}
