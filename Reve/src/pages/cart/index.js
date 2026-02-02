/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 *
 * ✅ 포함 기능
 * - 무료배송 기준선 + 배송비(30만원 미만 3,000원)
 * - 쿠폰 적용 가능 상품(라인) 개수 표시
 * - 보유 쿠폰 선택 적용/해제 (새로고침 유지: couponStore)
 * - 기본 세일(product.price) + 쿠폰 할인(pricing.js) 누적 반영
 * - checkout 버튼 활성화: (아이템 >= 1) && (최종금액 > 0)
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { couponStore } from '../../store/couponStore.js';
import { formatPrice } from '../../utils/format.js';
import { calcLinePrice } from '../../utils/pricing.js';

const FREE_SHIPPING_THRESHOLD = 300000;
const SHIPPING_FEE = 3000;

/* ==============================
   1) Page Template
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
   2) Render Utils
   ============================== */

function renderEmpty() {
   return `
    <div class='cart-empty'>
      <p class='empty'>장바구니가 비어 있어요.</p>
      <a class='btn' href='/product' data-link>상품 보러가기</a>
    </div>
  `;
}

function clamp(n, min, max) {
   return Math.max(min, Math.min(max, n));
}

function calcShipping(subtotalAfterCoupon) {
   if (subtotalAfterCoupon <= 0) return 0;
   return subtotalAfterCoupon < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
}

function countCouponEligibleLines(detailedItems) {
   // ✅ 라인아이템 기준(옵션이 다르면 라인도 다름)
   return detailedItems.filter((row) => Boolean(row.product?.couponEligible))
      .length;
}

/**
 * Cart 요약 계산
 * - pricing.js(calcLinePrice)가 "기본 세일 + 쿠폰" 반영을 담당
 */
function calcCartPricing(detailedItems, coupon) {
   let subtotalAfterSale = 0; // product.price(세일 반영가) 기준 합
   let couponDiscountTotal = 0; // 쿠폰 할인 총액(라인 단가 기준 * qty)
   let totalAfterCoupon = 0; // 쿠폰까지 반영된 상품 합계

   const computedRows = detailedItems.map((row) => {
      const qty = clamp(Number(row.qty || 1), 1, 99);

      const computed = calcLinePrice({
         product: row.product,
         qty,
         coupon, // {code,title,rate} | null
      });

      // priceAfterSale / couponDiscount 는 "단가 기준"으로 반환된다는 전제(pricing.js)
      subtotalAfterSale += computed.priceAfterSale * qty;
      couponDiscountTotal += computed.couponDiscount * qty;
      totalAfterCoupon += computed.lineTotal;

      return { ...row, computed };
   });

   return {
      computedRows,
      subtotalAfterSale,
      couponDiscountTotal,
      totalAfterCoupon,
   };
}

function renderCouponSection({ owned, appliedCoupon, eligibleCount }) {
   const usableCoupons = owned.filter((c) => !c.used);

   // ✅ 쿠폰 적용 가능한 상품이 없으면: 선택 UI는 보여도 비활성/안내
   const canApplyAny = eligibleCount > 0;

   if (!usableCoupons.length) {
      return `
      <div class='cart__coupon'>
        <div class='cart__row'>
          <span>쿠폰 적용 가능</span>
          <strong>${eligibleCount}개</strong>
        </div>
        <p class='cart__couponmsg'>
          보유 쿠폰이 없어요. <a href='/mypage' data-link>마이페이지</a>에서 등록해 주세요.
        </p>
      </div>
    `;
   }

   return `
    <div class='cart__coupon'>
      <div class='cart__row'>
        <span>쿠폰 적용 가능</span>
        <strong>${eligibleCount}개</strong>
      </div>

      ${
         !canApplyAny
            ? `<p class='cart__couponmsg'>쿠폰 적용 가능한 상품이 없어요.</p>`
            : `<p class='cart__couponmsg'>보유 쿠폰 중 1개를 선택해 적용할 수 있어요.</p>`
      }

      <div class='cart__couponlist' role='group' aria-label='쿠폰 선택'>
        ${usableCoupons
           .map((c) => {
              const pct = Math.round(Number(c.rate || 0) * 100);
              const checked = appliedCoupon?.code === c.code ? 'checked' : '';
              const disabled = canApplyAny ? '' : 'disabled';

              return `
              <label class='cart__couponitem'>
                <input
                  type='radio'
                  name='cart-coupon'
                  value='${c.code}'
                  data-coupon-radio
                  ${checked}
                  ${disabled}
                />
                <span class='cart__couponmeta'>
                  <strong>${c.code}</strong> · ${pct}% · ${c.title}
                </span>
              </label>
            `;
           })
           .join('')}
      </div>

      <div class='cart__couponactions'>
        <button type='button' class='cart__couponbtn' data-coupon-apply ${canApplyAny ? '' : 'disabled'}>
          적용
        </button>
        <button type='button' class='cart__couponbtn' data-coupon-clear ${appliedCoupon ? '' : 'disabled'}>
          해제
        </button>
      </div>

      <p class='cart__couponstatus' data-coupon-msg>
        ${
           appliedCoupon
              ? `적용 중: ${appliedCoupon.code} (${Math.round((appliedCoupon.rate || 0) * 100)}%)`
              : '현재 적용된 쿠폰 없음'
        }
      </p>
    </div>
  `;
}

