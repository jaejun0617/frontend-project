/**
 * =============================================
 * 📍 위치: src/utils/validate.js
 * 역할: 공통 validation 유틸(상품/쿠폰/주문 상태 전이)
 * =============================================
 */

function normalizeText(v) {
   return String(v ?? '').trim();
}

function normalizeId(v) {
   return normalizeText(v).replace(/\s+/g, '_');
}

function toNumber(v) {
   const n = Number(v);
   return Number.isFinite(n) ? n : NaN;
}

function normalizeCode(v) {
   return normalizeText(v).toUpperCase();
}

function clampRate(v) {
   const n = toNumber(v);
   if (!Number.isFinite(n)) return NaN;
   return Math.max(0, Math.min(1, n));
}

export function validateProductDraft(draft, { allowIdExisting = false } = {}) {
   const id = normalizeId(draft?.id);
   const name = normalizeText(draft?.name);

   if (!id) return { ok: false, message: '상품 ID가 필요합니다.' };
   if (!allowIdExisting && !/^[a-zA-Z0-9_:-]+$/.test(id)) {
      return { ok: false, message: '상품 ID는 영문/숫자/_/-/: 만 허용합니다.' };
   }
   if (!name) return { ok: false, message: '상품명을 입력해 주세요.' };

   const price = toNumber(draft?.price);
   if (!Number.isFinite(price) || price <= 0) {
      return {
         ok: false,
         message: '판매가(price)는 0보다 큰 숫자여야 합니다.',
      };
   }

   const basePriceRaw = draft?.basePrice;
   if (normalizeText(basePriceRaw) !== '') {
      const basePrice = toNumber(basePriceRaw);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
         return {
            ok: false,
            message: '정가(basePrice)는 0 이상의 숫자여야 합니다.',
         };
      }
      if (basePrice > 0 && basePrice < price) {
         return {
            ok: false,
            message:
               '정가(basePrice)는 판매가(price) 이상이어야 자연스럽습니다.',
         };
      }
   }
   const discountRateRaw = normalizeText(draft?.discountRate);
   if (discountRateRaw !== '') {
      const r = toNumber(discountRateRaw);
      if (!Number.isFinite(r)) {
         return {
            ok: false,
            message: '할인율(discountRate)은 숫자여야 합니다.',
         };
      }
      if (r < 0 || r > 1) {
         return {
            ok: false,
            message: '할인율(discountRate)은 0~1 범위여야 합니다.',
         };
      }
   }
   // 카테고리는 운영 정책상 선택이지만, 완전체에선 필수 권장
   const main = normalizeText(draft?.categoryMain);
   const sub = normalizeText(draft?.categorySub);
   if (!main)
      return { ok: false, message: '대분류(categoryMain)를 입력해 주세요.' };
   if (!sub)
      return { ok: false, message: '중분류(categorySub)를 입력해 주세요.' };

   return { ok: true };
}

export function validateCouponDraft(draft, { allowCodeExisting = false } = {}) {
   const code = normalizeCode(draft?.code);
   const title = normalizeText(draft?.title);

   if (!code) return { ok: false, message: '쿠폰 코드(code)가 필요합니다.' };
   if (!allowCodeExisting && !/^[A-Z0-9_:-]+$/.test(code)) {
      return {
         ok: false,
         message: '쿠폰 코드는 대문자/숫자/_/-/: 만 허용합니다.',
      };
   }
   if (!title)
      return { ok: false, message: '쿠폰 타이틀(title)을 입력해 주세요.' };

   const rate = clampRate(draft?.rate);
   if (!Number.isFinite(rate))
      return { ok: false, message: '할인율(rate)은 숫자여야 합니다.' };
   if (rate <= 0)
      return { ok: false, message: '할인율(rate)은 0보다 커야 합니다.' };

   const startsAt = normalizeText(draft?.startsAt);
   const endsAt = normalizeText(draft?.endsAt);
   if (startsAt && endsAt) {
      const s = toNumber(startsAt);
      const e = toNumber(endsAt);
      if (!Number.isFinite(s) || !Number.isFinite(e)) {
         return {
            ok: false,
            message: '기간(startsAt/endsAt)은 ms 숫자여야 합니다.',
         };
      }
      if (e > 0 && s > 0 && e < s) {
         return {
            ok: false,
            message: '종료일(endsAt)은 시작일(startsAt) 이후여야 합니다.',
         };
      }
   }

   const minOrderTotal = normalizeText(draft?.minOrderTotal);
   if (minOrderTotal) {
      const n = toNumber(minOrderTotal);
      if (!Number.isFinite(n) || n < 0)
         return {
            ok: false,
            message: '최소 주문금액은 0 이상의 숫자여야 합니다.',
         };
   }

   const maxUses = normalizeText(draft?.maxUses);
   if (maxUses) {
      const n = toNumber(maxUses);
      if (!Number.isFinite(n) || n < 0)
         return {
            ok: false,
            message: '최대 사용횟수는 0 이상의 숫자여야 합니다.',
         };
   }

   return { ok: true };
}

export function validateOrderStatusTransition(from, to) {
   const f = String(from || '').toUpperCase();
   const t = String(to || '').toUpperCase();

   const allowed = new Set(['PAID', 'SHIPPING', 'DELIVERED', 'CANCELED']);
   if (!allowed.has(f) || !allowed.has(t)) {
      return { ok: false, message: '유효하지 않은 주문 상태입니다.' };
   }

   if (f === 'DELIVERED')
      return { ok: false, message: '배송완료 주문은 상태 변경이 제한됩니다.' };
   if (f === 'CANCELED')
      return { ok: false, message: '취소 주문은 상태 변경이 제한됩니다.' };

   // ✅ 취소 정책 확정: PAID에서만 취소 가능
   const nextMap = {
      PAID: new Set(['SHIPPING', 'CANCELED']),
      SHIPPING: new Set(['DELIVERED']), // ← 여기서 CANCELED 제거
   };

   const ok = nextMap[f]?.has(t) ?? false;
   if (!ok) return { ok: false, message: `상태 전이 불가: ${f} → ${t}` };

   return { ok: true };
}
