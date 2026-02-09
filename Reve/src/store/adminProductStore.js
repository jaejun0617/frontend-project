/**
 * =============================================
 * 📍 위치: src/store/adminProductStore.js
 * 역할: 관리자용 상품 스토어 (로컬 DB 역할)
 * - 상품 등록/수정/삭제
 * - 대분류/중분류 필터링에 필요한 메타 제공
 * - validateProduct로 입력 검증
 * - auditLog 기록
 * =============================================
 */

import { validateProduct, normalizeText } from '../utils/validate.js';
import { auditLog } from '../utils/auditLog.js';

const STORAGE_KEY = 'reve_admin_products_v1';

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
      .map((p) => validateProduct(p))
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

function findIndexById(id) {
   const key = normalizeText(id);
   if (!key) return -1;
   return state.items.findIndex((p) => p.id === key);
}

function nextId() {
   return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* ==============================
   2) Public API
============================== */

export const adminProductStore = {
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
         : items.filter((p) => p.isActive);
      return [...filtered].sort(
         (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0),
      );
   },

   getById(id) {
      const key = normalizeText(id);
      if (!key) return null;
      return state.items.find((p) => p.id === key) || null;
   },

   /**
    * ✅ 카테고리 메타(대분류/중분류 목록)
    */
   getCategoryMeta() {
      const mains = new Map(); // main -> Set(sub)
      this.list({ includeInactive: true }).forEach((p) => {
         const m = normalizeText(p.categoryMain);
         const s = normalizeText(p.categorySub);
         if (!m || !s) return;

         if (!mains.has(m)) mains.set(m, new Set());
         mains.get(m).add(s);
      });

      return Array.from(mains.entries()).map(([main, subs]) => ({
         main,
         subs: Array.from(subs.values()).sort(),
      }));
   },

   /**
    * ✅ Create
    * - id 없으면 자동 생성
    */
   create(payload, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const raw = { ...(payload || {}) };
      if (!normalizeText(raw.id)) raw.id = nextId();

      const v = validateProduct(raw);
      if (!v.ok) return v;

      // id 중복 방지
      if (findIndexById(v.data.id) >= 0) {
         return { ok: false, message: '이미 존재하는 상품 id입니다.' };
      }

      state = { ...state, items: [v.data, ...state.items] };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'PRODUCT_CREATE',
         targetType: 'PRODUCT',
         targetId: v.data.id,
         diff: v.data,
      });

      return { ok: true, id: v.data.id };
   },

   /**
    * ✅ Update
    */
   update(id, patch, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const key = normalizeText(id);
      if (!key) return { ok: false, message: '상품 id가 필요합니다.' };

      const idx = findIndexById(key);
      if (idx < 0) return { ok: false, message: '상품을 찾을 수 없습니다.' };

      const base = state.items[idx];
      const merged = {
         ...base,
         ...(patch && typeof patch === 'object' ? patch : {}),
         id: base.id, // ✅ id는 불변
      };

      const v = validateProduct(merged);
      if (!v.ok) return v;

      const nextItems = [...state.items];
      nextItems[idx] = v.data;

      state = { ...state, items: nextItems };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'PRODUCT_UPDATE',
         targetType: 'PRODUCT',
         targetId: key,
         diff: { before: base, after: v.data },
      });

      return { ok: true };
   },

   /**
    * ✅ Delete (hard delete)
    * - 운영급에서는 soft delete(isActive=false)도 많이 쓰지만
    * - MVP는 hard delete 제공 + 필요하면 update로 soft delete 가능
    */
   remove(id, { actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const key = normalizeText(id);
      if (!key) return { ok: false, message: '상품 id가 필요합니다.' };

      const idx = findIndexById(key);
      if (idx < 0) return { ok: false, message: '상품을 찾을 수 없습니다.' };

      const target = state.items[idx];
      state = { ...state, items: state.items.filter((p) => p.id !== key) };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'PRODUCT_DELETE',
         targetType: 'PRODUCT',
         targetId: key,
         diff: target,
      });

      return { ok: true };
   },

   /**
    * ✅ Seed: 운영 테스트용 더미 데이터
    */
   seedDummy({ actorId = 'admin', actorName = 'ADMIN' } = {}) {
      const now = Date.now();

      const samples = [
         {
            id: `p_${now}_shoe`,
            name: 'REVE Runner 01',
            categoryMain: 'SHOES',
            categorySub: 'RUNNING',
            basePrice: 159000,
            price: 129000,
            couponEligible: true,
            isActive: true,
            shoeSizes: ['240', '250', '260', '270', '280'],
            apparelSizes: [],
            images: { thumb: '', gallery: [] },
            description: '가벼운 러닝화 (더미)',
         },
         {
            id: `p_${now}_tee`,
            name: 'REVE Tee Basic',
            categoryMain: 'APPAREL',
            categorySub: 'TOP',
            basePrice: 49000,
            price: 39000,
            couponEligible: true,
            isActive: true,
            apparelSizes: ['S', 'M', 'L', 'XL'],
            shoeSizes: [],
            images: { thumb: '', gallery: [] },
            description: '기본 티셔츠 (더미)',
         },
      ];

      let created = 0;
      samples.forEach((p) => {
         const exists = findIndexById(p.id) >= 0;
         if (exists) return;
         const r = this.create(p, { actorId, actorName });
         if (r.ok) created += 1;
      });

      return { ok: true, created };
   },

   /**
    * ✅ 위험 작업: 모두 삭제
    */
   clearAll({ actorId = 'admin', actorName = 'ADMIN' } = {}) {
      state = { items: [] };
      notify();

      auditLog.append({
         actorId,
         actorName,
         action: 'PRODUCT_CLEAR_ALL',
         targetType: 'PRODUCT',
         targetId: '*',
         diff: null,
      });

      return { ok: true };
   },
};
