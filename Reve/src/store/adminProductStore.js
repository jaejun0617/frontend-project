/**
 * =============================================
 * 📍 위치: src/store/adminProductStore.js
 * 역할: Admin Product Store (Single Source of Truth)
 * - 데이터 소스: src/api/products.js (LocalStorage 기반)
 * - Admin UI에 맞게 normalize/repair 제공
 * =============================================
 */

import {
   getProducts,
   adminSeedProducts,
   adminCreateProduct,
   adminUpdateProduct,
   adminDeleteProduct,
} from '../api/products.js';

/** @type {Set<(items:any[])=>void>} */
const listeners = new Set();

/** @type {any[]} */
let cache = [];

/* ==============================
    utils
 ============================== */
function normalizeText(v) {
   return String(v ?? '').trim();
}

function toBool(v, fallback = true) {
   if (typeof v === 'boolean') return v;
   if (v === 'true') return true;
   if (v === 'false') return false;
   return fallback;
}

function toNum(v, fallback = 0) {
   const n = Number(v);
   return Number.isFinite(n) ? n : fallback;
}

function splitCSV(v) {
   const raw = normalizeText(v);
   if (!raw) return [];
   return raw
      .split(',')
      .map((x) => normalizeText(x))
      .filter(Boolean);
}

function uniq(arr) {
   return Array.from(new Set(arr));
}

function normalizeItem(raw) {
   // ✅ Admin에서 사용하는 필드
   const id = normalizeText(raw?.id);
   if (!id) return null;

   const name = normalizeText(raw?.name);
   const price = toNum(raw?.price, 0);
   const basePrice = toNum(raw?.basePrice, price);

   // ✅ Product 시스템의 category(키) + Admin의 categoryMain/Sub(표시용) 동시 지원
   // - category: product 페이지/검색/필터에서 쓰는 "키"
   // - categoryMain/Sub: Admin 분류 UI용 "라벨"
   // ✅ Product 시스템에서 쓰는 키(category)도 products.json의 majorCategory를 살림
   const category = normalizeText(
      raw?.category || raw?.majorCategory || raw?.categoryKey || '',
   );
   // ✅ products.json 호환: majorCategoryLabel / majorCategory 지원
   // - majorCategoryLabel: '상의' 같은 라벨
   // - majorCategory: 'top' 같은 키
   const categoryMain = normalizeText(
      raw?.categoryMain ||
         raw?.majorCategoryLabel ||
         raw?.mainCategoryLabel ||
         raw?.mainCategory ||
         raw?.categoryMainLabel ||
         raw?.categoryLabel ||
         raw?.majorCategory ||
         raw?.category ||
         raw?.categoryKey ||
         '-',
   );

   const categorySub = normalizeText(
      raw?.categorySub ||
         raw?.subCategory ||
         raw?.subcategory ||
         raw?.categorySubLabel ||
         raw?.sub ||
         '',
   );

   const apparelSizes = Array.isArray(raw?.apparelSizes)
      ? raw.apparelSizes
      : splitCSV(raw?.apparelSizes);

   const shoeSizes = Array.isArray(raw?.shoeSizes)
      ? raw.shoeSizes
      : splitCSV(raw?.shoeSizes)
           .map((n) => Number(n))
           .filter(Number.isFinite);

   const active = toBool(raw?.active, true);

   return {
      ...raw,
      id,
      name,
      price,
      basePrice,
      category: category || categoryMain, // ✅ 최소한 하나는 채움
      categoryMain,
      categorySub,
      apparelSizes: uniq(apparelSizes),
      shoeSizes: uniq(shoeSizes),
      active,
      updatedAt: toNum(raw?.updatedAt, Date.now()),
      createdAt: toNum(raw?.createdAt, Date.now()),
   };
}

function notify() {
   listeners.forEach((fn) => fn(cache));
}

/* ==============================
    core
 ============================== */
async function load() {
   const list = await getProducts();
   cache = (Array.isArray(list) ? list : []).map(normalizeItem).filter(Boolean);
   notify();
   return cache;
}

// ✅ 초기 1회 로드 트리거(어드민 진입 시 곧바로 데이터 준비)
let booted = false;
async function ensureBoot() {
   if (booted) return cache;
   booted = true;
   return load();
}

/* ==============================
    public store
 ============================== */
