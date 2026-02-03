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
 *
 * ✅ 확장 포인트 (API-ready)
 * - buildCheckoutPayload()로 결제 요청 데이터 구성
 * - checkout()에서 실제 API 연결 가능
 *
 * ✅ 이번 추가 포인트
 * - Cart에서도 상품리스트와 동일한 "사이즈 pill" UI 제공
 * - pill 클릭 → cartStore.updateOptions(key, { size })로 사이즈 변경 + 라인 병합
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/format.js';
import { calcLinePrice } from '../../utils/pricing.js';
import { initToast } from '../../components/Toast.js';
import { confirmModal } from '../../components/ConfirmModal.js';

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

/**
 * ✅ 상품에서 사이즈 옵션 읽기 (ProductCard와 동일 규칙)
 */
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

/**
 * ✅ 같은 productId의 "이미 담긴 사이즈들" 집합
 * - Cart에서 pill에 is-in-cart 표시(실수 방지)
 */
function getInCartSizeSet(items, productId) {
   const set = new Set();
   items.forEach((it) => {
      if (it.id !== productId) return;
      const size = String(it.options?.size ?? '').trim();
      if (size) set.add(size);
   });
   return set;
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
   <div class='cart__coupon' aria-label='쿠폰'>
     <div class='cart__row'>
       <span>쿠폰 적용 가능</span>
       <strong>${eligibleCount}개</strong>
     </div>

     ${
        !canApplyAny
           ? `<p class='cart__couponmsg'>쿠폰 적용 가능한 상품이 없어요.</p>`
           : `<p class='cart__couponmsg'>쿠폰을 선택하면 확인 후 적용돼요.</p>`
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
                 value='${escapeHtml(c.code)}'
                 data-coupon-radio
                 ${checked}
                 ${disabled}
               />
               <span class='cart__couponmeta'>
                 <strong>${escapeHtml(c.code)}</strong> · ${pct}% · ${escapeHtml(c.title)}
               </span>
             </label>
           `;
          })
          .join('')}
     </div>

     <p class='cart__couponstatus' data-coupon-msg>
       ${
          appliedCoupon
             ? `적용 중: ${escapeHtml(appliedCoupon.code)}`
             : '현재 적용된 쿠폰 없음'
       }
     </p>
   </div>
 `;
}
/**
 * ✅ Cart 라인별 사이즈 pill 렌더
 * - is-active: 이 라인의 현재 사이즈
 * - is-in-cart: 같은 상품에서 다른 라인에 이미 담긴 사이즈(중복 방지/가시성)
 */
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
                class="size-pill ${isActive ? 'is-active' : ''} ${isInCart ? 'is-in-cart' : ''}"
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

   const canCheckout = detailedItems.length > 0 && total > 0;

   // ✅ 같은 상품 기준으로 is-in-cart 스타일 찍기 위해 store raw state도 사용
   const rawItems = cartStore.getState()?.items ?? [];

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <div class='cart__list' aria-label='Cart Items'>
        ${pricingCore.computedRows
           .map(({ key, product, qty, options, computed }) => {
              const currentSize = String(options?.size ?? '').trim();
              const inCartSizeSet = getInCartSizeSet(rawItems, product?.id);

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
              <article class='cart-item' data-cart-item data-cart-key='${escapeHtml(key)}'>
                <div class='cart-item__info'>
                  <p class='cart-item__name'>${escapeHtml(product.name)}</p>

                  <div class='cart-item__pricebox'>
                    ${hasBaseSale ? `<span class='cart-item__base'>₩ ${formatPrice(product.basePrice)}</span>` : ''}
                    <p class='cart-item__price'>₩ ${formatPrice(product.price)}</p>
                    ${hasCouponDiscount ? `<p class='cart-item__coupon'>쿠폰 -₩ ${formatPrice(computed.couponDiscount)}</p>` : ''}
                  </div>
                </div>

                ${optionText ? `<p class='cart-item__meta'>${escapeHtml(optionText)}</p>` : ''}

                <!-- ✅ Cart에서도 상품리스트와 동일한 사이즈 pill -->
                ${renderSizePills({ product, currentSize, inCartSizeSet })}

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

        ${renderCouponSection({
           owned,
           appliedCoupon,
           eligibleCount,
        })}

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

   const prev = authStore.getUser?.()?.totalSpent ?? 0;
   authStore.updateUser?.({
      totalSpent: Number(prev) + Number(payload.pricing.total || 0),
   });

   cartStore.clear?.();

   return { ok: true, payload, receipt: result.data };
}

/* ==============================
   4) Page init
   ============================== */

export async function initCartPage() {
   const cartEl = document.querySelector('[data-cart]');
   if (!cartEl) return;
   const toast = initToast();
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
      // ✅ 전체 비우기
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      // ✅ 쿠폰 선택/해제: 라디오 클릭 → 모달로 확정 (즉시 적용 X)
      const couponInput = e.target.closest('[data-coupon-radio]');
      if (couponInput) {
         // 현재 적용 쿠폰
         const applied = couponStore.getAppliedCoupon(); // {code,title,rate} | null
         const currentCode = String(applied?.code || '').trim();

         // 사용자가 클릭한 쿠폰
         const nextCode = String(couponInput.value || '')
            .trim()
            .toUpperCase();

         // 쿠폰 적용 가능한 라인 수(안전빵)
         const detailed = await cartStore.getDetailedItems();
         const eligibleCount = countCouponEligibleLines(detailed);

         if (eligibleCount <= 0) {
            toast.show('쿠폰 적용 가능한 상품이 없어요.', { duration: 1400 });
            await paint(); // ✅ UI를 store 기준으로 복구
            return;
         }

         // 1) 적용된 쿠폰을 다시 클릭 → 해제 시도
         if (currentCode && nextCode === currentCode) {
            const ok = await confirmModal({
               title: '쿠폰 해제',
               message: `쿠폰(${currentCode})을 사용하지 않을까요?`,
               confirmText: '해제',
               cancelText: '유지',
            });

            if (ok) {
               couponStore.clearApplied();
               toast.show('쿠폰을 해제했어요.', { duration: 1400 });
            }

            await paint(); // ✅ 취소든 확인이든 store가 진짜, UI 롤백
            return;
         }

         // 2) 다른 쿠폰 선택 → 적용 시도
         const owned = couponStore.getState()?.owned ?? [];
         const picked = owned.find((c) => c.code === nextCode);

         const title = String(picked?.title || nextCode);
         const pct = Math.round(Number(picked?.rate || 0) * 100);

         const ok = await confirmModal({
            title: '쿠폰 적용',
            message: `쿠폰 "${title}" (${pct}%)을 사용하시겠어요?`,
            confirmText: '적용',
            cancelText: '취소',
         });

         if (ok) {
            const result = couponStore.apply(nextCode);

            if (result?.ok) {
               toast.show('쿠폰이 적용됐어요 🎫', { duration: 1400 });
            } else {
               toast.show(result?.message || '쿠폰 적용에 실패했어요.', {
                  duration: 1400,
               });
            }
         }

         await paint(); // ✅ 취소 시 라디오 선택이 바뀐 것처럼 보여도 즉시 복구
         return;
      }

      // ✅ 구매하기 - 모달 확인 → Mock 결제 → 완료 모달
      if (e.target.closest('[data-checkout]')) {
         const detailed = await cartStore.getDetailedItems();
         if (!detailed.length) return;

         // 1) 결제 전 확인 모달
         const okPay = await confirmModal({
            title: '결제 확인',
            message: '결제를 진행할까요?',
            confirmText: '결제하기',
            cancelText: '취소',
         });

         if (!okPay) return;

         // 2) 결제 진행 (Mock)
         const result = await handleCheckout({ detailedItems: detailed });

         if (!result?.ok) {
            toast.show('결제에 실패했어요. 잠시 후 다시 시도해 주세요.', {
               duration: 1600,
            });
            return;
         }

         // 3) 결제 완료 모달(요약)
         const pricing = result?.payload?.pricing;
         const coupon = result?.payload?.coupon;

         const summaryLines = [
            coupon?.code
               ? `🎫 사용 쿠폰: ${coupon.code}`
               : '🎫 사용 쿠폰: 없음',
            `🚚 배송비: ₩ ${formatPrice(pricing?.shipping ?? 0)}`,
            `💳 최종 결제: ₩ ${formatPrice(pricing?.total ?? 0)}`,
         ].join('\n');

         await confirmModal({
            title: '결제 완료 ✅',
            message: `결제가 완료되었습니다.\n\n${summaryLines}`,
            confirmText: '확인',
            cancelText: '닫기',
         });

         // handleCheckout 내부에서 cartStore.clear()까지 끝났으므로 여기서 추가 처리 필요 없음
         return;
      }
      // ✅ 사이즈 변경 (pill 클릭) - 모달 확인 후 변경
      const sizeBtn = e.target.closest('[data-cart-size-pill]');
      if (sizeBtn) {
         const itemEl = sizeBtn.closest('[data-cart-item]');
         const key = itemEl?.getAttribute('data-cart-key');
         if (!key) return;

         const nextSize = String(
            sizeBtn.getAttribute('data-size-value') || '',
         ).trim();
         if (!nextSize) return;

         // 현재 라인의 사이즈 파악 (모달 문구용)
         const state = cartStore.getState();
         const currentLine = state.items.find((it) => it.key === key);
         const prevSize = String(currentLine?.options?.size || '').trim();

         // 같은 사이즈를 클릭하면 아무 것도 안 함(불필요한 모달 방지)
         if (prevSize && prevSize === nextSize) return;

         // ✅ 모달: 실수 방지
         const ok = await confirmModal({
            title: '사이즈 변경',
            message: prevSize
               ? `현재 선택된 사이즈는 ${prevSize}예요.\n${nextSize}로 변경할까요?`
               : `${nextSize}로 사이즈를 선택할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });

         if (!ok) return;

         // ✅ 변경 + (필요 시) 동일 라인 병합
         const prevKey = key;
         const result = cartStore.updateOptions(key, { size: nextSize });

         // updateOptions는 { ok, message, key? } 형태
         if (!result?.ok) {
            toast.show(result?.message || '사이즈 변경에 실패했어요.', {
               duration: 1400,
            });
            return;
         }

         const nextKey = String(result?.key || prevKey);
         const didKeyChange = nextKey !== prevKey;

         // 병합 여부: message에 "병합" 단어가 포함되어 있거나, key 변경 + 기존 라인 합쳐졌을 가능성
         const didMerge = String(result?.message || '').includes('병합');

         // ✅ 토스트 문구 디테일
         // - prevSize가 있었으면 "A → B"
         // - 병합이면 "동일 상품 합쳐짐" 안내
         if (prevSize) {
            toast.show(
               didMerge
                  ? `사이즈 ${prevSize} → ${nextSize}로 변경됐고, 동일 상품은 합쳐졌어요 ✅`
                  : `사이즈 ${prevSize} → ${nextSize}로 변경됐어요 👌`,
               { duration: 1600 },
            );
         } else {
            toast.show(
               didMerge
                  ? `사이즈 ${nextSize}로 선택됐고, 동일 상품은 합쳐졌어요 ✅`
                  : `사이즈 ${nextSize}로 선택됐어요 👌`,
               { duration: 1600 },
            );
         }

         // ✅ UX: 병합/키변경이 발생하면 DOM에 남아있는 data-cart-key가 오래된 값일 수 있음
         // 우리는 paint()가 store.subscribe로 재렌더되므로 추가 작업은 보통 필요 없지만,
         // 즉시 클릭 연타 시 혼선 방지를 위해 잠깐 잠금(선택)
         sizeBtn.disabled = true;
         setTimeout(() => {
            sizeBtn.disabled = false;
         }, 350);

         return;
      }

      // ✅ 라인 조작(key 기준)
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
