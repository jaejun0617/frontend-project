/**
 * =============================================
 * 📍 위치: src/utils/exportImport.js
 * 역할: 로컬스토리지 백업/복구 (Export/Import)
 * - Admin에서 운영 데이터를 JSON으로 백업하고 복원
 * - MVP에서 데이터 손실 방지 필수
 * =============================================
 */

const APP_EXPORT_VERSION = 1;

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

/* ==============================
   1) Collect keys
============================== */

/**
 * ✅ 프로젝트에서 쓰는 주요 키 패턴들을 모아서 백업 대상에 포함한다.
 * - prefix 기반으로 훑는다.
 */
const PREFIXES = [
   'reve_auth_v1',
   'reve_cart_v1', // legacy 단일키
   'reve_cart_v1:', // owner 분리
   'reve_coupons_v1:',
   'reve_orders_v1:',
   'reve_addresses_v1:',
   'reve_recent_searches_v1',
   'reve_admin_products_v1',
   'reve_admin_coupons_v1',
   'reve_admin_audit_v1',
];

function isTargetKey(k) {
   return PREFIXES.some((p) => k === p || k.startsWith(p));
}

/* ==============================
   2) Export
============================== */

export function exportAppData() {
   const out = {};
   for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!isTargetKey(k)) continue;
      out[k] = localStorage.getItem(k);
   }

   return {
      meta: {
         exportVersion: APP_EXPORT_VERSION,
         exportedAt: new Date().toISOString(),
      },
      storage: out,
   };
}

/**
 * ✅ 브라우저에서 파일 다운로드까지
 */
export function downloadExportJson({ filename = 'reve-backup.json' } = {}) {
   const payload = exportAppData();
   const json = JSON.stringify(payload, null, 2);

   const blob = new Blob([json], { type: 'application/json' });
   const url = URL.createObjectURL(blob);

   const a = document.createElement('a');
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   a.remove();

   setTimeout(() => URL.revokeObjectURL(url), 0);

   return { ok: true };
}

/* ==============================
   3) Import
============================== */

export function importAppData(payload, { replace = false } = {}) {
   const parsed =
      typeof payload === 'string' ? safeParse(payload) : payload || null;

   if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: '백업 파일 형식이 올바르지 않습니다.' };
   }

   const storage =
      parsed.storage && typeof parsed.storage === 'object'
         ? parsed.storage
         : null;

   if (!storage) {
      return { ok: false, message: '백업 데이터(storage)가 없습니다.' };
   }

   const keys = Object.keys(storage);

   // ✅ replace=true면 기존 백업 대상 키들을 먼저 지움(완전 복원)
   if (replace) {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
         const k = localStorage.key(i);
         if (!k) continue;
         if (isTargetKey(k)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
   }

   // ✅ 복원
   let applied = 0;
   keys.forEach((k) => {
      if (!isTargetKey(k)) return; // 안전장치
      const v = storage[k];
      if (typeof v !== 'string') return;
      localStorage.setItem(k, v);
      applied += 1;
   });

   return { ok: true, applied };
}
