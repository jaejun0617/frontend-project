/**
 * =============================================
 * 📍 위치: src/store/adminProductStore.js
 * 역할: Admin Product Store (Single Source of Truth)
 * - 데이터 소스: src/api/products.js (LocalStorage 기반)
 * - Admin UI에 맞게 normalize/repair 제공
 *
 * ✅ 이번 패치 포인트
 * 1) createdAt/updatedAt 보장: create는 createdAt+updatedAt, update는 updatedAt만 갱신
 * 2) 최신순 정렬 안정화: load 단계에서 createdAt/updatedAt desc 정렬
 * 3) 이미지 업로드 "어댑터 슬롯" 제공:
 *    - 지금: AdminPage에서 DataURL을 image에 넣으면 그대로 저장
 *    - 나중: Firebase 연결 시, imageUploader를 주입해서 File->URL 업로드로 교체 가능
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

/**
 * ✅ 업로드 어댑터 (나중에 Firebase로 갈 때 교체)
 * @type {null | ((file: File) => Promise<string>)}
 */
let imageUploader = null;

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

function sortLatestFirst(list) {
   const arr = Array.isArray(list) ? [...list] : [];
   return arr.sort((a, b) => {
      const at = Number(a?.createdAt || 0) || 0;
      const bt = Number(b?.createdAt || 0) || 0;
      if (bt !== at) return bt - at;

      const au = Number(a?.updatedAt || 0) || 0;
      const bu = Number(b?.updatedAt || 0) || 0;
      return bu - au;
   });
}

function normalizeItem(raw) {
   const id = normalizeText(raw?.id);
   if (!id) return null;

   const name = normalizeText(raw?.name);
   const price = toNum(raw?.price, 0);
   const basePrice = toNum(raw?.basePrice, price);

   // ✅ Product 시스템용 category(key) + Admin UI용 categoryMain/Sub(라벨)
   const category = normalizeText(
      raw?.category || raw?.majorCategory || raw?.categoryKey || '',
   );

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

   const createdAt = toNum(raw?.createdAt, Date.now());
   const updatedAt = toNum(raw?.updatedAt, createdAt);

   const image = normalizeText(raw?.image || raw?.imageUrl || '');

   return {
      ...raw,
      id,
      name,
      price,
      basePrice,
      category: category || categoryMain, // ✅ 최소 1개는 채움
      categoryMain,
      categorySub,
      apparelSizes: uniq(apparelSizes),
      shoeSizes: uniq(shoeSizes),
      active,
      image,
      createdAt,
      updatedAt,
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
   const normalized = (Array.isArray(list) ? list : [])
      .map(normalizeItem)
      .filter(Boolean);

   cache = sortLatestFirst(normalized);
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

/**
 * ✅ 나중에 Firebase 연결 시 여기만 교체하면 됨
 * 예:
 * adminProductStore.setImageUploader(async (file) => {
 *   const url = await uploadToFirebase(file)
 *   return url
 * })
 */
function setImageUploader(uploader) {
   imageUploader = typeof uploader === 'function' ? uploader : null;
}

/* ==============================
   public store
============================== */
export const adminProductStore = {
   setImageUploader,

   subscribe(fn) {
      listeners.add(fn);
      ensureBoot().then(() => fn(cache));
      return () => listeners.delete(fn);
   },

   getProducts() {
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

   seed(count = 100) {
      // api/products.js의 adminSeedProducts는 "덮어쓰기 seed" 성격(현재 설계 기준)
      return (async () => {
         await ensureBoot();
         const r = await adminSeedProducts(count);
         await load();
         return { ok: true, count: r?.count ?? cache.length, mode: 'reset' };
      })();
   },

   create(draft) {
      return (async () => {
         await ensureBoot();

         // ✅ (선택) File 업로드 지원: draft.imageFile 이 File이면 업로더가 있을 때 URL로 변환
         let image = normalizeText(draft?.image || '');
         const imageFile = draft?.imageFile;

         if (imageFile instanceof File) {
            if (!imageUploader) {
               return {
                  ok: false,
                  message:
                     '이미지 업로더가 설정되지 않았습니다. (현재는 DataURL/URL만 지원)',
               };
            }
            try {
               image = normalizeText(await imageUploader(imageFile));
            } catch {
               return { ok: false, message: '이미지 업로드에 실패했습니다.' };
            }
         }

         const now = Date.now();

         const payload = {
            ...draft,
            image,
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

            // Product 시스템 필터 키 (대분류 라벨을 일단 키로 사용)
            category: normalizeText(
               draft?.category || draft?.categoryMain || '',
            ),

            // ✅ 타임스탬프 보장
            createdAt: toNum(draft?.createdAt, now),
            updatedAt: now,
         };

         // 불필요한 필드 제거(혹시 남아있다면)
         delete payload.imageFile;

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

         // ✅ File 업로드 지원(선택): patch.imageFile 이 File이면 업로더 사용
         let image =
            patch?.image != null ? normalizeText(patch.image) : undefined;

         const imageFile = patch?.imageFile;
         if (imageFile instanceof File) {
            if (!imageUploader) {
               return {
                  ok: false,
                  message:
                     '이미지 업로더가 설정되지 않았습니다. (현재는 DataURL/URL만 지원)',
               };
            }
            try {
               image = normalizeText(await imageUploader(imageFile));
            } catch {
               return { ok: false, message: '이미지 업로드에 실패했습니다.' };
            }
         }

         const payload = {
            ...patch,

            image,

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

            // ✅ update에서는 createdAt 건드리지 않음
            updatedAt: Date.now(),
         };

         delete payload.imageFile;

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
