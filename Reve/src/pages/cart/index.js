/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 * - 배송비/무료배송 기준
 * - 쿠폰 적용(실제 할인 반영)
 * - 쿠폰 선택 상태 localStorage 유지
 * - "적용 가능한 쿠폰만" 노출
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/format.js';

const FREE_SHIPPING_THRESHOLD = 300000;
const SHIPPING_FEE = 3000;

const COUPONS = [
   { code: 'WELCOME', label: 'WELCOME 10%', rate: 0.1 },
   { code: 'SEASON', label: 'SEASON 8%', rate: 0.08 },
   { code: 'VIP', label: 'VIP 12%', rate: 0.12 },
   { code: 'APP_ONLY', label: 'APP_ONLY 7%', rate: 0.07 },
   { code: 'BUNDLE', label: 'BUNDLE 5%', rate: 0.05 },
];

const COUPON_STORAGE_KEY = 'eclat_cart_coupon';

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

/* ==============================
   계산 유틸
   ============================== */

function calcSubtotal(detailedItems) {
   return detailedItems.reduce(
      (acc, row) => acc + row.product.price * row.qty,
      0,
   );
}

function calcShipping(subtotal) {
   if (subtotal <= 0) return 0;
   return subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
}

/**
 * ✅ 특정 쿠폰이 실제로 적용 가능한 라인아이템 개수
 * 조건:
 * - couponEligible === true
 * - couponTags에 coupon.code 포함
 * - couponRateCap > 0 (의미 있는 캡)
 */
function countEligibleForCoupon(detailedItems, coupon) {
   if (!coupon) return 0;

   return detailedItems.filter(({ product }) => {
      if (!product?.couponEligible) return false;

      const tags = Array.isArray(product?.couponTags) ? product.couponTags : [];
      if (!tags.includes(coupon.code)) return false;

      const cap = Number(product?.couponRateCap ?? 0);
      return cap > 0;
   }).length;
}

/**
 * ✅ 장바구니 기준으로 "선택 가능한 쿠폰"만 필터링
 * - 최소 1개 이상 적용 가능한 상품이 있을 때만 노출
 */
function getApplicableCoupons(detailedItems) {
   return COUPONS.filter((c) => countEligibleForCoupon(detailedItems, c) > 0);
}

/**
 * ✅ 쿠폰 할인 계산(실제 적용)
 * - couponEligible + couponTags + couponRateCap 기준
 */
function calcCouponDiscount(detailedItems, coupon) {
   if (!coupon) return 0;

   const total = detailedItems.reduce((acc, row) => {
      const p = row.product;
      const qty = row.qty;

      if (!p?.couponEligible) return acc;

      const tags = Array.isArray(p?.couponTags) ? p.couponTags : [];
      if (!tags.includes(coupon.code)) return acc;

      const price = Number(p.price ?? 0);
      const cap = Number(p.couponRateCap ?? 0);
      if (cap <= 0) return acc;

      const appliedRate = Math.min(coupon.rate, cap);
      return acc + price * qty * appliedRate;
   }, 0);

   // 보기 좋게 내림(원 단위)
   return Math.floor(total);
}

/* ==============================
   쿠폰 선택 저장/복구
   ============================== */

function loadSavedCouponCode() {
   try {
      return String(localStorage.getItem(COUPON_STORAGE_KEY) || '');
   } catch {
      return '';
   }
}

function saveCouponCode(code) {
   try {
      if (!code) localStorage.removeItem(COUPON_STORAGE_KEY);
      else localStorage.setItem(COUPON_STORAGE_KEY, String(code));
   } catch {
      // storage 불가 환경이면 그냥 무시(MVP)
   }
}

/* ==============================
   렌더
   ============================== */

