/**
 * =============================================
 * 📍 위치: src/store/cartStore.js
 * 역할: 장바구니 전역 저장소 (유저별 localStorage 분리)
 *
 * ✅ 제공 API (기존 페이지들이 기대하는 것)
 * - subscribe(listener)
 * - getState()
 * - setOwner(userId)              // 로그인/로그아웃 시 owner 스위칭
 * - getCount()
 * - clear()
 * - addById(productId, qty, options?)
 * - updateQty(key, nextQty)
 * - remove(key)
 * - getDetailedItems()            // CartPage에서 사용 (product 결합)
 * =============================================
 */

import { getProductById } from '../api/products.js';

const STORAGE_BASE = 'reve_cart_v1';

/* ==============================
   0) Storage / Normalizer
   ============================== */

function makeOwnerKey(userId) {
   const id = String(userId || '').trim();
   return id ? id : 'guest';
}

function storageKey(ownerKey) {
   return `${STORAGE_BASE}:${ownerKey}`;
}

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function normalizeOptions(options) {
   const o = options && typeof options === 'object' ? options : {};
   const color = String(o.color || '').trim();
   const size = String(o.size || '').trim();

   // ✅ 앞으로 옵션이 늘어나도 여기만 확장하면 됨
   return {
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
   };
}

function buildLineKey(productId, options) {
   const id = String(productId || '').trim();
   const o = normalizeOptions(options);

   // key 안정성: 옵션 순서/형태가 달라도 동일하게
   const color = String(o.color || '');
   const size = String(o.size || '');

   return `${id}::color=${color}::size=${size}`;
}

function normalizeItems(items) {
   if (!Array.isArray(items)) return [];

   return items
      .map((it) => {
         const id = String(it?.id ?? it?.productId ?? '').trim();
         if (!id) return null;

         const options = normalizeOptions(it?.options);
         const key = String(it?.key || '').trim() || buildLineKey(id, options);

         const qtyRaw = Number(it?.qty ?? 1);
         const qty = Number.isFinite(qtyRaw) ? Math.max(1, qtyRaw) : 1;

         return {
            key,
            id,
            qty,
            options,
         };
      })
      .filter(Boolean);
}

function readStateByOwner(ownerKey) {
   const raw = localStorage.getItem(storageKey(ownerKey));
   const parsed = raw ? safeParse(raw) : null;

   // ✅ 레거시 마이그레이션(예전 단일 키 STORAGE_BASE -> guest로 1회 이동)
   if (!raw) {
      const legacyRaw = localStorage.getItem(STORAGE_BASE);
      const legacyParsed = legacyRaw ? safeParse(legacyRaw) : null;
      const legacyItems = normalizeItems(
         legacyParsed?.items ?? legacyParsed ?? [],
      );

      if (ownerKey === 'guest' && legacyItems.length) {
         const migrated = { items: legacyItems, updatedAt: Date.now() };
         localStorage.setItem(storageKey('guest'), JSON.stringify(migrated));
         return migrated;
      }
   }

   return {
      items: normalizeItems(parsed?.items ?? parsed ?? []),
      updatedAt: Number(parsed?.updatedAt ?? Date.now()),
   };
}

function writeStateByOwner(ownerKey, next) {
   localStorage.setItem(storageKey(ownerKey), JSON.stringify(next));
}

/* ==============================
   1) Store core
   ============================== */

let ownerKey = makeOwnerKey(null); // 기본 guest
let state = readStateByOwner(ownerKey);

/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   state = { ...state, updatedAt: Date.now() };
   writeStateByOwner(ownerKey, state);
   listeners.forEach((fn) => fn(state));
}

function findIndexByKey(key) {
   const k = String(key || '').trim();
   if (!k) return -1;
   return state.items.findIndex((it) => it.key === k);
}

function findIndexBySameLine(productId, options) {
   const key = buildLineKey(productId, options);
   return state.items.findIndex((it) => it.key === key);
}

/* ==============================
   2) Public API
   ============================== */

export const cartStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   // ✅ 로그인/로그아웃 때 owner 스위칭 (app.js에서 호출)
   setOwner(userId) {
      const nextOwnerKey = makeOwnerKey(userId);
      if (nextOwnerKey === ownerKey) return;

      // 1) 현재 owner 상태 저장
      writeStateByOwner(ownerKey, state);

      // 2) owner 스위치
      ownerKey = nextOwnerKey;

      // 3) 새 owner state 로드
      state = readStateByOwner(ownerKey);

      // 4) 구독자 알림 (UI 즉시 반영)
      listeners.forEach((fn) => fn(state));
   },

   getCount() {
      return Array.isArray(state.items)
         ? state.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
         : 0;
   },

   clear() {
      state = { ...state, items: [] };
      notify();
   },

   /**
    * ✅ 상품 담기
    * - 같은 상품 + 같은 옵션이면 qty 누적
    * - options: { color?, size? }
    */
   async addById(productId, qty = 1, options = {}) {
      const id = String(productId || '').trim();
      if (!id) return { ok: false, message: '상품 id가 없습니다.' };

      // (선택) 존재 검증: 상세/장바구니에서 product 접근하니까 안전하게 확인
      const product = await getProductById(id);
      if (!product) return { ok: false, message: '상품을 찾을 수 없습니다.' };

      const addQtyRaw = Number(qty);
      const addQty = Number.isFinite(addQtyRaw) ? Math.max(1, addQtyRaw) : 1;

      const normalizedOptions = normalizeOptions(options);
      const key = buildLineKey(id, normalizedOptions);

      const idx = findIndexBySameLine(id, normalizedOptions);

      if (idx >= 0) {
         const current = state.items[idx];
         const nextItem = { ...current, qty: current.qty + addQty };

         const nextItems = [...state.items];
         nextItems[idx] = nextItem;

         state = { ...state, items: nextItems };
         notify();
         return { ok: true, message: '수량이 추가되었습니다.' };
      }

      const next = {
         key,
         id,
         qty: addQty,
         options: normalizedOptions,
      };

      state = { ...state, items: [next, ...state.items] };
      notify();
      return { ok: true, message: '장바구니에 담겼습니다.' };
   },

   /**
    * ✅ 수량 변경
    * - 0 이하로 내려가면 remove 처리
    */
   updateQty(key, nextQty) {
      const idx = findIndexByKey(key);
      if (idx < 0) return;

      const qRaw = Number(nextQty);
      const q = Number.isFinite(qRaw) ? qRaw : 1;

      if (q <= 0) {
         this.remove(key);
         return;
      }

      const nextItems = [...state.items];
      nextItems[idx] = { ...nextItems[idx], qty: Math.max(1, q) };

      state = { ...state, items: nextItems };
      notify();
   },

   remove(key) {
      const idx = findIndexByKey(key);
      if (idx < 0) return;

      state = { ...state, items: state.items.filter((it) => it.key !== key) };
      notify();
   },

   /**
    * ✅ CartPage에서 쓰는 "상세 결합"
    * return: [{ key, product, qty, options }]
    */
   async getDetailedItems() {
      const items = Array.isArray(state.items) ? state.items : [];

      const products = await Promise.all(
         items.map((it) => getProductById(it.id)),
      );

      const detailed = items
         .map((it, i) => ({
            key: it.key,
            product: products[i] ?? null,
            qty: it.qty,
            options: it.options ?? {},
         }))
         .filter((row) => Boolean(row.product));

      // (선택) 누락 상품이 많으면 정리해도 되지만, 여기서는 데이터 건드리지 않음
      return detailed;
   },
};
