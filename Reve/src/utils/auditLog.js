/**
 * =============================================
 * 📍 위치: src/utils/auditLog.js
 * 역할: 관리자 감사 로그(localStorage)
 *
 * ✅ 기능
 * - add(action, message, meta?)
 * - list(): 최신순
 * - clear()
 * - subscribe()
 * =============================================
 */

const STORAGE_KEY = 'reve_admin_audit_v1';
const MAX_ITEMS = 300;

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

function readState() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;
   const items = Array.isArray(parsed?.items) ? parsed.items : [];

   const normalized = items
      .map((r) => {
         const action = normalizeText(r?.action);
         const message = normalizeText(r?.message);
         if (!action || !message) return null;

         return {
            id:
               normalizeText(r?.id) ||
               `audit_${nowMs()}_${Math.random().toString(16).slice(2)}`,
            at: Number(r?.at || nowMs()),
            action,
            message,
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
/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   state = { ...state, updatedAt: nowMs() };
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

export const auditLog = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   list() {
      return state.items;
   },

   add(action, message, meta = null) {
      const a = normalizeText(action);
      const m = normalizeText(message);
      if (!a || !m) return;

      const row = {
         id: `audit_${nowMs()}_${Math.random().toString(16).slice(2)}`,
         at: nowMs(),
         action: a,
         message: m,
         meta: meta && typeof meta === 'object' ? meta : null,
      };

      state = { ...state, items: [row, ...state.items].slice(0, MAX_ITEMS) };
      notify();
   },

   clear() {
      state = { items: [], updatedAt: nowMs() };
      localStorage.removeItem(STORAGE_KEY);
      notify();
   },
};