function renderCart(detailedItems, selectedCouponCode) {
   const subtotal = calcSubtotal(detailedItems);
   const shipping = calcShipping(subtotal);

   // ✅ 적용 가능한 쿠폰만 보여주기
   const applicableCoupons = getApplicableCoupons(detailedItems);

   // ✅ 선택된 쿠폰이 현재 장바구니에서 유효한지 확인
   const selectedCoupon =
      applicableCoupons.find((c) => c.code === selectedCouponCode) ?? null;

   const eligibleCountForSelected = selectedCoupon
      ? countEligibleForCoupon(detailedItems, selectedCoupon)
      : 0;

   const couponDiscount = selectedCoupon
      ? calcCouponDiscount(detailedItems, selectedCoupon)
      : 0;

   const total = Math.max(0, subtotal - couponDiscount) + shipping;

   const freeShippingText =
      subtotal <= 0
         ? '담긴 상품이 없어요.'
         : subtotal < FREE_SHIPPING_THRESHOLD
           ? `무료배송까지 ₩ ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} 남음`
           : '무료배송 적용 ✅';

   const canCheckout = detailedItems.length > 0 && total > 0;

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
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

      <aside class='cart__summary' aria-label='Cart Summary'>
        <p class='cart__hint'>${freeShippingText}</p>

        <div class='cart__coupon'>
          <p class='cart__coupon-title'>쿠폰</p>

          <select class='cart__coupon-select' data-coupon-select>
            <option value=''>선택 안 함</option>
            ${
               applicableCoupons.length
                  ? applicableCoupons
                       .map(
                          (c) => `
                            <option value='${c.code}' ${
                               c.code === selectedCouponCode ? 'selected' : ''
                            }>
                              ${c.label}
                            </option>
                          `,
                       )
                       .join('')
                  : `<option value='' disabled>적용 가능한 쿠폰 없음</option>`
            }
          </select>

          <p class='cart__coupon-meta'>
            ${
               selectedCoupon
                  ? `쿠폰 적용 (${eligibleCountForSelected}개 상품 가능)`
                  : '쿠폰 적용 상품을 선택해 주세요'
            }
          </p>
        </div>

        <div class='cart__row'>
          <span>상품 합계</span>
          <strong>₩ ${formatPrice(subtotal)}</strong>
        </div>

        <div class='cart__row'>
          <span>쿠폰 할인</span>
          <strong>- ₩ ${formatPrice(couponDiscount)}</strong>
        </div>

        <div class='cart__row'>
          <span>배송비</span>
          <strong>₩ ${formatPrice(shipping)}</strong>
        </div>

        <div class='cart__row cart__row--total'>
          <span>최종 결제금액</span>
          <strong>₩ ${formatPrice(total)}</strong>
        </div>

        <button type='button' class='cart__clear' data-cart-clear>
          전체 비우기
        </button>

        <button type='button' class='cart__checkout' ${
           canCheckout ? '' : 'disabled'
        }>
          구매하기 ${canCheckout ? '' : '(조건 미충족)'}
        </button>
      </aside>
    </div>
  `;
}

/* ==============================
   init
   ============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   // ✅ 새로고침 유지: 저장된 쿠폰 코드 불러오기
   let selectedCouponCode = loadSavedCouponCode();

   async function paint() {
      const detailed = await cartStore.getDetailedItems();

      if (!detailed.length) {
         cartEl.innerHTML = renderEmpty();
         return;
      }

      // ✅ 현재 장바구니 기준으로 선택 쿠폰 유효성 검증
      const applicableCoupons = getApplicableCoupons(detailed);
      const isValid = applicableCoupons.some(
         (c) => c.code === selectedCouponCode,
      );

      // 유효하지 않으면 초기화(장바구니 구성 바뀌면 발생 가능)
      if (selectedCouponCode && !isValid) {
         selectedCouponCode = '';
         saveCouponCode('');
      }

      cartEl.innerHTML = renderCart(detailed, selectedCouponCode);
   }

   await paint();

   cartStore.subscribe(async () => {
      await paint();
   });

   cartEl.addEventListener('change', async (e) => {
      const select = e.target.closest('[data-coupon-select]');
      if (!select) return;

      selectedCouponCode = String(select.value || '');
      saveCouponCode(selectedCouponCode); // ✅ 선택값 저장

      await paint();
   });

   cartEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      const itemEl = e.target.closest('[data-cart-item]');
      const key = itemEl?.getAttribute('data-cart-key');
      if (!key) return;

      if (e.target.closest('[data-remove]')) {
         cartStore.remove(key);
         return;
      }

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
