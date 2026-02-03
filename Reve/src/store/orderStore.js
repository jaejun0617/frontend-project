/**
 * 📍 위치: src/store/orderStore.js
 * 역할: 주문 저장소(localStorage) - 유저별 분리
 */
const STORAGE_PREFIX = 'reve_orders_v1:';
let ownerKey = 'guest';

function storageKey() {
   return `${STORAGE_PREFIX}${ownerKey}`;
}

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readState() {
   const raw = localStorage.getItem(storageKey());
   const parsed = raw ? safeParse(raw) : null;
   return {
      orders: Array.isArray(parsed?.orders) ? parsed.orders : [],
   };
}

function writeState(next) {
   localStorage.setItem(storageKey(), JSON.stringify(next));
}

let state = readState();
const listeners = new Set();
function notify() {
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

function normalizeStatus(s) {
   const v = String(s || '').toUpperCase();
   if (
      v === 'PAID' ||
      v === 'SHIPPING' ||
      v === 'DELIVERED' ||
      v === 'CANCELED'
   )
      return v;
   return 'PAID';
}

export const orderStore = {
   setOwner(nextOwner) {
      ownerKey = String(nextOwner || 'guest');
      state = readState();
      notify();
   },

   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getOrders() {
      const list = Array.isArray(state.orders) ? state.orders : [];
      return [...list].sort(
         (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
      );
   },

   getOrder(orderId) {
      const id = String(orderId || '').trim();
      if (!id) return null;
      return state.orders.find((o) => o.orderId === id) || null;
   },

   createOrder(orderPayload) {
      const payload =
         orderPayload && typeof orderPayload === 'object' ? orderPayload : null;
      if (!payload?.orderId)
         return { ok: false, message: 'orderId가 필요해요.' };

      const next = {
         ...payload,
         status: normalizeStatus(payload.status || 'PAID'),
         createdAt: payload.createdAt
            ? Date.parse(payload.createdAt)
            : Date.now(),
         updatedAt: Date.now(),
      };

      // 동일 orderId 중복 방지
      if (state.orders.some((o) => o.orderId === next.orderId)) {
         return { ok: false, message: '이미 존재하는 주문이에요.' };
      }

      state = { ...state, orders: [next, ...state.orders] };
      notify();
      return { ok: true, orderId: next.orderId };
   },

   updateOrderStatus(orderId, status) {
      const id = String(orderId || '').trim();
      if (!id) return { ok: false, message: 'orderId가 필요해요.' };

      const nextStatus = normalizeStatus(status);
      state = {
         ...state,
         orders: state.orders.map((o) =>
            o.orderId === id
               ? { ...o, status: nextStatus, updatedAt: Date.now() }
               : o,
         ),
      };
      notify();
      return { ok: true };
   },
};
