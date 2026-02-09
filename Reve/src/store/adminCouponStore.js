/**
 * =============================================
 * 📍 위치: src/store/adminCouponStore.js
 * 역할: 관리자용 쿠폰 카탈로그 스토어
 * - couponStore(유저 보유/적용)와 별개로 "운영 카탈로그"를 관리
 * - validateCoupon로 생성/수정 검증
 * - auditLog 기록
 *
 * ✅ 연결 방식(추천)
 * - couponStore의 COUPON_CATALOG를 고정 객체로 두기보다
 * - couponStore.getCatalog()가 adminCouponStore를 참조하도록 리팩터링 가능
 * - 당장 MVP에서는 Admin에서 "카탈로그 JSON"을 관리하는 것만으로도 가치 큼
 * =============================================
 */

import {
   validateCoupon,
   normalizeUpper,
   normalizeText,
} from '../utils/validate.js';
import { auditLog } from '../utils/auditLog.js';

const STORAGE_KEY = 'reve_admin_coupons_v1';

/* ==============================
   0) Storage helpers
============================== */

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readState() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;

   const items = Array.isArray(parsed?.items) ? parsed.items : [];
   const normalized = items
      .map((c) => validateCoupon(c))
      .filter((r) => r.ok)
      .map((r) => r.data);

   return { items: normalized };
}

function writeState(next) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/* ==============================
   1) Store core
============================== */

let state = readState();
/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

function findIndexByCode(code) {
   const key = normalizeUpper(code);
   if (!key) return -1;
   return state.items.findIndex((c) => c.code === key);
}

/* ==============================
   2) Public API
============================== */

export const adminCouponStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   list({ includeInactive = true } = {}) {
      const items = Array.isArray(state.items) ? state.items : [];
      const filtered = includeInactive
         ? items
         : items.filter((c) => c.isActive);
      return [...filtered].sort(
         (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0),
      );
   },

   getByCode(code) {
      const key = normalizeUpper(code);
      if (!key) return null;
      return state.items.find((c) => c.code === key) || null;
   },

   create(payload, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const v = validateCoupon(payload);
      if (!v.ok) return v;

      if (findIndexByCode(v.data.code) >= 0) {
         return { ok: false, message: '이미 존재하는 쿠폰 코드입니다.' };
      }

      state = { ...state, items: [v.data, ...state.items] };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'COUPON_CREATE',
         targetType: 'COUPON',
         targetId: v.data.code,
         diff: v.data,
      });

      return { ok: true, code: v.data.code };
   },

   update(code, patch, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const key = normalizeUpper(code);
      if (!key) return { ok: false, message: '쿠폰 코드가 필요합니다.' };

      const idx = findIndexByCode(key);
      if (idx < 0) return { ok: false, message: '쿠폰을 찾을 수 없습니다.' };

      const base = state.items[idx];
      const merged = {
         ...base,
         ...(patch && typeof patch === 'object' ? patch : {}),
         code: base.code, // ✅ code는 불변
      };

      const v = validateCoupon(merged);
      if (!v.ok) return v;

      const nextItems = [...state.items];
      nextItems[idx] = v.data;

      state = { ...state, items: nextItems };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'COUPON_UPDATE',
         targetType: 'COUPON',
         targetId: key,
         diff: { before: base, after: v.data },
      });

      return { ok: true };
   },

   remove(code, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const key = normalizeUpper(code);
      if (!key) return { ok: false, message: '쿠폰 코드가 필요합니다.' };

      const idx = findIndexByCode(key);
      if (idx < 0) return { ok: false, message: '쿠폰을 찾을 수 없습니다.' };

      const target = state.items[idx];

      state = { ...state, items: state.items.filter((c) => c.code !== key) };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'COUPON_DELETE',
         targetType: 'COUPON',
         targetId: key,
         diff: target,
      });

      return { ok: true };
   },

   /**
    * ✅ 코드 자동 생성(운영 편의)
    */
   generateCode(prefix = 'REVE') {
      const p = normalizeText(prefix, 'REVE').toUpperCase();
      const tail = Math.random().toString(16).slice(2, 6).toUpperCase();
      return `${p}-${tail}`;
   },

   seedDummy({ actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const samples = [
         {
            code: 'ADMIN10',
            title: '관리자 테스트 10%',
            rate: 0.1,
            isActive: true,
         },
         {
            code: 'SHIP7',
            title: '7% 쿠폰(최소 5만원)',
            rate: 0.07,
            isActive: true,
            minOrder: 50000,
         },
      ];

      let created = 0;
      samples.forEach((c) => {
         if (findIndexByCode(c.code) >= 0) return;
         const r = this.create(c, { actorId, actorName });
         if (r.ok) created += 1;
      });

      return { ok: true, created };
   },

   clearAll({ actorId = 'admin', actorName = 'ADMIN' } = {}) {
      state = { items: [] };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'COUPON_CLEAR_ALL',
         targetType: 'COUPON',
         targetId: '*',
         diff: null,
      });

      return { ok: true };
   },
};
