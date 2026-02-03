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
 * ✅ 추가 API (이번 작업 포인트)
 * - getItemsByProductId(productId)          // 상품리스트에서 "담김" 표시용
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
 * - 옵션 순서/형태가 달라도 normalizeOptions로 동일하게 됨
 */
function buildLineKey(productId, options) {
   const id = String(productId || '').trim();
   const o = normalizeOptions(options);

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

         return { key, id, qty, options };
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

function clampQty(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return 1;
   return Math.max(1, Math.min(99, v));
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
    * ✅ 로그인/로그아웃 때 owner 스위칭 (app.js에서 호출)
    * - owner가 바뀌면 장바구니도 다른 localStorage로 스위치됨
    */
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
    * ✅ (추가) 특정 productId가 장바구니에 담겨있는 라인들 반환
    * - 상품 리스트에서 "담김 상태" 표시할 때 사용
    */
   getItemsByProductId(productId) {
      const id = String(productId || '').trim();
      if (!id) return [];
      return state.items.filter((it) => it.id === id);
   },

   /**
    * ✅ (추가) 특정 옵션 라인이 담겨있는지 체크
    * - options 미지정이면 "해당 상품이 1개라도 담겼는지"로 동작
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
    * - options: { color?, size? }
    */
   async addById(productId, qty = 1, options = {}) {
      const id = String(productId || '').trim();
      if (!id) return { ok: false, message: '상품 id가 없습니다.' };

      // (선택) 존재 검증: 상세/장바구니에서 product 접근하니까 안전하게 확인
      const product = await getProductById(id);
      if (!product) return { ok: false, message: '상품을 찾을 수 없습니다.' };

      const addQty = clampQty(qty);

      const normalizedOptions = normalizeOptions(options);
      const key = buildLineKey(id, normalizedOptions);

      const idx = findIndexBySameLine(id, normalizedOptions);

      if (idx >= 0) {
         const current = state.items[idx];
         const nextItem = { ...current, qty: clampQty(current.qty + addQty) };

         const nextItems = [...state.items];
         nextItems[idx] = nextItem;

         state = { ...state, items: nextItems };
         notify();
         return { ok: true, message: '수량이 추가되었습니다.', key };
      }

      const next = { key, id, qty: addQty, options: normalizedOptions };

      state = { ...state, items: [next, ...state.items] };
      notify();
      return { ok: true, message: '장바구니에 담겼습니다.', key };
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
    * ✅ (추가) 옵션 변경 (예: 장바구니에서 사이즈 변경)
    *
    * 핵심:
    * - key는 옵션에 의해 결정됨 → 옵션이 바뀌면 key도 바뀜
    * - 바뀐 key 라인이 이미 존재하면 qty 병합(중복 라인 방지)
    *
    * @returns {{ok:boolean, message:string, key?:string}}
    */
   updateOptions(key, nextOptions = {}) {
      const idx = findIndexByKey(key);
      if (idx < 0)
         return { ok: false, message: '대상 라인을 찾지 못했습니다.' };

      const current = state.items[idx];
      const mergedOptions = normalizeOptions({
         ...(current.options || {}),
         ...(nextOptions || {}),
      });

      const nextKey = buildLineKey(current.id, mergedOptions);

      // 옵션은 바뀌었지만 key가 동일(사실상 변화 없음)
      if (nextKey === current.key) {
         const nextItems = [...state.items];
         nextItems[idx] = { ...current, options: mergedOptions };
         state = { ...state, items: nextItems };
         notify();
         return { ok: true, message: '옵션이 변경되었습니다.', key: nextKey };
      }

      const existsIdx = findIndexByKey(nextKey);

      // ✅ 이미 같은 라인이 존재하면 qty 병합하고 기존 라인은 제거
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

      // ✅ 새 라인으로 교체(기존 라인의 key/options만 업데이트)
      const replaced = { ...current, key: nextKey, options: mergedOptions };

      const nextItems = [...state.items];
      nextItems[idx] = replaced;

      state = { ...state, items: nextItems };
      notify();

      return { ok: true, message: '옵션이 변경되었습니다.', key: nextKey };
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

      return detailed;
   },
};
