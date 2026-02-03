/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 *
 * 포함 기능
 * - 무료배송 기준선 + 배송비(30만원 미만 3,000원)
 * - 쿠폰 적용 가능 상품(라인) 개수 표시
 * - 보유 쿠폰 라디오 선택 + 확인 모달 후 적용/해제 (즉시 적용 X)
 * - 기본 세일(product.price) + 쿠폰 할인(pricing.js) 누적 반영
 * - checkout 버튼 활성화: (아이템 >= 1) && (최종금액 > 0)
 *
 * 옵션(사이즈) 기능
 * - Cart에서도 상품리스트와 동일한 "사이즈 pill" UI 제공
 * - pill 클릭 → 확인 모달 → cartStore.updateOptions(key, { size })
 * - 동일 라인이 있으면 병합될 수 있음(스토어 정책)
 *
 * 멤버십(등급/적립) 표시
 * - membership.js 단일 소스로 현재등급/적립률/예상 적립포인트/다음등급까지 표시
 *
 * 주문 저장
 * - 결제 성공 직후 orderStore.createOrder(payload) 저장 → MyPage 주문내역 즉시 반영
 *
 * 포인트 정책
 * - 상품금액만 적립(배송비 제외)
 *
 * 배송지 UX
 * - Cart 요약에 기본 배송지 노출
 * - 변경 클릭 시 /mypage?tab=address 이동
 * - 결제 시 기본 배송지 없으면 등록 유도 후 결제 중단
 * - 주문 payload에 배송지 스냅샷 포함(주문 당시 주소 보존)
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';
import { orderStore } from '../../store/orderStore.js';
import { addressStore } from '../../store/addressStore.js';

import { formatPrice } from '../../utils/format.js';
import { calcLinePrice } from '../../utils/pricing.js';

import { initToast } from '../../components/Toast.js';
import { confirmModal } from '../../components/ConfirmModal.js';

import {
   getMembershipSnapshot,
   formatPercent,
   getUpgradedTiers,
   getUpgradeCouponCode,
} from '../../utils/membership.js';

const FREE_SHIPPING_THRESHOLD = 300000;
const SHIPPING_FEE = 3000;

/* ==============================
   1) Page Template
============================== */

export const CartPage = () => {
   return `
    <section class="page cart-page" aria-label="Cart Page">
      <header class="page__header">
        <h1 class="page__title">장바구니</h1>
        <p class="page__desc">담은 상품을 확인하고 수량/합계를 조정합니다.</p>
      </header>

      <div class="page__content">
        <div class="cart" data-cart>
          <p class="loading">불러오는 중...</p>
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
    <div class="cart-empty">
      <p class="empty">장바구니가 비어 있습니다.</p>
      <a class="btn" href="/product" data-link>상품 보러가기</a>
    </div>
  `;
}

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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

function getSizeOptions(product) {
   const apparel = Array.isArray(product?.apparelSizes)
      ? product.apparelSizes
      : [];
   const shoe = Array.isArray(product?.shoeSizes) ? product.shoeSizes : [];
   const shoeText = shoe.map((s) => String(s));

   return [...apparel, ...shoeText]
      .map((v) => String(v).trim())
      .filter(Boolean);
}

function getInCartSizeSet(items, productId) {
   const set = new Set();
   items.forEach((it) => {
      if (it.id !== productId) return;
      const size = String(it.options?.size ?? '').trim();
      if (size) set.add(size);
   });
   return set;
}

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

/* ==============================
   3) Address Helpers
============================== */

function getDefaultAddressSafe() {
   const addr = addressStore.getDefault?.();
   if (addr && typeof addr === 'object') return addr;

   const list = addressStore.getAddresses?.();
   const addresses = Array.isArray(list) ? list : [];
   return addresses.find((a) => Boolean(a?.isDefault)) ?? null;
}

function buildShippingAddressSnapshot(address) {
   if (!address) return null;

   return {
      id: String(address.id || '').trim(),
      label: String(address.label || '').trim(),
      receiver: String(address.receiver || '').trim(),
      phone: String(address.phone || '').trim(),
      zip: String(address.zip || '').trim(),
      address1: String(address.address1 || '').trim(),
      address2: String(address.address2 || '').trim(),
   };
}

