/**
 * =============================================
 * 📍 위치: src/store/orderStore.js
 * 역할: 주문 저장소(localStorage) - 유저별 분리 + 배송 상태 히스토리
 *
 * 핵심 기능
 * - 유저별 주문 저장(localStorage key 분리)
 * - 주문 생성(createOrder) / 조회(getOrders, getOrder) / 상태 변경(updateOrderStatus)
 * - subscribe 패턴으로 UI 자동 동기화
 *
 * 배송 단계 날짜(statusHistory)
 * - 상태 전환 순간의 타임스탬프를 order.statusHistory에 기록
 *   { PAID, SHIPPING, DELIVERED, CANCELED } (ms)
 * - 기존 데이터(히스토리 없는 주문)는 readState에서 1회 마이그레이션
 *
 * 상태 규칙
 * - status는 PAID | SHIPPING | DELIVERED | CANCELED 만 허용
 * - createdAt/updatedAt은 number(ms)로 정규화
 *
 * ✅ 최종본 안정화 포인트
 * - storage/reload 흐름에서는 writeState 금지 (emit-only)
 * - 실제 상태 변경 액션에서만 persist+emit
 * =============================================
 */

const STORAGE_PREFIX = 'reve_orders_v1:';
let ownerKey = 'guest';

/* ==============================
   1) Storage helpers
============================== */

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

function writeState(next) {
   localStorage.setItem(storageKey(), JSON.stringify(next));
}

/* ==============================
   2) Normalizers
============================== */

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
   const createdAt = toMs(order?.createdAt) ?? Date.now();

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
   const updatedAt = toMs(order?.updatedAt) ?? Date.now();

   if (s === 'SHIPPING' && !next.SHIPPING) next.SHIPPING = updatedAt;
   if (s === 'DELIVERED' && !next.DELIVERED) next.DELIVERED = updatedAt;
   if (s === 'CANCELED' && !next.CANCELED) next.CANCELED = updatedAt;

   return next;
}

/* ==============================
   3) Read state (with migration)
============================== */

function readState() {
   const raw = localStorage.getItem(storageKey());
   const parsed = raw ? safeParse(raw) : null;

   const orders = Array.isArray(parsed?.orders) ? parsed.orders : [];

   const normalizedOrders = orders
      .map((o) => {
         const createdAt = toMs(o?.createdAt) ?? Date.now();
         const updatedAt = toMs(o?.updatedAt) ?? createdAt;

         const base = {
            ...o,
            // ✅ user 주문에도 __ownerKey 보장 (admin/user 정합성)
            __ownerKey: String(o?.__ownerKey || ownerKey),
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

   return { orders: normalizedOrders };
}

/* ==============================
   4) Store core
============================== */

let state = readState();
const listeners = new Set();

/**
 * ✅ emit-only: 저장(write) 없이 UI만 갱신
 * - storage 이벤트/owner 전환 시 루프 방지
 */
function emit() {
   listeners.forEach((fn) => fn(state));
}

/**
 * ✅ persist + emit: 실제 상태 변경 액션에서만 사용
 */
function persistAndEmit() {
   writeState(state);
   emit();
}

function reloadFromStorage() {
   state = readState();
   emit(); // ✅ write 금지 (storage sync 루프 방지)
}

// ✅ 같은 탭 이벤트(관리자 페이지에서 쏨)
window.addEventListener('reve:orders-changed', (e) => {
   const owner = String(e?.detail?.ownerKey || '');
   if (owner && owner === ownerKey) reloadFromStorage();
});

// ✅ 다른 탭 변경(브라우저 storage 이벤트)
window.addEventListener('storage', (e) => {
   if (e.key === storageKey()) reloadFromStorage();
});

/* ==============================
   5) Public API
============================== */

export const orderStore = {
   setOwner(nextOwner) {
      ownerKey = String(nextOwner || 'guest');
      state = readState();
      emit(); // ✅ owner 전환은 read+emit만
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
      if (state.orders.some((o) => o.orderId === payload.orderId)) {
         return { ok: false, message: '이미 존재하는 주문이에요.' };
      }

      const now = Date.now();

      const createdAt =
         typeof payload.createdAt === 'number'
            ? payload.createdAt
            : typeof payload.createdAt === 'string'
              ? Number.isFinite(Date.parse(payload.createdAt))
                 ? Date.parse(payload.createdAt)
                 : now
              : now;

      const next = {
         ...payload,
         __ownerKey: String(payload.__ownerKey || ownerKey), // ✅ 강제 주입
         status: normalizeStatus(payload.status || 'PAID'),
         createdAt,
         updatedAt: now,
      };

      next.statusHistory = ensureStatusHistory(next);

      state = { ...state, orders: [next, ...state.orders] };
      persistAndEmit();

      return { ok: true, orderId: next.orderId };
   },

   updateOrderStatus(orderId, status) {
      const id = String(orderId || '').trim();
      if (!id) return { ok: false, message: 'orderId가 필요해요.' };

      const nextStatus = normalizeStatus(status);
      const now = Date.now();

      state = {
         ...state,
         orders: state.orders.map((o) => {
            if (o.orderId !== id) return o;

            const history = ensureStatusHistory(o);
            const patched = { ...history };

            if (nextStatus === 'PAID' && !patched.PAID) patched.PAID = now;
            if (nextStatus === 'SHIPPING' && !patched.SHIPPING)
               patched.SHIPPING = now;
            if (nextStatus === 'DELIVERED' && !patched.DELIVERED)
               patched.DELIVERED = now;
            if (nextStatus === 'CANCELED' && !patched.CANCELED)
               patched.CANCELED = now;

            return {
               ...o,
               __ownerKey: String(o.__ownerKey || ownerKey),
               status: nextStatus,
               updatedAt: now,
               statusHistory: patched,
            };
         }),
      };

      persistAndEmit();
      return { ok: true };
   },
};
