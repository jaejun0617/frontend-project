/**
 * =============================================
 * 📍 위치: src/utils/validate.js
 * 역할: 공통 Validation / Normalizer 유틸
 * - Admin/Product/Coupon/Order 상태 전이 검증
 * - 숫자/문자 정규화, 방어적 처리
 * =============================================
 */

/* ==============================
   0) Primitives
============================== */

export function normalizeText(v, fallback = '') {
   const s = String(v ?? '').trim();
   return s ? s : fallback;
}

export function normalizeUpper(v, fallback = '') {
   const s = normalizeText(v, fallback);
   return s ? s.toUpperCase() : s;
}

export function normalizeNumber(v, fallback = 0) {
   const n = Number(v);
   return Number.isFinite(n) ? n : fallback;
}

export function normalizeInt(v, fallback = 0) {
   return Math.floor(normalizeNumber(v, fallback));
}

export function normalizeMoney(v) {
   // ✅ KRW 기준: 정수 + 음수 방지
   return Math.max(0, Math.floor(normalizeNumber(v, 0)));
}

export function clamp(v, min, max) {
   const n = normalizeNumber(v, min);
   return Math.max(min, Math.min(max, n));
}

export function isPlainObject(v) {
   return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/* ==============================
    1) Product validation
 ============================== */
/**
 * ✅ 권장 Product shape (Admin 관리 기준)
 * - id, name, categoryMain, categorySub, basePrice, price
 * - isActive, couponEligible
 * - sizes: apparelSizes[], shoeSizes[]
 * - images: thumb, gallery[]
 */
export function validateProduct(input) {
   if (!isPlainObject(input)) {
      return { ok: false, message: '상품 데이터가 올바르지 않습니다.' };
   }

   const id = normalizeText(input.id);
   const name = normalizeText(input.name);
   const categoryMain = normalizeText(input.categoryMain);
   const categorySub = normalizeText(input.categorySub);

   const basePrice = normalizeMoney(input.basePrice);
   const price = normalizeMoney(input.price);

   // ✅ price는 0 허용(무료/테스트)하지만, 보통은 basePrice/price 관계가 자연스러워야 함
   if (!id) return { ok: false, message: '상품 id가 필요합니다.' };
   if (!name) return { ok: false, message: '상품명(name)이 필요합니다.' };
   if (!categoryMain)
      return { ok: false, message: '대분류(categoryMain)가 필요합니다.' };
   if (!categorySub)
      return { ok: false, message: '중분류(categorySub)가 필요합니다.' };

   // ✅ 가격 역전 방지(운영 안정성)
   if (basePrice > 0 && price > basePrice) {
      return {
         ok: false,
         message: 'price는 basePrice보다 클 수 없습니다.',
      };
   }

   const couponEligible = Boolean(input.couponEligible);
   const isActive =
      input.isActive === undefined ? true : Boolean(input.isActive);

   const apparelSizes = Array.isArray(input.apparelSizes)
      ? input.apparelSizes.map((x) => normalizeText(x)).filter(Boolean)
      : [];

   const shoeSizes = Array.isArray(input.shoeSizes)
      ? input.shoeSizes.map((x) => normalizeText(x)).filter(Boolean)
      : [];

   const images = isPlainObject(input.images) ? input.images : {};
   const thumb = normalizeText(images.thumb);
   const gallery = Array.isArray(images.gallery)
      ? images.gallery.map((x) => normalizeText(x)).filter(Boolean)
      : [];

   const description = normalizeText(input.description);

   return {
      ok: true,
      data: {
         id,
         name,
         categoryMain,
         categorySub,
         basePrice,
         price,
         couponEligible,
         isActive,
         apparelSizes,
         shoeSizes,
         images: { thumb, gallery },
         description,
         updatedAt: Date.now(),
      },
   };
}

/* ==============================
    2) Coupon validation
 ============================== */
/**
 * ✅ Coupon shape
 * - code, title, rate(0~1)
 * - isActive, startAt/endAt (optional)
 * - maxUses / perUserLimit (optional)
 * - minOrder (optional)
 */
export function validateCoupon(input) {
   if (!isPlainObject(input)) {
      return { ok: false, message: '쿠폰 데이터가 올바르지 않습니다.' };
   }

   const code = normalizeUpper(input.code);
   const title = normalizeText(input.title, code);
   const rate = clamp(normalizeNumber(input.rate, 0), 0, 1);

   if (!code) return { ok: false, message: '쿠폰 코드(code)가 필요합니다.' };
   if (rate <= 0)
      return { ok: false, message: '할인율(rate)은 0보다 커야 합니다.' };

   const isActive =
      input.isActive === undefined ? true : Boolean(input.isActive);

   const startAt = input.startAt ? Date.parse(input.startAt) : null;
   const endAt = input.endAt ? Date.parse(input.endAt) : null;

   if (startAt && Number.isNaN(startAt))
      return { ok: false, message: 'startAt 형식이 올바르지 않습니다.' };
   if (endAt && Number.isNaN(endAt))
      return { ok: false, message: 'endAt 형식이 올바르지 않습니다.' };
   if (startAt && endAt && endAt < startAt)
      return { ok: false, message: 'endAt은 startAt보다 빠를 수 없습니다.' };

   const maxUses =
      input.maxUses === undefined || input.maxUses === null
         ? null
         : Math.max(1, normalizeInt(input.maxUses, 1));

   const perUserLimit =
      input.perUserLimit === undefined || input.perUserLimit === null
         ? null
         : Math.max(1, normalizeInt(input.perUserLimit, 1));

   const minOrder =
      input.minOrder === undefined || input.minOrder === null
         ? null
         : normalizeMoney(input.minOrder);

   return {
      ok: true,
      data: {
         code,
         title,
         rate,
         isActive,
         startAt,
         endAt,
         maxUses,
         perUserLimit,
         minOrder,
         updatedAt: Date.now(),
      },
   };
}

/* ==============================
    3) Order status transition
 ============================== */

export const ORDER_STATUS = /** @type {const} */ ([
   'PAID',
   'SHIPPING',
   'DELIVERED',
   'CANCELED',
]);

export function normalizeOrderStatus(v) {
   const s = normalizeUpper(v);
   if (ORDER_STATUS.includes(s)) return s;
   return 'PAID';
}

/**
 * ✅ 상태 전이 규칙 (운영 안정성)
 * - PAID -> SHIPPING, CANCELED
 * - SHIPPING -> DELIVERED, CANCELED
 * - DELIVERED -> (없음)
 * - CANCELED -> (없음)
 */
const ALLOWED_TRANSITIONS = {
   PAID: new Set(['SHIPPING', 'CANCELED']),
   SHIPPING: new Set(['DELIVERED', 'CANCELED']),
   DELIVERED: new Set([]),
   CANCELED: new Set([]),
};

export function canTransitionOrderStatus(from, to) {
   const f = normalizeOrderStatus(from);
   const t = normalizeOrderStatus(to);
   if (f === t) return { ok: true };
   const allowed = ALLOWED_TRANSITIONS[f] || new Set();
   return allowed.has(t)
      ? { ok: true }
      : { ok: false, message: `상태 전이 불가: ${f} -> ${t}` };
}
