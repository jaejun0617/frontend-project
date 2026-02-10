/**
 * =============================================
 * 📍 위치: src/store/adminCouponLedgerStore.js
 * 역할: 쿠폰 발급/사용 원장(ledger)
 * - type: ISSUE / USE
 * - Admin 통계/이력의 정답 루트
 * =============================================
 */

const STORAGE_KEY = 'reve_admin_coupon_ledger_v1';
const MAX_ITEMS = 2000;

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

function uid(prefix = 'ledg') {
   return `${prefix}_${nowMs()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeCode(code) {
   return String(code ?? '')
      .trim()
      .toUpperCase();
}

function readState() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;

   const items = Array.isArray(parsed?.items) ? parsed.items : [];
   const normalized = items
      .map((r) => {
         const type = String(r?.type || '').toUpperCase();
         if (type !== 'ISSUE' && type !== 'USE') return null;

         const code = normalizeCode(r?.code);
         const ownerKey = String(r?.ownerKey || '').trim();
         const at = Number(r?.at || 0) || 0;

         if (!code || !ownerKey || !at) return null;

         return {
            id: String(r?.id || uid()),
            type,
            code,
            ownerKey,
            at,
            meta: r?.meta && typeof r.meta === 'object' ? r.meta : null,
         };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.at) - Number(a.at))
      .slice(0, MAX_ITEMS);

   return {
      items: normalized,
      updatedAt: Number(parsed?.updatedAt || nowMs()),
   };
}

function writeState(next) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

let state = readState();
const listeners = new Set();

function notify() {
   state = { ...state, updatedAt: nowMs() };
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

export const adminCouponLedgerStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   list({ type = 'ALL', code = '', ownerKey = '', from = 0, to = 0 } = {}) {
      const t = String(type || 'ALL').toUpperCase();
      const c = normalizeCode(code);
      const o = String(ownerKey || '').trim();
      const f = Number(from || 0) || 0;
      const tt = Number(to || 0) || 0;

      return state.items.filter((r) => {
         if (t !== 'ALL' && r.type !== t) return false;
         if (c && r.code !== c) return false;
         if (o && r.ownerKey !== o) return false;
         if (f && r.at < f) return false;
         if (tt && r.at > tt) return false;
         return true;
      });
   },

   addIssue({ code, ownerKey, meta = null }) {
      const row = {
         id: uid('issue'),
         type: 'ISSUE',
         code: normalizeCode(code),
         ownerKey: String(ownerKey || '').trim(),
         at: nowMs(),
         meta: meta && typeof meta === 'object' ? meta : null,
      };
      if (!row.code || !row.ownerKey) return { ok: false, message: 'invalid' };

      state = { ...state, items: [row, ...state.items].slice(0, MAX_ITEMS) };
      notify();
      return { ok: true, id: row.id };
   },

   addUse({ code, ownerKey, meta = null }) {
      const row = {
         id: uid('use'),
         type: 'USE',
         code: normalizeCode(code),
         ownerKey: String(ownerKey || '').trim(),
         at: nowMs(),
         meta: meta && typeof meta === 'object' ? meta : null,
      };
      if (!row.code || !row.ownerKey) return { ok: false, message: 'invalid' };

      state = { ...state, items: [row, ...state.items].slice(0, MAX_ITEMS) };
      notify();
      return { ok: true, id: row.id };
   },

   clear() {
      state = { items: [], updatedAt: nowMs() };
      localStorage.removeItem(STORAGE_KEY);
      notify();
   },
};
