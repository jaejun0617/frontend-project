/**
 * =============================================
 * 📍 위치: src/api/products.js
 * 역할: 상품 데이터 레이어 (LocalStorage 기반 단일 소스)
 *
 * ✅ 정책(이번 개편)
 * - "초기 원본"은 무조건 src/data/products.json
 * - localStorage는 운영 DB(수정/삭제/추가 반영)
 * - products.json version이 바뀌면 localStorage를 자동으로 JSON으로 덮어쓰기(마이그레이션)
 * - fetch 금지, import 기반으로만 seed 로드 (빌드/번들 안정)
 * =============================================
 */

/* ==============================
   0) Storage Keys
============================== */
const STORAGE_KEY = 'reve_products_v1';
const STORAGE_META_KEY = 'reve_products_meta_v1'; // ✅ seed version 추적용

/* ==============================
   1) Utilities: storage
============================== */
function hasStorage() {
   try {
      return typeof window !== 'undefined' && !!window.localStorage;
   } catch {
      return false;
   }
}

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readRaw(key) {
   if (!hasStorage()) return null;
   return window.localStorage.getItem(key);
}

function writeRaw(key, value) {
   if (!hasStorage()) return;
   window.localStorage.setItem(key, value);
}

function removeRaw(key) {
   if (!hasStorage()) return;
   window.localStorage.removeItem(key);
}

function sleep(ms) {
   return new Promise((r) => setTimeout(r, ms));
}

function now() {
   return Date.now();
}

/* ==============================
   2) JSON seed loader (import 방식)
   - fetch 금지
============================== */
async function readProductsJson() {
   try {
      // ✅ Vite/Webpack에서 json import는 default에 들어오는 경우가 많음
      const mod = await import('../data/products.json');
      return mod?.default ?? mod ?? null;
   } catch {
      return null;
   }
}

/**
 * products.json 허용 형태:
 * 1) { version, items: [...] }
 * 2) [...]
 */
function normalizeJsonSeed(json) {
   const items = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : [];

   const version = String(json?.version ?? '0').trim() || '0';

   const normalizedItems = items
      .map((raw) => {
         const id = String(raw?.id ?? '').trim();
         if (!id) return null;

         // products.json 스키마
         const category = String(
            raw?.category ?? raw?.majorCategory ?? raw?.categoryKey ?? '',
         ).trim();

         const categoryMain = String(
            raw?.categoryMain ?? raw?.majorCategoryLabel ?? '',
         ).trim();

         const categorySub = String(
            raw?.categorySub ?? raw?.subCategory ?? '',
         ).trim();

         const image = String(raw?.image ?? raw?.imageUrl ?? '').trim();

         const tags = Array.isArray(raw?.tags)
            ? raw.tags
            : [categoryMain || category, categorySub].filter(Boolean);

         const price = Number(raw?.price ?? 0);
         const basePrice = Number(raw?.basePrice ?? raw?.price ?? 0);

         return {
            ...raw,
            id,
            name: String(raw?.name ?? '').trim(),
            brand: String(raw?.brand ?? '').trim(),

            // ✅ storefront 필터 키는 category(= majorCategory)로 고정
            category:
               category ||
               String(raw?.majorCategory ?? '').trim() ||
               categoryMain,

            // ✅ admin 표시용 라벨/중분류
            categoryMain: categoryMain || category || '-',
            categorySub,

            image,
            tags,

            colors: Array.isArray(raw?.colors) ? raw.colors : [],
            apparelSizes: Array.isArray(raw?.apparelSizes)
               ? raw.apparelSizes
               : [],
            shoeSizes: Array.isArray(raw?.shoeSizes) ? raw.shoeSizes : [],

            price: Number.isFinite(price) ? price : 0,
            basePrice: Number.isFinite(basePrice) ? basePrice : 0,
            discountRate: Number(raw?.discountRate ?? 0),
            couponEligible: Boolean(raw?.couponEligible ?? true),
            couponRateCap: Number(raw?.couponRateCap ?? 0),
            couponTags: Array.isArray(raw?.couponTags) ? raw.couponTags : [],

            createdAt: Number(raw?.createdAt || now()),
            updatedAt: Number(raw?.updatedAt || now()),
         };
      })
      .filter(Boolean);

   return { version, items: normalizedItems };
}

/* ==============================
   3) DB normalize
============================== */
function normalizeProduct(p) {
   const id = String(p?.id ?? '').trim();
   if (!id) return null;

   const price = Number(p?.price ?? 0);
   const basePrice = Number(p?.basePrice ?? price);

   return {
      ...p,
      id,
      name: String(p?.name ?? '').trim(),
      brand: String(p?.brand ?? '').trim(),

      category: String(p?.category ?? '').trim(),
      categoryMain: String(p?.categoryMain ?? '').trim(),
      categorySub: String(p?.categorySub ?? '').trim(),

      price: Number.isFinite(price) ? price : 0,
      basePrice: Number.isFinite(basePrice) ? basePrice : 0,

      discountRate: Number(p?.discountRate ?? 0),
      couponEligible: Boolean(p?.couponEligible ?? true),
      couponRateCap: Number(p?.couponRateCap ?? 0),
      couponTags: Array.isArray(p?.couponTags) ? p.couponTags : [],

      tags: Array.isArray(p?.tags) ? p.tags : [],
      colors: Array.isArray(p?.colors) ? p.colors : [],
      apparelSizes: Array.isArray(p?.apparelSizes) ? p.apparelSizes : [],
      shoeSizes: Array.isArray(p?.shoeSizes) ? p.shoeSizes : [],

      image: String(p?.image ?? '').trim(),
      createdAt: Number(p?.createdAt || now()),
      updatedAt: Number(p?.updatedAt || now()),
   };
}