export const adminProductStore = {
   subscribe(fn) {
      listeners.add(fn);
      // 즉시 1회 push
      ensureBoot().then(() => fn(cache));
      return () => listeners.delete(fn);
   },

   getProducts() {
      // sync getter (이미 로드된 cache 기준)
      return cache;
   },

   getProduct(id) {
      const key = normalizeText(id);
      return cache.find((p) => p.id === key) || null;
   },

   async refresh() {
      await load();
      return { ok: true };
   },

   // ✅ 기존 상품 유지하면서 “추가 seed”가 아니라,
   // 네 UI/문구 정책이 "유지"라면 append 방식도 가능하지만
   // 여기서는 안전하게 "추가" 옵션 제공
   seed(count = 100, { mode = 'append' } = {}) {
      // mode:
      // - 'append' : 기존 유지 + 추가
      // - 'reset'  : 전체 갈아엎고 seed
      // ⚠️ api/products.js에 append API가 없으면 reset으로 간다.
      // 지금은 reset(seed)로 통일(단순/안정)
      return (async () => {
         await ensureBoot();
         const r = await adminSeedProducts(count); // api는 "reset seed" 성격
         await load();
         return { ok: true, count: r?.count ?? cache.length, mode: 'reset' };
      })();
   },

   create(draft) {
      return (async () => {
         await ensureBoot();

         const payload = {
            ...draft,
            // form에서 들어오는 CSV -> 배열로 정규화
            apparelSizes: Array.isArray(draft?.apparelSizes)
               ? draft.apparelSizes
               : splitCSV(draft?.apparelSizes),
            shoeSizes: Array.isArray(draft?.shoeSizes)
               ? draft.shoeSizes
               : splitCSV(draft?.shoeSizes)
                    .map((n) => Number(n))
                    .filter(Number.isFinite),
            active: toBool(draft?.active, true),
            categoryMain: normalizeText(draft?.categoryMain || ''),
            categorySub: normalizeText(draft?.categorySub || ''),
            // Product 시스템 키
            category: normalizeText(
               draft?.category || draft?.categoryMain || '',
            ),
            updatedAt: Date.now(),
         };

         const res = await adminCreateProduct(payload);
         if (!res?.ok) return res;

         await load();
         return { ok: true, item: res.item };
      })();
   },

   update(id, patch) {
      return (async () => {
         await ensureBoot();
         const key = normalizeText(id);
         if (!key) return { ok: false, message: '상품 ID가 필요합니다.' };

         const payload = {
            ...patch,
            apparelSizes:
               patch?.apparelSizes != null
                  ? Array.isArray(patch.apparelSizes)
                     ? patch.apparelSizes
                     : splitCSV(patch.apparelSizes)
                  : undefined,
            shoeSizes:
               patch?.shoeSizes != null
                  ? Array.isArray(patch.shoeSizes)
                     ? patch.shoeSizes
                     : splitCSV(patch.shoeSizes)
                          .map((n) => Number(n))
                          .filter(Number.isFinite)
                  : undefined,
            active:
               patch?.active != null ? toBool(patch.active, true) : undefined,
            categoryMain:
               patch?.categoryMain != null
                  ? normalizeText(patch.categoryMain)
                  : undefined,
            categorySub:
               patch?.categorySub != null
                  ? normalizeText(patch.categorySub)
                  : undefined,
            category:
               patch?.category != null
                  ? normalizeText(patch.category)
                  : patch?.categoryMain != null
                    ? normalizeText(patch.categoryMain)
                    : undefined,
            updatedAt: Date.now(),
         };

         const res = await adminUpdateProduct(key, payload);
         if (!res?.ok) return res;

         await load();
         return { ok: true, item: res.item };
      })();
   },

   remove(id) {
      return (async () => {
         await ensureBoot();
         const key = normalizeText(id);
         if (!key) return { ok: false, message: '상품 ID가 필요합니다.' };

         const res = await adminDeleteProduct(key);
         if (!res?.ok) return res;

         await load();
         return { ok: true };
      })();
   },

   getCategories() {
      // ✅ Admin에서 main/sub 셀렉트 채우기용
      const mainSet = new Set();
      const subSet = new Set();
      const subByMain = {};

      cache.forEach((p) => {
         const m = normalizeText(p.categoryMain || p.category || '');
         const s = normalizeText(p.categorySub || '');

         if (m) mainSet.add(m);
         if (s) subSet.add(s);

         if (m) {
            if (!subByMain[m]) subByMain[m] = [];
            if (s) subByMain[m].push(s);
         }
      });

      const main = Array.from(mainSet).sort((a, b) => a.localeCompare(b, 'ko'));
      const subAll = Array.from(subSet).sort((a, b) =>
         a.localeCompare(b, 'ko'),
      );

      Object.keys(subByMain).forEach((m) => {
         subByMain[m] = uniq(subByMain[m]).sort((a, b) =>
            a.localeCompare(b, 'ko'),
         );
      });

      return { main, subAll, subByMain };
   },
};
