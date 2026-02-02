// src/utils/pricing.js
// 가격 계산 공용 유틸 (세일가 + 쿠폰 누적 적용)

export function clamp(n, min, max) {
   return Math.max(min, Math.min(max, n));
}

/**
 * 쿠폰 할인액(단가 기준)을 계산
 * - priceAfterSale: 이미 기본 세일이 반영된 가격(product.price)
 * - couponRate: 쿠폰 할인율(0~1)
 * - couponRateCap: 최대 할인율 캡(0~1) (상품 또는 쿠폰 정책용)
 */
export function calcCouponDiscount({
   priceAfterSale,
   couponRate = 0,
   couponRateCap = 0,
}) {
   const rate = clamp(Number(couponRate || 0), 0, 1);
   const cap = clamp(Number(couponRateCap || 0), 0, 1);

   const appliedRate = cap > 0 ? Math.min(rate, cap) : rate;

   const raw = Math.round(Number(priceAfterSale || 0) * appliedRate);
   return clamp(raw, 0, Number(priceAfterSale || 0));
}

/**
 * 라인 아이템 가격 계산
 * - 기본 세일가(product.price)에 쿠폰을 추가 적용
 * - couponEligible=false면 쿠폰 할인은 0
 */
export function calcLinePrice({ product, qty, coupon }) {
   const count = clamp(Number(qty || 1), 1, 99);

   const priceAfterSale = Math.max(0, Number(product?.price || 0));
   const basePrice = Math.max(0, Number(product?.basePrice ?? priceAfterSale));

   const canUseCoupon = Boolean(product?.couponEligible);

   const couponDiscount =
      canUseCoupon && coupon
         ? calcCouponDiscount({
              priceAfterSale,
              couponRate: coupon.rate,
              couponRateCap: product?.couponRateCap ?? 0,
           })
         : 0;

   const finalUnit = Math.max(0, priceAfterSale - couponDiscount);

   return {
      basePrice,
      priceAfterSale,
      couponDiscount,
      finalUnit,
      lineTotal: finalUnit * count,
   };
}
