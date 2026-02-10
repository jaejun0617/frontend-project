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

/**
 * ✅ ms 타임스탬프 안전 변환
 * - 숫자 아니면 null
 */
function toMs(v) {
   const n = Number(v);
   return Number.isFinite(n) ? n : null;
}

/**
 * ✅ 주문 상태 정규화
 */
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

/**
 * ✅ statusHistory 보장(마이그레이션 포함)
 * - 기존 주문에 history가 없으면 생성
 * - 현재 status가 SHIPPING/DELIVERED/CANCELED인데 해당 시각이 없으면 채움
 */
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

   // ✅ 과거 데이터도 한 번에 정리: createdAt/updatedAt ms 보장 + statusHistory 주입
   const normalizedOrders = orders.map((o) => {
      const createdAt = toMs(o?.createdAt) ?? Date.now();
      const updatedAt = toMs(o?.updatedAt) ?? createdAt;

      const base = {
         ...o,
         status: normalizeStatus(o?.status),
         createdAt,
         updatedAt,
      };

      return {
         ...base,
         statusHistory: ensureStatusHistory(base),
      };
   });

   return { orders: normalizedOrders };
}

/* ==============================
   4) Store core
============================== */

let state = readState();
const listeners = new Set();

function notify() {
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

function reloadFromStorage() {
   state = readState();
   notify(); // notify가 writeState도 하지만, 동일 값이면 큰 문제 없음
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
   /**
    * ✅ 유저 전환(소유자 키 변경)
    * - ownerKey 바뀌면 저장소도 분리됨
    */
   setOwner(nextOwner) {
      ownerKey = String(nextOwner || 'guest');
      state = readState();
      notify();
   },

   /**
    * ✅ 구독/해제
    * - listener는 최초 1회 즉시 호출
    */
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   /**
    * ✅ 최신 주문이 위로 오도록 정렬해서 반환
    */
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

   /**
    * ✅ 주문 생성
    * - createdAt/updatedAt 정규화
    * - statusHistory 생성(PAID 시각 기본 기록)
    */
   createOrder(orderPayload) {
      const payload =
         orderPayload && typeof orderPayload === 'object' ? orderPayload : null;

      if (!payload?.orderId) {
         return { ok: false, message: 'orderId가 필요해요.' };
      }

      // 동일 orderId 중복 방지
      if (state.orders.some((o) => o.orderId === payload.orderId)) {
         return { ok: false, message: '이미 존재하는 주문이에요.' };
      }

      const createdAt = payload.createdAt
         ? Date.parse(payload.createdAt)
         : Date.now();
      const now = Date.now();

      const next = {
         ...payload,
         status: normalizeStatus(payload.status || 'PAID'),
         createdAt: Number.isNaN(createdAt) ? now : createdAt,
         updatedAt: now,
      };

      // ✅ statusHistory 세팅(기본: PAID 기록)
      next.statusHistory = ensureStatusHistory(next);

      state = { ...state, orders: [next, ...state.orders] };
      notify();
      return { ok: true, orderId: next.orderId };
   },

   /**
    * ✅ 주문 상태 변경
    * - statusHistory에 해당 단계 시각을 "처음 1회만" 기록(이미 있으면 유지)
    */
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

            // ✅ 상태 전환 "순간"을 찍는 느낌 (이미 찍혔으면 유지)
            if (nextStatus === 'PAID' && !patched.PAID) patched.PAID = now;
            if (nextStatus === 'SHIPPING' && !patched.SHIPPING)
               patched.SHIPPING = now;
            if (nextStatus === 'DELIVERED' && !patched.DELIVERED)
               patched.DELIVERED = now;
            if (nextStatus === 'CANCELED' && !patched.CANCELED)
               patched.CANCELED = now;

            return {
               ...o,
               status: nextStatus,
               updatedAt: now,
               statusHistory: patched,
            };
         }),
      };

      notify();
      return { ok: true };
   },
};
