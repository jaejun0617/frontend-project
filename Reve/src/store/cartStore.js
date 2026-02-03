/**
 * =============================================
 * 📍 위치: src/store/cartStore.js
 * 역할: 장바구니 전역 저장소 (유저별 localStorage 분리)
 *
 * ✅ 기존 API 유지
 * - subscribe(listener)
 * - getState()
 * - setOwner(userId)
 * - getCount()
 * - clear()
 * - addById(productId, qty, options?)
 * - updateQty(key, nextQty)
 * - remove(key)
 * - getDetailedItems()
 *
 * ✅ 추가 API
 * - getItemsByProductId(productId)          // 상품리스트 "담김" 표시용
 * - hasLine(productId, options?)            // 특정 옵션 라인이 담겼는지
 * - updateOptions(key, nextOptions)         // 장바구니에서 사이즈 변경 + 라인 병합
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

/**
 * ✅ 옵션 정규화
 * - 현재는 color/size만 사용
 * - 빈 값은 제거해서 key가 안정적으로 유지되게 함
 */
function normalizeOptions(options) {
   const o = options && typeof options === 'object' ? options : {};
   const color = String(o.color || '').trim();
   const size = String(o.size || '').trim();

   return {
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
   };
}

/**
 * ✅ 라인 키 생성 규칙
 * - 같은 상품 + 같은 옵션이면 같은 key
 * - 옵션 순서/형태가 달라도 normalizeOptions로 동일 key 보장
 */
function buildLineKey(productId, options) {
   const id = String(productId || '').trim();
   const o = normalizeOptions(options);

   const color = String(o.color || '');
   const size = String(o.size || '');

   return `${id}::color=${color}::size=${size}`;
}

function clampQty(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return 1;
   return Math.max(1, Math.min(99, v));
}

function normalizeItems(items) {
   if (!Array.isArray(items)) return [];

   return items
      .map((it) => {
         const id = String(it?.id ?? it?.productId ?? '').trim();
         if (!id) return null;

         const options = normalizeOptions(it?.options);
         const key = String(it?.key || '').trim() || buildLineKey(id, options);

         const qty = clampQty(it?.qty ?? 1);

         return { key, id, qty, options };
      })
      .filter(Boolean);
}

