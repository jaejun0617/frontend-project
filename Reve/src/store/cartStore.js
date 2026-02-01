/**
 * =============================================
 * 📍 위치: src/store/cartStore.js
 * 역할: 장바구니 전역 상태 + localStorage 영속화
 *
 * ✅ 목표(MVP)
 * - 비로그인 장바구니: localStorage에 저장
 * - add / remove / updateQty / clear
 * - subscribe(notify)로 UI 갱신 트리거
 *
 * 🔜 나중에
 * - 로그인 시 Firestore 동기화로 교체해도
 *   UI 쪽 코드는 그대로 두고 store만 교체 가능
 * =============================================
 */

import { getProducts } from '../api/products.js';

const STORAGE_KEY = 'eclat_cart';

/** @typedef {{ productId: string, qty: number }} CartItem */

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

function readCart() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;

   // 형태 방어: 배열이 아니면 빈 배열로
   return Array.isArray(parsed) ? parsed : [];
}

function writeCart(items) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ==============================
   1) Store 상태 + 구독
   ============================== */

let state = {
   items: readCart(),
};

/** @type {Set<(state: typeof state) => void>} */
const listeners = new Set();

function notify() {
   // localStorage도 같이 최신화
   writeCart(state.items);

   // 구독자에게 상태 전달
   listeners.forEach((fn) => fn(state));
}

export const cartStore = {
   /**
    * 상태 구독
    * @param {(state: typeof state) => void} listener
    * @returns {() => void} unsubscribe
    */
   subscribe(listener) {
      listeners.add(listener);
      // 구독 즉시 한 번 상태 전달(초기 렌더 편함)
      listener(state);

      return () => listeners.delete(listener);
   },

   /** 현재 상태 읽기 */
   getState() {
      return state;
   },

   /** 아이템 수(수량 합) */
   getCount() {
      return state.items.reduce((acc, it) => acc + it.qty, 0);
   },

   /** 전체 비우기 */
   clear() {
      state = { ...state, items: [] };
      notify();
   },

   /** 특정 상품 제거 */
   remove(productId) {
      state = {
         ...state,
         items: state.items.filter((it) => it.productId !== productId),
      };
      notify();
   },

   /** 수량 변경(1~99로 방어) */
   updateQty(productId, nextQty) {
      const qty = Math.max(1, Math.min(99, Number(nextQty || 1)));

      state = {
         ...state,
         items: state.items.map((it) =>
            it.productId === productId ? { ...it, qty } : it,
         ),
      };
      notify();
   },

   /**
    * 장바구니 담기 (id 기반)
    * - ProductCard는 productId만 가지고 있으므로
    * - 실제 상품 존재 여부는 products API로 확인
    */
   async addById(productId, qty = 1) {
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

      const found = state.items.find((it) => it.productId === id);
      if (found) {
         // 이미 있으면 수량만 증가
         this.updateQty(id, found.qty + addQty);
         return;
      }

      // 신규 추가
      state = {
         ...state,
         items: [...state.items, { productId: id, qty: addQty }],
      };
      notify();
   },

   /**
    * 장바구니 아이템을 "상품 상세"와 조합해서 반환
    * - Cart 페이지에서 렌더할 때 편하게 쓰라고 제공
    */
   async getDetailedItems() {
      const products = await getProducts();

      return state.items
         .map((it) => {
            const product = products.find((p) => p.id === it.productId);
            if (!product) return null;
            return { product, qty: it.qty };
         })
         .filter(Boolean);
   },
};

// 새로고침/재접속 시에도 상태가 유지되도록 초기화에서 한 번 notify는 하지 않음
// (UI는 subscribe() 시점에 상태를 받음)
