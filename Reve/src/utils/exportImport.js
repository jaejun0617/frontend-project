/**
 * =============================================
 * 📍 위치: src/utils/exportImport.js
 * 역할: 관리자 데이터 백업/복구(JSON 번들)
 *
 * Export 포함
 * - admin products
 * - admin coupons
 * - admin audit
 * - orders (reve_orders_v1:<owner> 전체 스캔)
 *
 * Import
 * - 위 데이터들을 덮어쓰기 복원
 * =============================================
 */

const ADMIN_PRODUCTS_KEY = 'reve_admin_products_v1';
const ADMIN_COUPONS_KEY = 'reve_admin_coupons_v1';
const ADMIN_AUDIT_KEY = 'reve_admin_audit_v1';

const ORDER_PREFIX = 'reve_orders_v1:';

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readRaw(key) {
   return localStorage.getItem(key);
}

function writeRaw(key, value) {
   localStorage.setItem(key, value);
}

function scanKeysByPrefix(prefix) {
   const keys = [];
   for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(prefix)) keys.push(k);
   }
   return keys;
}

export function exportAdminBundle() {
   const productsRaw = readRaw(ADMIN_PRODUCTS_KEY);
   const couponsRaw = readRaw(ADMIN_COUPONS_KEY);
   const auditRaw = readRaw(ADMIN_AUDIT_KEY);

   const orderKeys = scanKeysByPrefix(ORDER_PREFIX);
   const orders = orderKeys.map((k) => ({
      key: k,
      value: readRaw(k) || '',
   }));

   return {
      schema: 'reve_admin_bundle_v1',
      exportedAt: Date.now(),

      products: {
         key: ADMIN_PRODUCTS_KEY,
         value: productsRaw || '',
         items: (() => {
            const parsed = productsRaw ? safeParse(productsRaw) : null;
            return Array.isArray(parsed?.items) ? parsed.items : [];
         })(),
      },

      coupons: {
         key: ADMIN_COUPONS_KEY,
         value: couponsRaw || '',
         items: (() => {
            const parsed = couponsRaw ? safeParse(couponsRaw) : null;
            return Array.isArray(parsed?.items) ? parsed.items : [];
         })(),
      },

      audit: {
         key: ADMIN_AUDIT_KEY,
         value: auditRaw || '',
         items: (() => {
            const parsed = auditRaw ? safeParse(auditRaw) : null;
            return Array.isArray(parsed?.items) ? parsed.items : [];
         })(),
      },

      orders: {
         prefix: ORDER_PREFIX,
         total: orders.length,
         items: orders,
      },
   };
}

export function importAdminBundle(bundle) {
   if (!bundle || typeof bundle !== 'object') {
      return { ok: false, message: '번들 형식이 올바르지 않습니다.' };
   }
   if (String(bundle.schema || '') !== 'reve_admin_bundle_v1') {
      return { ok: false, message: '지원하지 않는 번들 스키마입니다.' };
   }

   const restored = {
      products: false,
      coupons: false,
      audit: false,
      orders: 0,
   };

   // products
   if (bundle.products && typeof bundle.products === 'object') {
      const v = String(bundle.products.value || '');
      writeRaw(ADMIN_PRODUCTS_KEY, v);
      restored.products = true;
   }

   // coupons
   if (bundle.coupons && typeof bundle.coupons === 'object') {
      const v = String(bundle.coupons.value || '');
      writeRaw(ADMIN_COUPONS_KEY, v);
      restored.coupons = true;
   }

   // audit
   if (bundle.audit && typeof bundle.audit === 'object') {
      const v = String(bundle.audit.value || '');
      writeRaw(ADMIN_AUDIT_KEY, v);
      restored.audit = true;
   }

   // orders (prefix scan 후, 번들에 포함된 key들을 그대로 write)
   if (bundle.orders && typeof bundle.orders === 'object') {
      const items = Array.isArray(bundle.orders.items)
         ? bundle.orders.items
         : [];
      items.forEach((it) => {
         const key = String(it?.key || '');
         const value = String(it?.value || '');
         if (!key.startsWith(ORDER_PREFIX)) return;
         writeRaw(key, value);
         restored.orders += 1;
      });
   }

   return { ok: true, restored };
}
