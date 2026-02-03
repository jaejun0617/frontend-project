/**
 * =============================================
 * 📍 위치: src/pages/cart/index.js
 * 역할: 장바구니(Cart) 페이지
 *
 * ✅ 포함 기능
 * - 무료배송 기준선 + 배송비(30만원 미만 3,000원)
 * - 쿠폰 적용 가능 상품(라인) 개수 표시
 * - 보유 쿠폰 라디오 선택 + 모달 확인 후 적용/해제 (즉시 적용 X)
 * - 기본 세일(product.price) + 쿠폰 할인(pricing.js) 누적 반영
 * - checkout 버튼 활성화: (아이템 >= 1) && (최종금액 > 0)
 *
 * ✅ 옵션(사이즈) 기능
 * - Cart에서도 상품리스트와 동일한 "사이즈 pill" UI 제공
 * - pill 클릭 → confirmModal → cartStore.updateOptions(key, { size })
 * - 동일 라인이 있으면 병합될 수 있음(스토어 정책)
 *
 * ✅ 멤버십(등급/적립) 표시
 * - membership.js 단일 소스로 현재등급/적립률/예상 적립포인트/다음등급까지 표시
 * =============================================
 */

import { cartStore } from '../../store/cartStore.js';
import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';

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

/**
 * ✅ 쿠폰 적용 가능 라인 수(상품 기준)
 * - couponEligible: true인 상품 라인만 카운트
 */
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
 * - Cart에서 pill에 is-in-cart 표시(실수 방지/가시성)
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
 * ✅ Cart 요약 계산
 * - pricing.js(calcLinePrice)가 "기본 세일 + 쿠폰" 반영 담당
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

