/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 *
 * ✅ 추가 기능(이번 작업)
 * - 장바구니에서 사이즈 변경(pill UI)
 * - 사이즈가 필요한 상품인데 선택이 없으면 checkout 비활성
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';
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
   return detailedItems.filter((row) => Boolean(row.product?.couponEligible))
      .length;
}

/** ✅ 상품의 사이즈 옵션 목록 만들기 */
function getSizeOptions(product) {
   const apparel = Array.isArray(product?.apparelSizes)
      ? product.apparelSizes
      : [];
   const shoe = Array.isArray(product?.shoeSizes) ? product.shoeSizes : [];
   const shoeText = shoe.map((s) => String(s));

   // 중복 제거 + 빈 값 제거
   const uniq = new Set(
      [...apparel, ...shoeText].map((x) => String(x).trim()).filter(Boolean),
   );
   return Array.from(uniq);
}

function hasSizeOption(product) {
   return getSizeOptions(product).length > 0;
}

/** ✅ 사이즈 pill 렌더 (장바구니에서 변경 가능) */
function renderSizePills({ key, product, selectedSize }) {
   const sizes = getSizeOptions(product);
   if (!sizes.length) return '';

   const current = String(selectedSize || '').trim();

   return `
    <div class="cart-item__size" aria-label="Size Options">
      <p class="cart-item__sizeLabel">
        사이즈
        ${current ? `<strong class="pill">${current}</strong>` : `<strong class="pill is-warn">선택 필요</strong>`}
      </p>

      <div class="cart-sizepills" role="group" aria-label="사이즈 선택">
        ${sizes
           .map((s) => {
              const active = current === s;
              return `
                <button
                  type="button"
                  class="cart-sizepill ${active ? 'is-active' : ''}"
                  data-size-pill
                  data-cart-key="${key}"
                  data-size="${s}"
                  aria-pressed="${active ? 'true' : 'false'}"
                >
                  ${s}
                </button>
              `;
           })
           .join('')}
      </div>
    </div>
  `;
}

/**
 * Cart 요약 계산
 * - pricing.js(calcLinePrice)가 "기본 세일 + 쿠폰" 반영을 담당
 */
