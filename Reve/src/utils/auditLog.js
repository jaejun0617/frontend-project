/**
 * =============================================
 * 📍 위치: src/utils/auditLog.js
 * 역할: 관리자 감사 로그(Audit Log)
 * - 누가(actor) 무엇을(action) 어떤 대상(target)에 했는지 기록
 * - 운영툴 안정성/추적성 핵심
 * =============================================
 */

const STORAGE_KEY = 'reve_admin_audit_v1';

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function read() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;
   const items = Array.isArray(parsed?.items) ? parsed.items : [];
   return { items };
}

function write(next) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/* ==============================
   1) Public API
============================== */

/**
 * @typedef {Object} AuditEntry
 * @property {string} id
 * @property {number} ts
 * @property {string} actorId
 * @property {string} actorName
 * @property {string} action
 * @property {string} targetType
 * @property {string} targetId
 * @property {any} diff
 */

export const auditLog = {
   /**
    * ✅ 기록 추가
    * @param {Partial<AuditEntry>} entry
    */
   append(entry) {
      const state = read();
      const now = Date.now();

      const next = {
         id: `audit_${now}_${Math.random().toString(16).slice(2)}`,
         ts: now,
         actorId: String(entry?.actorId || 'admin').trim() || 'admin',
         actorName: String(entry?.actorName || 'ADMIN').trim() || 'ADMIN',
         action: String(entry?.action || 'UNKNOWN').trim() || 'UNKNOWN',
         targetType: String(entry?.targetType || 'UNKNOWN').trim() || 'UNKNOWN',
         targetId: String(entry?.targetId || '').trim(),
         diff: entry?.diff ?? null,
      };

      const items = [next, ...state.items].slice(0, 1000); // ✅ 과도한 로컬 저장 방지
      write({ items });

      return { ok: true, id: next.id };
   },

   /**
    * ✅ 최신순 조회
    */
   list({ limit = 100 } = {}) {
      const state = read();
      return state.items.slice(0, Math.max(1, Number(limit) || 100));
   },

   /**
    * ✅ 모두 삭제(정리용)
    */
   clearAll() {
      write({ items: [] });
      return { ok: true };
   },

   /**
    * ✅ raw export (exportImport에서 사용해도 됨)
    */
   exportRaw() {
      return read();
   },

   /**
    * ✅ import (복구)
    */
   importRaw(raw) {
      const items = Array.isArray(raw?.items) ? raw.items : [];
      const cleaned = items
         .map((x) => {
            const ts = Number(x?.ts);
            if (!Number.isFinite(ts)) return null;

            return {
               id: String(x?.id || `audit_${ts}`).trim(),
               ts,
               actorId: String(x?.actorId || 'admin').trim() || 'admin',
               actorName: String(x?.actorName || 'ADMIN').trim() || 'ADMIN',
               action: String(x?.action || 'UNKNOWN').trim() || 'UNKNOWN',
               targetType:
                  String(x?.targetType || 'UNKNOWN').trim() || 'UNKNOWN',
               targetId: String(x?.targetId || '').trim(),
               diff: x?.diff ?? null,
            };
         })
         .filter(Boolean)
         .sort((a, b) => b.ts - a.ts)
         .slice(0, 1000);

      write({ items: cleaned });
      return { ok: true, count: cleaned.length };
   },
};