function readStateByOwner(ownerKey) {
   const raw = localStorage.getItem(storageKey(ownerKey));
   const parsed = raw ? safeParse(raw) : null;

   // ✅ 레거시 마이그레이션: reve_cart_v1(단일키) → guest로 1회 이동
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

let ownerKey = makeOwnerKey(null);
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

   /**
    * ✅ owner 스위칭 (로그인/로그아웃 시)
    * - userId가 바뀌면 storageKey도 바뀜
    */
   setOwner(userId) {
      const nextOwnerKey = makeOwnerKey(userId);
      if (nextOwnerKey === ownerKey) return;

      // 현재 owner 저장
      writeStateByOwner(ownerKey, state);

      // owner 변경
      ownerKey = nextOwnerKey;
      state = readStateByOwner(ownerKey);

      // 구독자 갱신
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
    * ✅ (추가) 특정 productId 라인 목록
    * - 상품 리스트에서 "담김" 표시
    */
   getItemsByProductId(productId) {
      const id = String(productId || '').trim();
      if (!id) return [];
      return state.items.filter((it) => it.id === id);
   },

   /**
    * ✅ (추가) 담김 여부
    * - options 없으면: 해당 상품이 1개라도 담겼는지
    * - options 있으면: 동일 라인(key) 존재 여부
    */
   hasLine(productId, options) {
      const id = String(productId || '').trim();
      if (!id) return false;

      if (!options) return this.getItemsByProductId(id).length > 0;

      const idx = findIndexBySameLine(id, options);
      return idx >= 0;
   },

   /**
    * ✅ 상품 담기
    * - 같은 상품 + 같은 옵션이면 qty 누적
    */
   async addById(productId, qty = 1, options = {}) {
      const id = String(productId || '').trim();
      if (!id) return { ok: false, message: '상품 id가 없습니다.' };

      // ✅ 존재 검증 (Cart/Detail에서 product 결합하니까 안전)
      const product = await getProductById(id);
      if (!product) return { ok: false, message: '상품을 찾을 수 없습니다.' };

      const addQty = clampQty(qty);
      const normalizedOptions = normalizeOptions(options);

      const idx = findIndexBySameLine(id, normalizedOptions);
      if (idx >= 0) {
         const current = state.items[idx];
         const nextItems = [...state.items];
         nextItems[idx] = { ...current, qty: clampQty(current.qty + addQty) };

         state = { ...state, items: nextItems };
         notify();
         return {
            ok: true,
            message: '수량이 추가되었습니다.',
            key: nextItems[idx].key,
         };
      }

      const key = buildLineKey(id, normalizedOptions);
      const next = { key, id, qty: addQty, options: normalizedOptions };

      state = { ...state, items: [next, ...state.items] };
      notify();
      return { ok: true, message: '장바구니에 담겼습니다.', key };
   },

   /**
    * ✅ 수량 변경
    * - 0 이하로 내려가면 remove
    */
   updateQty(key, nextQty) {
      const idx = findIndexByKey(key);
      if (idx < 0) return;

      const q = Number(nextQty);
      if (!Number.isFinite(q)) return;

      if (q <= 0) {
         this.remove(key);
         return;
      }

      const nextItems = [...state.items];
      nextItems[idx] = { ...nextItems[idx], qty: clampQty(q) };

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
    * ✅ (추가) 옵션 변경 (예: 사이즈 변경)
    * - 옵션이 바뀌면 key도 바뀜
    * - 바뀐 key 라인이 이미 존재하면 qty 병합
    */
   updateOptions(key, nextOptions = {}) {
      const idx = findIndexByKey(key);
      if (idx < 0) {
         return { ok: false, message: '대상 라인을 찾지 못했습니다.' };
      }

      const current = state.items[idx];

      const mergedOptions = normalizeOptions({
         ...(current.options || {}),
         ...(nextOptions || {}),
      });

      const nextKey = buildLineKey(current.id, mergedOptions);

      // 변화 없음(하지만 options normalize 결과를 반영)
      if (nextKey === current.key) {
         const nextItems = [...state.items];
         nextItems[idx] = { ...current, options: mergedOptions };

         state = { ...state, items: nextItems };
         notify();
         return { ok: true, message: '옵션이 변경되었습니다.', key: nextKey };
      }

      // ✅ 이미 동일 라인이 있으면 병합
      const existsIdx = findIndexByKey(nextKey);
      if (existsIdx >= 0) {
         const exists = state.items[existsIdx];
         const mergedQty = clampQty((exists.qty || 0) + (current.qty || 0));

         const nextItems = state.items
            .map((it) =>
               it.key === nextKey
                  ? { ...it, qty: mergedQty, options: mergedOptions }
                  : it,
            )
            .filter((it) => it.key !== current.key);

         state = { ...state, items: nextItems };
         notify();
         return {
            ok: true,
            message: '옵션이 변경되었고, 동일 라인은 병합되었습니다.',
            key: nextKey,
         };
      }

      // ✅ 그냥 교체
      const nextItems = [...state.items];
      nextItems[idx] = { ...current, key: nextKey, options: mergedOptions };

      state = { ...state, items: nextItems };
      notify();
      return { ok: true, message: '옵션이 변경되었습니다.', key: nextKey };
   },

   /**
    * ✅ CartPage에서 사용하는 "상세 결합"
    * return: [{ key, product, qty, options }]
    */
   async getDetailedItems() {
      const items = Array.isArray(state.items) ? state.items : [];

      const products = await Promise.all(
         items.map((it) => getProductById(it.id)),
      );

      return items
         .map((it, i) => ({
            key: it.key,
            product: products[i] ?? null,
            qty: it.qty,
            options: it.options ?? {},
         }))
         .filter((row) => Boolean(row.product));
   },
};
