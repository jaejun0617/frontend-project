/**
 * =============================================
 * 📍 위치: src/utils/couponDistribution.js
 * 역할: Admin 쿠폰 배포(전체/등급/특정유저) - localStorage 직접 지급
 * 규칙:
 * - coupon storage key: reve_coupons_v1:<ownerKey>
 * - 이미 보유한 쿠폰 code는 중복 지급하지 않음
 * =============================================
 */

import { adminCouponLedgerStore } from '../store/adminCouponLedgerStore.js';

const couponKeyOf = (ownerKey) => `reve_coupons_v1:${ownerKey}`;

function safeParse(json, fallback) {
   try {
      const v = JSON.parse(json);
      return v ?? fallback;
   } catch {
      return fallback;
   }
}

function now() {
   return Date.now();
}

function clampRate(n) {
   const r = Number(n || 0);
   if (!Number.isFinite(r)) return 0;
   return Math.max(0, Math.min(1, r));
}

function normalizeCode(code) {
   return String(code ?? '')
      .trim()
      .toUpperCase();
}

function toIntMaybe(v) {
   const n = Number(String(v ?? '').trim());
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

function toMsMaybe(v) {
   const n = Number(String(v ?? '').trim());
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

function normalizeOwnedCouponFromAdminDraft(couponDraft) {
   const code = normalizeCode(couponDraft?.code);
   const title = String(couponDraft?.title || code).trim();
   if (!code || !title) return null;

   return {
      code,
      title,
      rate: clampRate(couponDraft?.rate),

      used: false,
      createdAt: now(),
      usedAt: 0,

      // 운영 필드(선택)
      minOrderTotal: toIntMaybe(couponDraft?.minOrderTotal),
      maxUses: toIntMaybe(couponDraft?.maxUses),
      startsAt: toMsMaybe(couponDraft?.startsAt),
      endsAt: toMsMaybe(couponDraft?.endsAt),
      description: String(couponDraft?.description ?? '').trim(),
   };
}

function upsertCouponForOwner(ownerKey, couponDraft) {
   const key = couponKeyOf(ownerKey);

   // ✅ couponStore 스키마로 읽기
   const state = safeParse(localStorage.getItem(key), {
      owned: [],
      appliedCode: '',
   });

   const owned = Array.isArray(state.owned) ? state.owned : [];
   const code = normalizeCode(couponDraft?.code);
   if (!code) return { ok: false, message: '쿠폰 코드가 없습니다.' };

   // ✅ 중복 지급 방지 (code 기준)
   const exists = owned.some((c) => normalizeCode(c?.code) === code);
   if (exists) return { ok: true, skipped: true };

   const row = normalizeOwnedCouponFromAdminDraft(couponDraft);
   if (!row) return { ok: false, message: '쿠폰 정규화 실패' };

   const next = {
      owned: [row, ...owned],
      appliedCode: String(state.appliedCode || ''),
   };

   localStorage.setItem(key, JSON.stringify(next));
   return { ok: true, skipped: false };
}

export function distributeCoupon({ users, couponDraft, mode, grade, userIds }) {
   const list = Array.isArray(users) ? users : [];
   const code = normalizeCode(couponDraft?.code);
   if (!code) return { ok: false, message: '쿠폰이 올바르지 않습니다.' };

   let targets = list;

   if (String(mode).toUpperCase() === 'GRADE') {
      const g = String(grade || '').toUpperCase();
      targets = list.filter((u) => String(u.grade || '').toUpperCase() === g);
   }

   if (String(mode).toUpperCase() === 'USER') {
      const set = new Set(
         (userIds || []).map((x) => String(x).trim()).filter(Boolean),
      );
      targets = list.filter((u) => set.has(String(u.id)));
   }

   let granted = 0;
   let skipped = 0;

   targets.forEach((u) => {
      const ownerKey = String(u.id || '').trim();
      if (!ownerKey) return;

      const r = upsertCouponForOwner(ownerKey, couponDraft);

      if (r.ok && r.skipped) skipped += 1;

      if (r.ok && !r.skipped) {
         granted += 1;

         // ✅ 발급 이력(정답 루트)
         adminCouponLedgerStore.addIssue({
            code,
            ownerKey,
            meta: {
               source: 'ADMIN_DISTRIBUTE',
               mode: String(mode || '').toUpperCase(),
            },
         });
      }
   });

   return { ok: true, granted, skipped, targetCount: targets.length };
}
