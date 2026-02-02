/**
 * =============================================
 * 📍 위치: src/store/cartStore.js
 * 역할: 장바구니 전역 상태 + localStorage 영속화
 *
 * ✅ 옵션 확장
 * - productId + 옵션(size/color)을 함께 저장
 * - 같은 productId라도 옵션이 다르면 "다른 라인아이템"으로 취급
 * =============================================
 */

import { getProducts } from '../api/products.js';

const STORAGE_KEY = 'eclat_cart';

/**
 * @typedef {Object} CartOptions
 * @property {string} [size]  - 'S' | 'M' | 'L' | 'XL' | '220'...
 * @property {string} [color] - 'Black' 같은 영문 컬러
 */

/**
 * @typedef {Object} CartItem
 * @property {string} key
 * @property {string} productId
 * @property {number} qty
 * @property {CartOptions} options
 */

/* ==============================
   0) localStorage 유틸
   ============================== */

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function makeKey(productId, options = {}) {
   const id = String(productId || '').trim();
   const size = String(options.size || '').trim();
   const color = String(options.color || '').trim();
   return `${id}::${size}::${color}`;
}

function normalizeLoadedItems(rawItems) {
   // ✅ 이전 버전({productId, qty})도 마이그레이션해서 살려줌
   if (!Array.isArray(rawItems)) return [];

   return rawItems
      .map((it) => {
         const productId = String(it?.productId ?? '').trim();
         const qty = Number(it?.qty ?? 1);
         if (!productId) return null;

         const options =
            it?.options && typeof it.options === 'object'
               ? {
                    size: it.options.size ? String(it.options.size) : '',
                    color: it.options.color ? String(it.options.color) : '',
                 }
               : {};

         const key =
            String(it?.key ?? '').trim() || makeKey(productId, options);

         return {
            key,
            productId,
            qty: Math.max(1, Math.min(99, qty)),
            options,
         };
      })
      .filter(Boolean);
}

function readCart() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;
   return normalizeLoadedItems(parsed);
}

function writeCart(items) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ==============================
   1) Store 상태 + 구독
   ============================== */

let state = {
   /** @type {CartItem[]} */
   items: readCart(),
};

/** @type {Set<(state: typeof state) => void>} */
const listeners = new Set();

function notify() {
   writeCart(state.items);
   listeners.forEach((fn) => fn(state));
}

export const cartStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getCount() {
      return state.items.reduce((acc, it) => acc + it.qty, 0);
   },

   clear() {
      state = { ...state, items: [] };
      notify();
   },

   remove(keyOrProductId) {
      const key = String(keyOrProductId || '').trim();
      if (!key) return;

      state = {
         ...state,
         items: state.items.filter(
            (it) => it.key !== key && it.productId !== key,
         ),
      };
      notify();
   },

   updateQty(keyOrProductId, nextQty) {
      const target = String(keyOrProductId || '').trim();
      if (!target) return;

      const qty = Math.max(1, Math.min(99, Number(nextQty || 1)));

      state = {
         ...state,
         items: state.items.map((it) => {
            const hit = it.key === target || it.productId === target;
            return hit ? { ...it, qty } : it;
         }),
      };
      notify();
   },

   /**
    * 장바구니 담기
    * @param {string} productId
    * @param {number} qty
    * @param {CartOptions} options
    */
   async addById(productId, qty = 1, options = {}) {
      const id = String(productId || '').trim();
      if (!id) return;

      const addQty = Math.max(1, Math.min(99, Number(qty || 1)));

      // (안전) 실제 상품인지 확인
      const products = await getProducts();
      const exists = products.some((p) => p.id === id);
      if (!exists) {
         console.warn('[cartStore] unknown productId:', id);
         return;
      }

      const normalizedOptions = {
         size: options?.size ? String(options.size).trim() : '',
         color: options?.color ? String(options.color).trim() : '',
      };

      const key = makeKey(id, normalizedOptions);

      const found = state.items.find((it) => it.key === key);
      if (found) {
         this.updateQty(key, found.qty + addQty);
         return;
      }

      state = {
         ...state,
         items: [
            ...state.items,
            { key, productId: id, qty: addQty, options: normalizedOptions },
         ],
      };
      notify();
   },

   async getDetailedItems() {
      const products = await getProducts();

      return state.items
         .map((it) => {
            const product = products.find((p) => p.id === it.productId);
            if (!product) return null;

            return {
               key: it.key,
               product,
               qty: it.qty,
               options: it.options || {},
            };
         })
         .filter(Boolean);
   },
};