function renderShippingAddressSummary(address) {
   if (!address) {
      return `
        <div class="cart__address" aria-label="배송지">
          <div class="cart__row">
            <span>배송지</span>
            <strong class="pill">미등록</strong>
          </div>
          <p class="cart__couponmsg">결제를 진행하려면 배송지를 등록해야 합니다.</p>
          <button type="button" class="btn" data-address-open>배송지 등록</button>
        </div>
      `;
   }

   const label = address.label ? `(${escapeHtml(address.label)})` : '';
   const line = `(${escapeHtml(address.zip)}) ${escapeHtml(
      address.address1,
   )}${address.address2 ? ` ${escapeHtml(address.address2)}` : ''}`;

   return `
      <div class="cart__address" aria-label="배송지">
        <div class="cart__row">
          <span>배송지</span>
          <strong>${escapeHtml(address.receiver)} ${label}</strong>
        </div>
        <p class="cart__couponmsg">${line}</p>
        <button type="button" class="btn subtle" data-address-open>변경</button>
      </div>
   `;
}

async function ensureDefaultAddress() {
   const addr = getDefaultAddressSafe();
   if (addr) return { ok: true, address: addr };

   const go = await confirmModal({
      title: '배송지 등록 필요',
      message:
         '결제를 진행하려면 기본 배송지를 등록해야 합니다.\n마이페이지에서 배송지를 추가할까요?',
      confirmText: '배송지 등록',
      cancelText: '취소',
   });

   if (go) {
      window.dispatchEvent(
         new CustomEvent('app:navigate', {
            detail: { href: '/mypage?tab=address' },
         }),
      );
   }

   return { ok: false, address: null };
}

/* ==============================
   4) Coupon / Size Render
============================== */

function renderCouponSection({ owned, appliedCoupon, eligibleCount }) {
   const usableCoupons = owned.filter((c) => !c.used);
   const canApplyAny = eligibleCount > 0;

   if (!usableCoupons.length) {
      return `
       <div class="cart__coupon">
         <div class="cart__row">
           <span>쿠폰 적용 가능</span>
           <strong>${eligibleCount}개</strong>
         </div>
         <p class="cart__couponmsg">
           보유 쿠폰이 없습니다. <a href="/mypage" data-link>마이페이지</a>에서 등록해 주세요.
         </p>
       </div>
     `;
   }

   return `
     <div class="cart__coupon" aria-label="쿠폰">
       <div class="cart__row">
         <span>쿠폰 적용 가능</span>
         <strong>${eligibleCount}개</strong>
       </div>

       ${
          !canApplyAny
             ? `<p class="cart__couponmsg">쿠폰 적용 가능한 상품이 없습니다.</p>`
             : `<p class="cart__couponmsg">쿠폰 선택 후 확인 시 적용됩니다.</p>`
       }

       <div class="cart__couponlist" role="group" aria-label="쿠폰 선택">
         ${usableCoupons
            .map((c) => {
               const pct = Math.round(Number(c.rate || 0) * 100);
               const checked = appliedCoupon?.code === c.code ? 'checked' : '';
               const disabled = canApplyAny ? '' : 'disabled';

               return `
                 <label class="cart__couponitem">
                   <input
                     type="radio"
                     name="cart-coupon"
                     value="${escapeHtml(c.code)}"
                     data-coupon-radio
                     ${checked}
                     ${disabled}
                   />
                   <span class="cart__couponmeta">
                     <strong>${escapeHtml(c.code)}</strong> · ${pct}% · ${escapeHtml(
                        c.title,
                     )}
                   </span>
                 </label>
               `;
            })
            .join('')}
       </div>

       <p class="cart__couponstatus" data-coupon-msg>
         ${
            appliedCoupon
               ? `적용 중: ${escapeHtml(appliedCoupon.code)}`
               : '현재 적용된 쿠폰 없음'
         }
       </p>
     </div>
   `;
}

function renderSizePills({ product, currentSize, inCartSizeSet }) {
   const sizes = getSizeOptions(product);
   if (!sizes.length) return '';

   return `
     <div class="cart-item__sizes" aria-label="사이즈 선택">
       ${sizes
          .map((v) => {
             const isActive = currentSize === v;
             const isInCart = inCartSizeSet.has(v);

             return `
               <button
                 type="button"
                 class="size-pill ${isActive ? 'is-active' : ''} ${
                    isInCart ? 'is-in-cart' : ''
                 }"
                 data-cart-size-pill
                 data-size-value="${escapeHtml(v)}"
                 aria-pressed="${isActive ? 'true' : 'false'}"
                 title="사이즈 ${escapeHtml(v)}"
               >
                 ${escapeHtml(v)}
               </button>
             `;
          })
          .join('')}
     </div>
   `;
}

/* ==============================
   5) Main Render
============================== */