function renderCart(detailedItems) {
   // ✅ couponStore 기준: 적용된 쿠폰 객체
   const appliedCoupon = couponStore.getAppliedCoupon(); // {code,title,rate} | null
   const { owned } = couponStore.getState();

   const {
      computedRows,
      subtotalAfterSale,
      couponDiscountTotal,
      totalAfterCoupon,
   } = calcCartPricing(detailedItems, appliedCoupon);

   // ✅ 배송비 기준은 "쿠폰까지 반영된 상품 합계"로 계산
   const shipping = calcShipping(totalAfterCoupon);
   const total = totalAfterCoupon + shipping;

   const eligibleCount = countCouponEligibleLines(detailedItems);

   const freeShippingText =
      totalAfterCoupon <= 0
         ? '담긴 상품이 없어요.'
         : totalAfterCoupon < FREE_SHIPPING_THRESHOLD
           ? `무료배송까지 ₩ ${formatPrice(FREE_SHIPPING_THRESHOLD - totalAfterCoupon)} 남음`
           : '무료배송 적용 ✅';

   const canCheckout = detailedItems.length > 0 && total > 0;

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <!-- 왼쪽: 상품 리스트 -->
      <div class='cart__list' aria-label='Cart Items'>
        ${computedRows
           .map(({ key, product, qty, options, computed }) => {
              const optionText = [
                 options?.color ? `컬러: ${options.color}` : '',
                 options?.size ? `사이즈: ${options.size}` : '',
              ]
                 .filter(Boolean)
                 .join(' · ');

              const hasBaseSale =
                 Number(product.basePrice ?? 0) > Number(product.price ?? 0);

              const hasCouponDiscount = computed.couponDiscount > 0;

              return `
              <article class='cart-item' data-cart-item data-cart-key='${key}'>
                <div class='cart-item__info'>
                  <p class='cart-item__name'>${product.name}</p>

                  <div class='cart-item__pricebox'>
                    ${
                       hasBaseSale
                          ? `<span class='cart-item__base'>₩ ${formatPrice(product.basePrice)}</span>`
                          : ''
                    }
                    <p class='cart-item__price'>₩ ${formatPrice(product.price)}</p>

                    ${
                       hasCouponDiscount
                          ? `<p class='cart-item__coupon'>쿠폰 -₩ ${formatPrice(computed.couponDiscount)}</p>`
                          : ''
                    }
                  </div>
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

        ${renderCouponSection({
           owned,
           appliedCoupon,
           eligibleCount,
        })}

        <div class='cart__row'>
          <span>상품 합계(세일 반영)</span>
          <strong>₩ ${formatPrice(subtotalAfterSale)}</strong>
        </div>

        <div class='cart__row'>
          <span>쿠폰 할인</span>
          <strong>-₩ ${formatPrice(couponDiscountTotal)}</strong>
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

        <button
          type='button'
          class='cart__checkout'
          ${canCheckout ? '' : 'disabled'}
          data-checkout
        >
          구매하기 ${canCheckout ? '' : '(조건 미충족)'}
        </button>
      </aside>
    </div>
  `;
}

/* ==============================
   3) Page init
   ============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   let paintSeq = 0;

   async function paint() {
      const seq = ++paintSeq;

      const detailed = await cartStore.getDetailedItems();
      // ✅ 느린 응답이 먼저 와서 덮어쓰는 문제 방지
      if (seq !== paintSeq) return;

      cartEl.innerHTML = detailed.length ? renderCart(detailed) : renderEmpty();
   }

   // 1) 최초 렌더
   await paint();

   // 2) 상태 변화 시 자동 갱신
   cartStore.subscribe(() => paint());
   couponStore.subscribe(() => paint());

   // 3) 이벤트 위임
   cartEl.addEventListener('click', (e) => {
      // 전체 비우기
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      // 쿠폰 적용
      if (e.target.closest('[data-coupon-apply]')) {
         const radio = cartEl.querySelector('input[data-coupon-radio]:checked');
         const msgEl = cartEl.querySelector('[data-coupon-msg]');

         const code = String(radio?.value || '')
            .trim()
            .toUpperCase();
         const result = couponStore.apply(code);

         if (msgEl) msgEl.textContent = result.message;
         return;
      }

      // 쿠폰 해제
      if (e.target.closest('[data-coupon-clear]')) {
         couponStore.clearApplied();
         return;
      }

      // (MVP) 구매하기: 실제 결제는 없으니, 적용 쿠폰이 있으면 "사용 처리" 흉내
      if (e.target.closest('[data-checkout]')) {
         const applied = couponStore.getAppliedCoupon();
         if (applied?.code) {
            couponStore.markUsed(applied.code);
         }
         // 여기서 결제 완료 페이지/토스트로 확장 가능
         return;
      }

      // 라인 아이템 조작(key 기준)
      const itemEl = e.target.closest('[data-cart-item]');
      const key = itemEl?.getAttribute('data-cart-key');
      if (!key) return;

      // 삭제
      if (e.target.closest('[data-remove]')) {
         cartStore.remove(key);
         return;
      }

      // 수량 증가/감소
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