function calcCartPricing(detailedItems, coupon) {
   let subtotalAfterSale = 0;
   let couponDiscountTotal = 0;
   let totalAfterCoupon = 0;

   const computedRows = detailedItems.map((row) => {
      const qty = clamp(Number(row.qty || 1), 1, 99);

      const computed = calcLinePrice({
         product: row.product,
         qty,
         coupon,
      });

      subtotalAfterSale += computed.priceAfterSale * qty;
      couponDiscountTotal += computed.couponDiscount * qty;
      totalAfterCoupon += computed.lineTotal;

      return { ...row, qty, computed };
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
   const appliedCoupon = couponStore.getAppliedCoupon();
   const { owned } = couponStore.getState();

   const pricingCore = calcCartPricing(detailedItems, appliedCoupon);

   const shipping = calcShipping(pricingCore.totalAfterCoupon);
   const total = pricingCore.totalAfterCoupon + shipping;

   const eligibleCount = countCouponEligibleLines(detailedItems);

   const freeShippingText =
      pricingCore.totalAfterCoupon <= 0
         ? '담긴 상품이 없어요.'
         : pricingCore.totalAfterCoupon < FREE_SHIPPING_THRESHOLD
           ? `무료배송까지 ₩ ${formatPrice(FREE_SHIPPING_THRESHOLD - pricingCore.totalAfterCoupon)} 남음`
           : '무료배송 적용 ✅';

   // ✅ 사이즈가 필요한데 선택이 없는 라인이 있는지 체크
   const hasMissingSize = pricingCore.computedRows.some((row) => {
      if (!hasSizeOption(row.product)) return false;
      return !String(row.options?.size || '').trim();
   });

   const canCheckout =
      pricingCore.computedRows.length > 0 && total > 0 && !hasMissingSize;

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <div class='cart__list' aria-label='Cart Items'>
        ${pricingCore.computedRows
           .map(({ key, product, qty, options, computed }) => {
              const optionText = [
                 options?.color ? `컬러: ${options.color}` : '',
                 // 사이즈는 아래 pill로 변경 가능하니까 meta에는 굳이 안 넣어도 됨(원하면 유지 가능)
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
                    ${hasBaseSale ? `<span class='cart-item__base'>₩ ${formatPrice(product.basePrice)}</span>` : ''}
                    <p class='cart-item__price'>₩ ${formatPrice(product.price)}</p>
                    ${hasCouponDiscount ? `<p class='cart-item__coupon'>쿠폰 -₩ ${formatPrice(computed.couponDiscount)}</p>` : ''}
                  </div>
                </div>

                ${optionText ? `<p class='cart-item__meta'>${optionText}</p>` : ''}

                <!-- ✅ 사이즈 변경 UI -->
                ${renderSizePills({
                   key,
                   product,
                   selectedSize: options?.size,
                })}

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

        ${renderCouponSection({ owned, appliedCoupon, eligibleCount })}

        <div class='cart__row'>
          <span>상품 합계(세일 반영)</span>
          <strong>₩ ${formatPrice(pricingCore.subtotalAfterSale)}</strong>
        </div>

        <div class='cart__row'>
          <span>쿠폰 할인</span>
          <strong>-₩ ${formatPrice(pricingCore.couponDiscountTotal)}</strong>
        </div>

        <div class='cart__row'>
          <span>배송비</span>
          <strong>₩ ${formatPrice(shipping)}</strong>
        </div>

        <div class='cart__row cart__row--total'>
          <span>최종 결제금액</span>
          <strong>₩ ${formatPrice(total)}</strong>
        </div>

        ${
           hasMissingSize
              ? `<p class="cart__warn">사이즈 선택이 필요한 상품이 있어요. 사이즈를 선택해 주세요.</p>`
              : ''
        }

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
   3) API-ready Checkout Flow
   ============================== */

function buildCheckoutPayload({ detailedItems, pricing, appliedCoupon }) {
   const user = authStore.getUser?.();

   return {
      orderId: `order_${Date.now()}`,
      userId: user?.id ?? null,
      items: detailedItems.map((row) => ({
         cartKey: row.key,
         productId: row.product?.id,
         name: row.product?.name,
         qty: row.qty,
         options: row.options ?? {},
         unitPrice: row.product?.price ?? 0,
         couponDiscountUnit: row.computed?.couponDiscount ?? 0,
         lineTotal: row.computed?.lineTotal ?? 0,
         couponEligible: Boolean(row.product?.couponEligible),
      })),
      coupon: appliedCoupon
         ? {
              code: appliedCoupon.code,
              rate: appliedCoupon.rate,
              title: appliedCoupon.title,
           }
         : null,
      pricing: {
         subtotalAfterSale: pricing.subtotalAfterSale,
         couponDiscountTotal: pricing.couponDiscountTotal,
         totalAfterCoupon: pricing.totalAfterCoupon,
         shipping: pricing.shipping,
         total: pricing.total,
         currency: 'KRW',
      },
      createdAt: new Date().toISOString(),
   };
}

async function checkout(payload) {
   await new Promise((r) => setTimeout(r, 350));
   return { ok: true, data: { paidAt: Date.now(), orderId: payload.orderId } };
}

async function handleCheckout({ detailedItems }) {
   const appliedCoupon = couponStore.getAppliedCoupon();

   const pricingCore = calcCartPricing(detailedItems, appliedCoupon);
   const shipping = calcShipping(pricingCore.totalAfterCoupon);
   const total = pricingCore.totalAfterCoupon + shipping;

   const payload = buildCheckoutPayload({
      detailedItems: pricingCore.computedRows,
      pricing: {
         subtotalAfterSale: pricingCore.subtotalAfterSale,
         couponDiscountTotal: pricingCore.couponDiscountTotal,
         totalAfterCoupon: pricingCore.totalAfterCoupon,
         shipping,
         total,
      },
      appliedCoupon,
   });

   const result = await checkout(payload);
   if (!result?.ok) return { ok: false };

   if (appliedCoupon?.code) {
      couponStore.markUsed?.(appliedCoupon.code);
      couponStore.clearApplied?.();
   }

   // ✅ authStore.updateUser가 없을 수도 있으니 방어
   const prev = authStore.getUser?.()?.totalSpent ?? 0;
   const nextSpent = Number(prev) + Number(payload.pricing.total || 0);
   if (authStore.updateUser) authStore.updateUser({ totalSpent: nextSpent });

   cartStore.clear?.();
   return { ok: true, payload, receipt: result.data };
}

/* ==============================
   4) Page init
   ============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   let paintSeq = 0;

   async function paint() {
      const seq = ++paintSeq;
      const detailed = await cartStore.getDetailedItems();
      if (seq !== paintSeq) return;

      cartEl.innerHTML = detailed.length ? renderCart(detailed) : renderEmpty();
   }

   await paint();

   cartStore.subscribe(() => paint());
   couponStore.subscribe(() => paint());

   cartEl.addEventListener('click', async (e) => {
      // ✅ 사이즈 pill 클릭 처리
      const sizePill = e.target.closest('[data-size-pill]');
      if (sizePill) {
         const key = String(
            sizePill.getAttribute('data-cart-key') || '',
         ).trim();
         const size = String(sizePill.getAttribute('data-size') || '').trim();
         if (!key || !size) return;

         cartStore.updateOptions?.(key, { size });
         return;
      }

      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

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

      if (e.target.closest('[data-coupon-clear]')) {
         couponStore.clearApplied();
         return;
      }

      if (e.target.closest('[data-checkout]')) {
         const detailed = await cartStore.getDetailedItems();
         if (!detailed.length) return;

         await handleCheckout({ detailedItems: detailed });
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