function readDb() {
   const raw = safeParse(readRaw(STORAGE_KEY) || '');
   if (!raw || !Array.isArray(raw)) return [];
   return raw.map(normalizeProduct).filter(Boolean);
}

function writeDb(list) {
   writeRaw(STORAGE_KEY, JSON.stringify(list));
}

function readMeta() {
   const raw = safeParse(readRaw(STORAGE_META_KEY) || '');
   if (!raw) return null;
   return {
      version: String(raw?.version ?? '0'),
      seededAt: Number(raw?.seededAt ?? 0),
   };
}

function writeMeta(version) {
   writeRaw(
      STORAGE_META_KEY,
      JSON.stringify({ version: String(version || '0'), seededAt: now() }),
   );
}

/* ==============================
   4) Seed / Migration
============================== */
async function seedFromJsonOrThrow() {
   const json = await readProductsJson();
   const norm = normalizeJsonSeed(json);

   const items = (norm?.items || []).map(normalizeProduct).filter(Boolean);
   if (!items.length) {
      throw new Error(
         'products.json seed가 비어있거나 형식이 올바르지 않습니다.',
      );
   }

   writeDb(items);
   writeMeta(norm.version);
   return items;
}

async function ensureSeeded() {
   const existing = readDb();

   // ✅ JSON 버전 확인
   const json = await readProductsJson();
   const norm = normalizeJsonSeed(json);
   const nextVersion = String(norm?.version ?? '0');

   const meta = readMeta();
   const curVersion = String(meta?.version ?? '0');

   // ✅ 1) DB가 비어있으면 무조건 seed
   if (!existing.length) {
      return await seedFromJsonOrThrow();
   }

   // ✅ 2) 버전이 다르면 JSON으로 강제 덮어쓰기
   if (nextVersion && nextVersion !== curVersion) {
      return await seedFromJsonOrThrow();
   }

   return existing;
}

/* ==============================
   5) Public API (storefront)
============================== */
export async function getProducts() {
   await sleep(80);
   return await ensureSeeded();
}

export async function getProductById(productId) {
   const id = String(productId || '').trim();
   if (!id) return null;

   await sleep(50);
   const list = await ensureSeeded();
   return list.find((p) => p.id === id) ?? null;
}

/* ==============================
   6) Admin API (CRUD)
   - Admin에서 "products.json으로 덮어쓰기"를 확실하게 제공
============================== */
export async function adminSeedProducts() {
   await sleep(50);
   try {
      const seeded = await seedFromJsonOrThrow();
      return { ok: true, count: seeded.length, source: 'json' };
   } catch (e) {
      return { ok: false, message: e?.message || 'seed 실패' };
   }
}

export async function adminCreateProduct(draft) {
   await sleep(50);
   const list = await ensureSeeded();

   const id = String(draft?.id || `p-${Date.now()}`).trim();
   const next = normalizeProduct({
      ...draft,
      id,
      createdAt: now(),
      updatedAt: now(),
   });

   if (!next) return { ok: false, message: '상품 데이터가 올바르지 않습니다.' };
   if (list.some((p) => p.id === next.id)) {
      return { ok: false, message: '이미 존재하는 상품 ID입니다.' };
   }

   const out = [next, ...list];
   writeDb(out);
   return { ok: true, item: next };
}

export async function adminUpdateProduct(productId, patch) {
   await sleep(50);
   const id = String(productId || '').trim();
   if (!id) return { ok: false, message: '상품 ID가 필요합니다.' };

   const list = await ensureSeeded();
   const idx = list.findIndex((p) => p.id === id);
   if (idx < 0) return { ok: false, message: '상품을 찾을 수 없습니다.' };

   const merged = normalizeProduct({
      ...list[idx],
      ...patch,
      id,
      updatedAt: now(),
   });

   if (!merged)
      return { ok: false, message: '상품 데이터가 올바르지 않습니다.' };

   const out = [...list];
   out[idx] = merged;
   writeDb(out);

   return { ok: true, item: merged };
}

export async function adminDeleteProduct(productId) {
   await sleep(50);
   const id = String(productId || '').trim();
   if (!id) return { ok: false, message: '상품 ID가 필요합니다.' };

   const list = await ensureSeeded();
   const exists = list.some((p) => p.id === id);
   if (!exists) return { ok: false, message: '상품을 찾을 수 없습니다.' };

   const out = list.filter((p) => p.id !== id);
   writeDb(out);

   return { ok: true };
}

export async function adminResetProducts() {
   await sleep(50);
   // ✅ 완전 초기화 후 JSON으로 다시 seed
   removeRaw(STORAGE_KEY);
   removeRaw(STORAGE_META_KEY);
   try {
      await seedFromJsonOrThrow();
      return { ok: true };
   } catch (e) {
      return { ok: false, message: e?.message || 'reset 실패' };
   }
}
