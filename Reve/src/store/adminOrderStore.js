/**
 * =============================================
 * 📍 위치: src/store/adminOrderStore.js
 * 역할: 관리자용 전체 주문 조회/상태 변경
 * =============================================
 */
import { validateOrderStatusTransition } from '../utils/validate.js';

const STORAGE_PREFIX = 'reve_orders_v1:';

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function nowMs() {
   return Date.now();
}

function toMs(v) {
   const n = Number(v);
   return Number.isFinite(n) ? n : null;
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

function ensureStatusHistory(order) {
   const createdAt = toMs(order?.createdAt) ?? nowMs();

   const base =
      order?.statusHistory && typeof order.statusHistory === 'object'
         ? order.statusHistory
         : null;

   const next = {
      PAID: toMs(base?.PAID) ?? createdAt,
      SHIPPING: toMs(base?.SHIPPING) ?? null,
      DELIVERED: toMs(base?.DELIVERED) ?? null,
      CANCELED: toMs(base?.CANCELED) ?? null,
   };

   const s = normalizeStatus(order?.status || 'PAID');
   const updatedAt = toMs(order?.updatedAt) ?? nowMs();

   if (s === 'SHIPPING' && !next.SHIPPING) next.SHIPPING = updatedAt;
   if (s === 'DELIVERED' && !next.DELIVERED) next.DELIVERED = updatedAt;
   if (s === 'CANCELED' && !next.CANCELED) next.CANCELED = updatedAt;

   return next;
}

function readOrdersByOwner(ownerKey) {
   const key = `${STORAGE_PREFIX}${ownerKey}`;
   const raw = localStorage.getItem(key);
   const parsed = raw ? safeParse(raw) : null;

   const orders = Array.isArray(parsed?.orders) ? parsed.orders : [];

   return orders
      .map((o) => {
         const createdAt = toMs(o?.createdAt) ?? nowMs();
         const updatedAt = toMs(o?.updatedAt) ?? createdAt;

         const base = {
            ...o,
            __ownerKey: String(o?.__ownerKey || ownerKey), // ✅ 보강
            status: normalizeStatus(o?.status),
            createdAt,
            updatedAt,
         };

         return {
            ...base,
            statusHistory: ensureStatusHistory(base),
         };
      })
      .filter((o) => Boolean(o?.orderId));
}

function writeOrdersByOwner(ownerKey, orders) {
   const key = `${STORAGE_PREFIX}${ownerKey}`;
   localStorage.setItem(key, JSON.stringify({ orders }));
}

function scanOwnerKeys() {
   const set = new Set();
   for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(STORAGE_PREFIX)) set.add(k.slice(STORAGE_PREFIX.length));
   }
   return [...set];
}

function ok(extra = {}) {
   return { ok: true, ...extra };
}

function fail(message) {
   return { ok: false, message };
}

export const adminOrderStore = {
   getAllOrders() {
      const owners = scanOwnerKeys();

      const all = owners.flatMap((owner) => {
         const orders = readOrdersByOwner(owner);
         return orders.map((o) => ({ ...o, __ownerKey: owner }));
      });

      return all.sort(
         (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
      );
   },

   getOrder(orderId) {
      const id = String(orderId || '').trim();
      if (!id) return null;

      const owners = scanOwnerKeys();
      for (const owner of owners) {
         const orders = readOrdersByOwner(owner);
         const hit = orders.find((o) => o.orderId === id);
         if (hit) return { ...hit, __ownerKey: owner };
      }
      return null;
   },

   updateOrderStatus(orderId, nextStatus) {
      const id = String(orderId || '').trim();
      if (!id) return fail('orderId가 필요합니다.');

      const next = normalizeStatus(nextStatus);
      const found = this.getOrder(id);
      if (!found) return fail('주문을 찾을 수 없습니다.');

      const owner = found.__ownerKey;
      const orders = readOrdersByOwner(owner);

      const idx = orders.findIndex((o) => o.orderId === id);
      if (idx < 0) return fail('주문을 찾을 수 없습니다.');

      const now = nowMs();
      const current = orders[idx];

      const history = ensureStatusHistory(current);
      const patched = { ...history };

      const currentStatus = String(current.status || 'PAID').toUpperCase();
      const v = validateOrderStatusTransition(currentStatus, next);
      if (!v.ok) return fail(v.message);

      if (next === 'PAID' && !patched.PAID) patched.PAID = now;
      if (next === 'SHIPPING' && !patched.SHIPPING) patched.SHIPPING = now;
      if (next === 'DELIVERED' && !patched.DELIVERED) patched.DELIVERED = now;
      if (next === 'CANCELED' && !patched.CANCELED) patched.CANCELED = now;

      const nextOrder = {
         ...current,
         __ownerKey: String(current.__ownerKey || owner),
         status: next,
         updatedAt: now,
         statusHistory: patched,
      };

      const nextOrders = [...orders];
      nextOrders[idx] = nextOrder;
      writeOrdersByOwner(owner, nextOrders);

      window.dispatchEvent(
         new CustomEvent('reve:orders-changed', {
            detail: { ownerKey: owner, orderId: id, status: next },
         }),
      );

      return ok({ orderId: id, owner, status: next });
   },
};
