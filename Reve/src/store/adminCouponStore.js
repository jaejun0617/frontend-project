/**
 * =============================================
 * 📍 위치: src/store/adminCouponStore.js
 * 역할: 관리자용 쿠폰 Catalog 저장소(localStorage)
 *
 * ✅ 기능
 * - 쿠폰 CRUD + 정규화/복구
 * - 기간/최소금액/사용제한 등 운영 필드 포함
 * =============================================
 */

const STORAGE_KEY = 'reve_admin_coupons_v1';

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

function normalizeText(v) {
   return String(v ?? '').trim();
}

function normalizeCode(v) {
   return normalizeText(v).toUpperCase();
}

function clampRate(v) {
   const n = Number(v);
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.min(1, n));
}

function toMsMaybe(v) {
   const s = normalizeText(v);
   if (!s) return 0;
   const n = Number(s);
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

function toIntMaybe(v) {
   const s = normalizeText(v);
   if (!s) return 0;
   const n = Number(s);
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

function normalizeCoupon(raw) {
   if (!raw || typeof raw !== 'object') return null;

   const code = normalizeCode(raw.code);
   const title = normalizeText(raw.title);

   if (!code || !title) return null;

   const rate = clampRate(raw.rate);

   return {
      code,
      title,
      rate,

      active: raw.active === false ? false : true,

      // 기간(선택)
      startsAt: toMsMaybe(raw.startsAt),
      endsAt: toMsMaybe(raw.endsAt),

      // 조건(선택)
      minOrderTotal: toIntMaybe(raw.minOrderTotal),
      maxUses: toIntMaybe(raw.maxUses),

      description: normalizeText(raw.description || ''),

      createdAt: Number(raw.createdAt || nowMs()),
      updatedAt: Number(raw.updatedAt || nowMs()),
   };
}

function normalizeState(parsed) {
   const items = Array.isArray(parsed?.items) ? parsed.items : [];
   const normalized = items.map(normalizeCoupon).filter(Boolean);

   const map = new Map();
   normalized.forEach((c) => {
      const prev = map.get(c.code);
      if (!prev) map.set(c.code, c);
      else map.set(c.code, prev.updatedAt >= c.updatedAt ? prev : c);
   });

   const out = Array.from(map.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
   );
   return { items: out, updatedAt: Number(parsed?.updatedAt || nowMs()) };
}

function readState() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;
   return normalizeState(parsed || {});
}

function writeState(next) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

let state = readState();
/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   state = { ...state, updatedAt: nowMs() };
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

function exists(code) {
   const c = normalizeCode(code);
   return state.items.some((x) => x.code === c);
}

function ok(extra = {}) {
   return { ok: true, ...extra };
}

function fail(message) {
   return { ok: false, message };
}

export const adminCouponStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getCoupons() {
      return state.items;
   },

   getCoupon(code) {
      const c = normalizeCode(code);
      return state.items.find((x) => x.code === c) || null;
   },

   create(draft) {
      const c = normalizeCoupon(draft);
      if (!c) return fail('쿠폰 데이터가 올바르지 않습니다.');
      if (exists(c.code)) return fail('이미 존재하는 쿠폰 코드입니다.');

      const now = nowMs();
      const next = { ...c, createdAt: now, updatedAt: now };

      state = { ...state, items: [next, ...state.items] };
      notify();
      return ok({ code: next.code });
   },

   update(code, patch) {
      const key = normalizeCode(code);
      const current = this.getCoupon(key);
      if (!current) return fail('쿠폰을 찾을 수 없습니다.');

      const basePatch = patch && typeof patch === 'object' ? patch : {};
      const merged = { ...current, ...basePatch, code: current.code };

      const normalized = normalizeCoupon(merged);
      if (!normalized) return fail('수정 데이터가 올바르지 않습니다.');

      const next = {
         ...normalized,
         createdAt: current.createdAt,
         updatedAt: nowMs(),
      };

      state = {
         ...state,
         items: state.items.map((x) => (x.code === key ? next : x)),
      };
      notify();
      return ok({ code: key });
   },

   remove(code) {
      const key = normalizeCode(code);
      if (!exists(key)) return fail('쿠폰을 찾을 수 없습니다.');

      state = { ...state, items: state.items.filter((x) => x.code !== key) };
      notify();
      return ok({ code: key });
   },

   seed() {
      const samples = [
         {
            code: `WELCOME10_${String(Date.now()).slice(-4)}`,
            title: '첫 구매 환영 10%',
            rate: 0.1,
            active: true,
            minOrderTotal: 0,
            maxUses: 1,
            description: '첫 구매 고객 대상 10% 할인',
         },
         {
            code: `SPRING7_${String(Date.now()).slice(-4)}`,
            title: '시즌 7%',
            rate: 0.07,
            active: true,
            minOrderTotal: 30000,
            maxUses: 3,
            description: '3만원 이상 결제 시 7% 할인',
         },
      ];

      let created = 0;
      samples.forEach((s) => {
         const c = normalizeCoupon(s);
         if (!c) return;
         if (exists(c.code)) return;
         state = {
            ...state,
            items: [
               { ...c, createdAt: nowMs(), updatedAt: nowMs() },
               ...state.items,
            ],
         };
         created += 1;
      });

      if (created > 0) notify();
      return ok({ count: created });
   },

   clearAll() {
      state = { items: [], updatedAt: nowMs() };
      localStorage.removeItem(STORAGE_KEY);
      notify();
   },
};