function renderCart(detailedItems) {
   const appliedCoupon = couponStore.getAppliedCoupon();
   const { owned } = couponStore.getState();

   const pricingCore = calcCartPricing(detailedItems, appliedCoupon);

   const shipping = calcShipping(pricingCore.totalAfterCoupon);
   const total = pricingCore.totalAfterCoupon + shipping;

   const eligibleCount = countCouponEligibleLines(detailedItems);

   const freeShippingText =
      pricingCore.totalAfterCoupon <= 0
         ? '담긴 상품이 없습니다.'
         : pricingCore.totalAfterCoupon < FREE_SHIPPING_THRESHOLD
           ? `무료배송까지 ₩ ${formatPrice(
                FREE_SHIPPING_THRESHOLD - pricingCore.totalAfterCoupon,
             )} 남았습니다.`
           : '무료배송이 적용됩니다.';

   const canCheckout = detailedItems.length > 0 && total > 0;

   const rawItems = cartStore.getState()?.items ?? [];

   const user = authStore.getUser?.();
   const pointsBase = pricingCore.totalAfterCoupon;

   const { tierInfo, earnRate, expectedPoints } = getMembershipSnapshot({
      totalSpent: user?.totalSpent ?? 0,
      checkoutTotal: pointsBase,
   });

   const defaultAddress = getDefaultAddressSafe();

   return `
    <div class="cart-layout" aria-label="Cart Layout">
      <div class="cart__list" aria-label="Cart Items">
        ${pricingCore.computedRows
           .map(({ key, product, qty, options, computed }) => {
              const currentSize = String(options?.size ?? '').trim();
              const inCartSizeSet = getInCartSizeSet(rawItems, product?.id);

              const optionText = options?.size ? `사이즈: ${options.size}` : '';

              const hasBaseSale =
                 Number(product.basePrice ?? 0) > Number(product.price ?? 0);

              const hasCouponDiscount = computed.couponDiscount > 0;

              return `
                <article class="cart-item" data-cart-item data-cart-key="${escapeHtml(
                   key,
                )}">
                  <div class="cart-item__info">
                    <p class="cart-item__name">${escapeHtml(product.name)}</p>

                    <div class="cart-item__pricebox">
                      ${
                         hasBaseSale
                            ? `<span class="cart-item__base">₩ ${formatPrice(
                                 product.basePrice,
                              )}</span>`
                            : ''
                      }
                      <p class="cart-item__price">₩ ${formatPrice(
                         product.price,
                      )}</p>
                      ${
                         hasCouponDiscount
                            ? `<p class="cart-item__coupon">쿠폰 -₩ ${formatPrice(
                                 computed.couponDiscount,
                              )}</p>`
                            : ''
                      }
                    </div>
                  </div>

                  ${
                     optionText
                        ? `<p class="cart-item__meta">${escapeHtml(optionText)}</p>`
                        : ''
                  }

                  ${renderSizePills({ product, currentSize, inCartSizeSet })}

                  <div class="cart-item__controls" aria-label="Quantity Controls">
                    <button type="button" data-qty-dec aria-label="Decrease quantity">-</button>
                    <span class="cart-item__qty" data-qty>${qty}</span>
                    <button type="button" data-qty-inc aria-label="Increase quantity">+</button>
                  </div>

                  <button type="button" class="cart-item__remove" data-remove aria-label="Remove item">
                    삭제
                  </button>
                </article>
              `;
           })
           .join('')}
      </div>

      <aside class="cart__summary" aria-label="Cart Summary">
        <p class="cart__hint">${freeShippingText}</p>

        ${renderShippingAddressSummary(defaultAddress)}

        <div class="cart__membership" aria-label="회원 등급 및 적립">
          <div class="cart__row">
            <span>회원 등급</span>
            <strong>${tierInfo.current.name} · 적립 ${formatPercent(
               earnRate,
            )}</strong>
          </div>

          <div class="cart__row">
            <span>이번 결제 적립 예상</span>
            <strong>${formatPrice(expectedPoints)}P</strong>
          </div>

          <div class="cart__row cart__row--muted">
            <span>다음 등급까지</span>
            <strong>${
               tierInfo.next
                  ? `₩ ${formatPrice(tierInfo.remainToNext)}`
                  : '최고 등급'
            }</strong>
          </div>
        </div>

        ${renderCouponSection({ owned, appliedCoupon, eligibleCount })}

        <div class="cart__row">
          <span>상품 합계(세일 반영)</span>
          <strong>₩ ${formatPrice(pricingCore.subtotalAfterSale)}</strong>
        </div>

        <div class="cart__row">
          <span>쿠폰 할인</span>
          <strong>-₩ ${formatPrice(pricingCore.couponDiscountTotal)}</strong>
        </div>

        <div class="cart__row">
          <span>배송비</span>
          <strong>₩ ${formatPrice(shipping)}</strong>
        </div>

        <div class="cart__row cart__row--total">
          <span>최종 결제금액</span>
          <strong>₩ ${formatPrice(total)}</strong>
        </div>

        <button type="button" class="cart__clear" data-cart-clear>
          전체 비우기
        </button>

        <button
          type="button"
          class="cart__checkout"
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
   6) Checkout Flow
============================== */

function buildCheckoutPayload({
   detailedItems,
   pricing,
   appliedCoupon,
   shippingAddress,
}) {
   const user = authStore.getUser?.();

   return {
      orderId: `order_${Date.now()}`,
      userId: user?.id ?? null,
      shippingAddress: buildShippingAddressSnapshot(shippingAddress),

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

async function handleCheckout({ detailedItems, shippingAddress }) {
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
      shippingAddress,
   });

   const result = await checkout(payload);
   if (!result?.ok) return { ok: false };

   if (payload?.userId) {
      orderStore.createOrder({
         ...payload,
         status: 'PAID',
      });
   }

   if (appliedCoupon?.code) {
      couponStore.markUsed?.(appliedCoupon.code);
      couponStore.clearApplied?.();
   }

   const userBefore = authStore.getUser?.();
   const prevSpent = Number(userBefore?.totalSpent ?? 0);
   const prevPoints = Number(userBefore?.points ?? 0);

   const addedSpent = Number(payload.pricing.total || 0);
   const nextSpent = prevSpent + addedSpent;

   const pointsBase = Number(payload.pricing.totalAfterCoupon || 0);

   const snap = getMembershipSnapshot({
      totalSpent: nextSpent,
      checkoutTotal: pointsBase,
   });

   const earnedPoints = Number(snap.expectedPoints || 0);
   const nextPoints = prevPoints + earnedPoints;

   authStore.updateUser?.({
      totalSpent: nextSpent,
      points: nextPoints,
   });

   const grantedUpgradeCoupons = [];

   if (userBefore?.id) {
      const upgradedTiers = getUpgradedTiers({
         prevTotalSpent: prevSpent,
         nextTotalSpent: nextSpent,
      });

      upgradedTiers.forEach((tier) => {
         const tierName = String(tier?.name || '').trim();
         if (!tierName) return;

         const code = getUpgradeCouponCode(tierName);
         if (!code) return;

         const r = couponStore.register?.(code);
         if (r?.ok) grantedUpgradeCoupons.push(code);
      });
   }

   cartStore.clear?.();

   return {
      ok: true,
      payload,
      receipt: result.data,
      earnedPoints,
      grantedUpgradeCoupons,
   };
}

/* ==============================
   7) Page init
============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;

   const toast = initToast();
   let paintSeq = 0;

   const paint = async () => {
      const seq = ++paintSeq;
      const detailed = await cartStore.getDetailedItems();
      if (seq !== paintSeq) return;

      cartEl.innerHTML = detailed.length ? renderCart(detailed) : renderEmpty();
   };

   await paint();

   cartStore.subscribe(() => paint());
   couponStore.subscribe(() => paint());
   addressStore.subscribe?.(() => paint());

   cartEl.addEventListener('click', async (e) => {
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      if (e.target.closest('[data-address-open]')) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', {
               detail: { href: '/mypage?tab=address' },
            }),
         );
         return;
      }

      const couponInput = e.target.closest('[data-coupon-radio]');
      if (couponInput) {
         e.preventDefault();

         const applied = couponStore.getAppliedCoupon();
         const currentCode = String(applied?.code || '').trim();

         const nextCode = String(couponInput.value || '')
            .trim()
            .toUpperCase();

         const detailed = await cartStore.getDetailedItems();
         const eligibleCount = countCouponEligibleLines(detailed);

         if (eligibleCount <= 0) {
            toast.show('쿠폰 적용 가능한 상품이 없습니다.', { duration: 1400 });
            await paint();
            return;
         }

         if (currentCode && nextCode === currentCode) {
            const ok = await confirmModal({
               title: '쿠폰 해제',
               message: `쿠폰(${currentCode})을 해제할까요?`,
               confirmText: '해제',
               cancelText: '유지',
            });

            if (ok) {
               couponStore.clearApplied();
               toast.show('쿠폰이 해제되었습니다.', { duration: 1400 });
            }

            await paint();
            return;
         }

         const owned = couponStore.getState()?.owned ?? [];
         const picked = owned.find((c) => c.code === nextCode);

         const title = String(picked?.title || nextCode);
         const pct = Math.round(Number(picked?.rate || 0) * 100);

         const ok = await confirmModal({
            title: '쿠폰 적용',
            message: `쿠폰 "${title}" (${pct}%)을 사용하시겠습니까?`,
            confirmText: '적용',
            cancelText: '취소',
         });

         if (ok) {
            const result = couponStore.apply(nextCode);
            if (result?.ok) {
               toast.show('쿠폰이 적용되었습니다.', { duration: 1400 });
            } else {
               toast.show(result?.message || '쿠폰 적용에 실패했습니다.', {
                  duration: 1400,
               });
            }
         }

         await paint();
         return;
      }

      if (e.target.closest('[data-checkout]')) {
         const detailed = await cartStore.getDetailedItems();
         if (!detailed.length) return;

         const addressGuard = await ensureDefaultAddress();
         if (!addressGuard.ok) return;

         const okPay = await confirmModal({
            title: '결제 확인',
            message: '결제를 진행할까요?',
            confirmText: '결제하기',
            cancelText: '취소',
         });
         if (!okPay) return;

         const result = await handleCheckout({
            detailedItems: detailed,
            shippingAddress: addressGuard.address,
         });

         if (!result?.ok) {
            toast.show('결제에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
               duration: 1600,
            });
            return;
         }

         const pricing = result?.payload?.pricing;
         const coupon = result?.payload?.coupon;
         const orderId = String(result?.payload?.orderId || '').trim();

         const granted = Array.isArray(result?.grantedUpgradeCoupons)
            ? result.grantedUpgradeCoupons
            : [];

         const upgradeLines =
            granted.length > 0 ? `승급 쿠폰 지급: ${granted.join(', ')}` : '';

         const user = authStore.getUser?.();
         const { tierInfo } = getMembershipSnapshot({
            totalSpent: user?.totalSpent ?? 0,
            checkoutTotal: Number(pricing?.totalAfterCoupon ?? 0),
         });

         const summaryLines = [
            coupon?.code ? `사용 쿠폰: ${coupon.code}` : '사용 쿠폰: 없음',
            `배송비: ₩ ${formatPrice(pricing?.shipping ?? 0)}`,
            `최종 결제: ₩ ${formatPrice(pricing?.total ?? 0)}`,
            upgradeLines,
         ]
            .filter(Boolean)
            .join('\n');

         const tierLines = [
            `현재 등급: ${tierInfo.current.name}`,
            tierInfo.next
               ? `다음 등급(${tierInfo.next.name})까지 ₩ ${formatPrice(
                    tierInfo.remainToNext,
                 )} 남았습니다.`
               : '최고 등급을 유지 중입니다.',
         ].join('\n');

         const go = await confirmModal({
            title: '결제 완료',
            message: `결제가 완료되었습니다.\n\n${summaryLines}\n\n${tierLines}`,
            confirmText: '주문 확인',
            cancelText: '계속 쇼핑',
         });

         if (go) {
            window.dispatchEvent(
               new CustomEvent('app:navigate', {
                  detail: {
                     href: orderId
                        ? `/checkout/success?orderId=${orderId}`
                        : `/mypage`,
                  },
               }),
            );
         } else {
            window.dispatchEvent(
               new CustomEvent('app:navigate', {
                  detail: { href: '/product' },
               }),
            );
         }

         return;
      }

      const sizeBtn = e.target.closest('[data-cart-size-pill]');
      if (sizeBtn) {
         const itemEl = sizeBtn.closest('[data-cart-item]');
         const key = itemEl?.getAttribute('data-cart-key');
         if (!key) return;

         const nextSize = String(
            sizeBtn.getAttribute('data-size-value') || '',
         ).trim();
         if (!nextSize) return;

         const state = cartStore.getState();
         const currentLine = state.items.find((it) => it.key === key);
         const prevSize = String(currentLine?.options?.size || '').trim();

         if (prevSize && prevSize === nextSize) return;

         const ok = await confirmModal({
            title: '사이즈 변경',
            message: prevSize
               ? `현재 선택된 사이즈는 ${prevSize}입니다.\n${nextSize}(으)로 변경할까요?`
               : `${nextSize}(으)로 선택할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         const result = cartStore.updateOptions(key, { size: nextSize });

         if (!result?.ok) {
            toast.show(result?.message || '사이즈 변경에 실패했습니다.', {
               duration: 1400,
            });
            return;
         }

         sizeBtn.disabled = true;
         setTimeout(() => {
            sizeBtn.disabled = false;
         }, 350);

         toast.show('사이즈가 변경되었습니다.', { duration: 1400 });
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