/**
 * ✅ 쿠폰 섹션 렌더
 * - 버튼 제거(MVP 목표)
 * - 라디오 선택은 "즉시 적용"이 아니라, 클릭 이벤트에서 모달 확인 후 store 변경
 */
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
 * - is-in-cart: 같은 상품에서 다른 라인에 이미 담긴 사이즈(가시성)
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

   // ✅ 멤버십(단일 소스) 기반 요약 계산
   // - 적립 기준: "배송비 제외"가 일반적이라 checkoutTotal에 totalAfterCoupon을 사용
   // - 배송비 포함 적립을 원하면 checkoutTotal: total 로 바꾸면 됨
   const user = authStore.getUser?.();
   const { tierInfo, earnRate, expectedPoints } = getMembershipSnapshot({
      totalSpent: user?.totalSpent ?? 0,
      checkoutTotal: pricingCore.totalAfterCoupon, // ✅ 적립 기준(배송비 제외)
      // checkoutTotal: total, // ✅ 배송비 포함 적립 정책이면 이걸 사용
   });

   return `
    <div class='cart-layout' aria-label='Cart Layout'>
      <div class='cart__list' aria-label='Cart Items'>
        ${pricingCore.computedRows
           .map(({ key, product, qty, options, computed }) => {
              const currentSize = String(options?.size ?? '').trim();
              const inCartSizeSet = getInCartSizeSet(rawItems, product?.id);

              // ✅ 컬러 옵션 제거했으니 사이즈만 표기
              const optionText = options?.size ? `사이즈: ${options.size}` : '';

              const hasBaseSale =
                 Number(product.basePrice ?? 0) > Number(product.price ?? 0);

              const hasCouponDiscount = computed.couponDiscount > 0;

              return `
                <article class='cart-item' data-cart-item data-cart-key='${escapeHtml(
                   key,
                )}'>
                  <div class='cart-item__info'>
                    <p class='cart-item__name'>${escapeHtml(product.name)}</p>

                    <div class='cart-item__pricebox'>
                      ${
                         hasBaseSale
                            ? `<span class='cart-item__base'>₩ ${formatPrice(
                                 product.basePrice,
                              )}</span>`
                            : ''
                      }
                      <p class='cart-item__price'>₩ ${formatPrice(
                         product.price,
                      )}</p>
                      ${
                         hasCouponDiscount
                            ? `<p class='cart-item__coupon'>쿠폰 -₩ ${formatPrice(
                                 computed.couponDiscount,
                              )}</p>`
                            : ''
                      }
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

        <!-- ✅ 멤버십 요약 -->
        <div class='cart__membership' aria-label='회원 등급 및 적립'>
          <div class='cart__row'>
            <span>회원 등급</span>
            <strong>${tierInfo.current.name} · 적립 ${formatPercent(
               earnRate,
            )}</strong>
          </div>

          <div class='cart__row'>
            <span>이번 결제 적립 예상</span>
            <strong>${formatPrice(expectedPoints)}P</strong>
          </div>

          <div class='cart__row cart__row--muted'>
            <span>다음 등급까지</span>
            <strong>
              ${
                 tierInfo.next
                    ? `₩ ${formatPrice(tierInfo.remainToNext)}`
                    : '최고 등급'
              }
            </strong>
          </div>
        </div>

        <!-- ✅ 쿠폰 -->
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
   // ✅ Mock 결제(실 결제 연동 전)
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

   // ✅ 쿠폰 사용 처리 + 적용 해제
   if (appliedCoupon?.code) {
      couponStore.markUsed?.(appliedCoupon.code);
      couponStore.clearApplied?.();
   }

   // ✅ 결제 전 유저 스냅샷(승급 판단용)
   const userBefore = authStore.getUser?.();
   const prevSpent = Number(userBefore?.totalSpent ?? 0);

   // ✅ 누적 구매액 반영(정책: 총 결제금액 기준)
   const added = Number(payload?.pricing?.total ?? 0);
   const nextSpent = prevSpent + added;

   // ✅ 먼저 totalSpent 갱신 (이후 UI/등급 계산이 최신 값 기준이 되도록)
   authStore.updateUser?.({ totalSpent: nextSpent });

   // ✅ 승급 쿠폰 지급
   // - getUpgradedTiers가 "새로 달성한 등급들"을 Tier[]로 반환
   // - 그 Tier.name으로 쿠폰 코드 매핑 → register() 지급
   const grantedUpgradeCoupons = [];

   // 로그인 유저만 지급(guest 방지)
   if (userBefore?.id) {
      const upgraded = getUpgradedTiers({
         prevTotalSpent: prevSpent,
         nextTotalSpent: nextSpent,
      });

      upgraded.forEach((tier) => {
         const code = getUpgradeCouponCode(tier?.name);
         if (!code) return;

         const r = couponStore.register?.(code);
         if (r?.ok) grantedUpgradeCoupons.push(code);
      });
   }

   // ✅ 결제 완료 후 장바구니 비우기
   cartStore.clear?.();

   return { ok: true, payload, receipt: result.data, grantedUpgradeCoupons };
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

   // ✅ 최초 렌더
   await paint();

   // ✅ store 변경 시 자동 리렌더
   cartStore.subscribe(() => paint());
   couponStore.subscribe(() => paint());

   cartEl.addEventListener('click', async (e) => {
      /* ------------------------------
         A) 전체 비우기
      ------------------------------ */
      if (e.target.closest('[data-cart-clear]')) {
         cartStore.clear();
         return;
      }

      /* ------------------------------
         B) 쿠폰 라디오 클릭 UX
         - 라디오의 기본 체크 동작을 막고(preventDefault),
           "모달 결과"로만 store 상태를 바꾼 뒤 paint()로 UI를 맞춘다.
      ------------------------------ */
      const couponInput = e.target.closest('[data-coupon-radio]');
      if (couponInput) {
         // ✅ 브라우저 기본 라디오 체크 변경 방지 (깜빡/불일치 예방)
         e.preventDefault();

         const applied = couponStore.getAppliedCoupon();
         const currentCode = String(applied?.code || '').trim();

         const nextCode = String(couponInput.value || '')
            .trim()
            .toUpperCase();

         const detailed = await cartStore.getDetailedItems();
         const eligibleCount = countCouponEligibleLines(detailed);

         if (eligibleCount <= 0) {
            toast.show('쿠폰 적용 가능한 상품이 없어요.', { duration: 1400 });
            await paint();
            return;
         }

         // 1) 현재 적용 쿠폰을 다시 클릭 → 해제 confirm
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

            await paint();
            return;
         }

         // 2) 다른 쿠폰 선택 → 적용 confirm
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

         await paint();
         return;
      }

      /* ------------------------------
         C) 구매하기
         - 결제 확인 → Mock 결제 → 완료 모달(요약 + 등급)
      ------------------------------ */
      if (e.target.closest('[data-checkout]')) {
         const detailed = await cartStore.getDetailedItems();
         if (!detailed.length) return;

         const okPay = await confirmModal({
            title: '결제 확인',
            message: '결제를 진행할까요?',
            confirmText: '결제하기',
            cancelText: '취소',
         });
         if (!okPay) return;

         const result = await handleCheckout({ detailedItems: detailed });

         if (!result?.ok) {
            toast.show('결제에 실패했어요. 잠시 후 다시 시도해 주세요.', {
               duration: 1600,
            });
            return;
         }

         const pricing = result?.payload?.pricing;
         const coupon = result?.payload?.coupon;

         // ✅ 승급 쿠폰 지급 내역(있으면 모달에 함께 노출)
         const granted = Array.isArray(result?.grantedUpgradeCoupons)
            ? result.grantedUpgradeCoupons
            : [];

         const upgradeLines =
            granted.length > 0
               ? `🎁 승급 쿠폰 지급: ${granted.join(', ')}`
               : ''; // 없으면 빈 문자열

         // ✅ 결제 후 최신 유저 기준으로 등급 재계산
         const user = authStore.getUser?.();
         const { tierInfo } = getMembershipSnapshot({
            totalSpent: user?.totalSpent ?? 0,
            checkoutTotal: Number(pricing?.total ?? 0),
         });

         const summaryLines = [
            coupon?.code
               ? `🎫 사용 쿠폰: ${coupon.code}`
               : '🎫 사용 쿠폰: 없음',
            `🚚 배송비: ₩ ${formatPrice(pricing?.shipping ?? 0)}`,
            `💳 최종 결제: ₩ ${formatPrice(pricing?.total ?? 0)}`,
            upgradeLines, // ✅ 여기!
         ]
            .filter(Boolean) // ✅ 빈 줄 제거
            .join('\n');

         const tierLines = [
            `🏷️ 현재 등급: ${tierInfo.current.name}`,
            tierInfo.next
               ? `⬆️ 다음 등급(${tierInfo.next.name})까지 ₩ ${formatPrice(
                    tierInfo.remainToNext,
                 )} 남았어요`
               : '👑 최고 등급이에요. 유지하면 혜택이 계속 적용돼요!',
         ].join('\n');

         await confirmModal({
            title: '결제 완료 ✅',
            message: `결제가 완료되었습니다.\n\n${summaryLines}\n\n${tierLines}`,
            confirmText: '확인',
            cancelText: '닫기',
         });

         return;
      }

      /* ------------------------------
         D) 사이즈 변경 (pill 클릭)
         - 모달 확인 → updateOptions(병합 가능) → 토스트
      ------------------------------ */
      const sizeBtn = e.target.closest('[data-cart-size-pill]');
      if (sizeBtn) {
         const itemEl = sizeBtn.closest('[data-cart-item]');
         const key = itemEl?.getAttribute('data-cart-key');
         if (!key) return;

         const nextSize = String(
            sizeBtn.getAttribute('data-size-value') || '',
         ).trim();
         if (!nextSize) return;

         // ✅ 현재 라인의 이전 사이즈(문구/불필요 모달 방지)
         const state = cartStore.getState();
         const currentLine = state.items.find((it) => it.key === key);
         const prevSize = String(currentLine?.options?.size || '').trim();

         // ✅ 같은 사이즈 클릭은 무시
         if (prevSize && prevSize === nextSize) return;

         const ok = await confirmModal({
            title: '사이즈 변경',
            message: prevSize
               ? `현재 선택된 사이즈는 ${prevSize}예요.\n${nextSize}로 변경할까요?`
               : `${nextSize}로 사이즈를 선택할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         const result = cartStore.updateOptions(key, { size: nextSize });

         if (!result?.ok) {
            toast.show(result?.message || '사이즈 변경에 실패했어요.', {
               duration: 1400,
            });
            return;
         }

         // ⚠️ 병합 여부는 현재 message 기반 판별(스토어에서 merged 플래그 주면 더 견고해짐)
         const didMerge = String(result?.message || '').includes('병합');

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

         // ✅ 연타 방지(병합/리렌더 직전 클릭 혼선 방지)
         sizeBtn.disabled = true;
         setTimeout(() => {
            sizeBtn.disabled = false;
         }, 350);

         return;
      }

      /* ------------------------------
         E) 라인 조작 (key 기준)
      ------------------------------ */
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
