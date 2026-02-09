/**
 * =============================================
 * 📍 위치: src/store/adminProductStore.js
 * 역할: 관리자용 상품 카탈로그 저장소(localStorage)
 *
 * ✅ 기능
 * - 상품 CRUD + 정규화/복구
 * - 카테고리(대/중분류) 집계
 * - 더미 seed
 *
 * ✅ 주의
 * - storefront가 이 카탈로그를 실제로 쓰려면
 *   products API 레이어를 이 store 기반으로 교체하는 작업이 필요
 * =============================================
 */

const STORAGE_KEY = 'reve_admin_products_v1';

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

function normalizeMoney(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return 0;
   return Math.max(0, Math.floor(v));
}

function normalizeText(v) {
   return String(v ?? '').trim();
}

function normalizeId(v) {
   return normalizeText(v).replace(/\s+/g, '_');
}

function splitCsv(v) {
   const raw = normalizeText(v);
   if (!raw) return [];
   return raw
      .split(',')
      .map((x) => normalizeText(x))
      .filter(Boolean);
}

function normalizeProduct(raw) {
   if (!raw || typeof raw !== 'object') return null;

   const id = normalizeId(raw.id);
   const name = normalizeText(raw.name);

   if (!id || !name) return null;

   const price = normalizeMoney(raw.price);
   const basePrice =
      raw.basePrice !== '' &&
      raw.basePrice !== null &&
      raw.basePrice !== undefined
         ? normalizeMoney(raw.basePrice)
         : 0;

   const categoryMain = normalizeText(raw.categoryMain);
   const categorySub = normalizeText(raw.categorySub);

   const apparelSizes = Array.isArray(raw.apparelSizes)
      ? raw.apparelSizes.map((x) => normalizeText(x)).filter(Boolean)
      : splitCsv(raw.apparelSizes);

   const shoeSizes = Array.isArray(raw.shoeSizes)
      ? raw.shoeSizes.map((x) => normalizeText(x)).filter(Boolean)
      : splitCsv(raw.shoeSizes);

   return {
      id,
      name,
      desc: normalizeText(raw.desc || raw.description || ''),
      categoryMain,
      categorySub,

      price,
      basePrice: basePrice > 0 ? basePrice : 0,

      active: raw.active === false ? false : true,
      couponEligible: raw.couponEligible === false ? false : true,

      apparelSizes,
      shoeSizes,

      createdAt: Number(raw.createdAt || nowMs()),
      updatedAt: Number(raw.updatedAt || nowMs()),
   };
}

function normalizeState(parsed) {
   const items = Array.isArray(parsed?.items) ? parsed.items : [];
   const normalized = items.map(normalizeProduct).filter(Boolean);

   // id 중복 제거(최신 updatedAt 우선)
   const map = new Map();
   normalized.forEach((p) => {
      const prev = map.get(p.id);
      if (!prev) map.set(p.id, p);
      else map.set(p.id, prev.updatedAt >= p.updatedAt ? prev : p);
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

function exists(id) {
   const key = normalizeId(id);
   return state.items.some((p) => p.id === key);
}

function ok(extra = {}) {
   return { ok: true, ...extra };
}

function fail(message) {
   return { ok: false, message };
}

export const adminProductStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getProducts() {
      return state.items;
   },

   getProduct(id) {
      const key = normalizeId(id);
      return state.items.find((p) => p.id === key) || null;
   },

   getCategories() {
      const mainSet = new Set();
      const subSet = new Set();
      const subByMain = {};

      state.items.forEach((p) => {
         const m = normalizeText(p.categoryMain);
         const s = normalizeText(p.categorySub);

         if (m) mainSet.add(m);
         if (s) subSet.add(s);

         if (m && s) {
            if (!subByMain[m]) subByMain[m] = new Set();
            subByMain[m].add(s);
         }
      });

      const main = Array.from(mainSet.values()).sort();
      const subAll = Array.from(subSet.values()).sort();

      /** @type {Record<string, string[]>} */
      const outSubByMain = {};
      Object.entries(subByMain).forEach(([k, set]) => {
         outSubByMain[k] = Array.from(set.values()).sort();
      });

      return { main, subAll, subByMain: outSubByMain };
   },

   create(draft) {
      const p = normalizeProduct(draft);
      if (!p) return fail('상품 데이터가 올바르지 않습니다.');

      if (exists(p.id)) return fail('이미 존재하는 상품 ID입니다.');

      const now = nowMs();
      const next = { ...p, createdAt: now, updatedAt: now };

      state = { ...state, items: [next, ...state.items] };
      notify();
      return ok({ id: next.id });
   },

   update(id, patch) {
      const key = normalizeId(id);
      const current = this.getProduct(key);
      if (!current) return fail('상품을 찾을 수 없습니다.');

      // patch가 object가 아니라면 noop
      const basePatch = patch && typeof patch === 'object' ? patch : {};
      const merged = { ...current, ...basePatch, id: current.id };

      const normalized = normalizeProduct(merged);
      if (!normalized) return fail('수정 데이터가 올바르지 않습니다.');

      const next = {
         ...normalized,
         createdAt: current.createdAt,
         updatedAt: nowMs(),
      };

      state = {
         ...state,
         items: state.items.map((p) => (p.id === key ? next : p)),
      };
      notify();
      return ok({ id: key });
   },

   remove(id) {
      const key = normalizeId(id);
      if (!exists(key)) return fail('상품을 찾을 수 없습니다.');

      state = { ...state, items: state.items.filter((p) => p.id !== key) };
      notify();
      return ok({ id: key });
   },

   seed() {
      const samples = [
         {
            id: `prod_${String(Date.now()).slice(-6)}_hoodie`,
            name: 'REVE 후드',
            categoryMain: '의류',
            categorySub: '후드',
            price: 59000,
            basePrice: 79000,
            active: true,
            couponEligible: true,
            apparelSizes: ['S', 'M', 'L', 'XL'],
            shoeSizes: [],
            desc: '부드러운 기모 후드',
         },
         {
            id: `prod_${String(Date.now()).slice(-6)}_runner`,
            name: 'REVE 러너',
            categoryMain: '신발',
            categorySub: '러닝화',
            price: 129000,
            basePrice: 159000,
            active: true,
            couponEligible: false,
            apparelSizes: [],
            shoeSizes: ['230', '240', '250', '260', '270'],
            desc: '가벼운 착화감의 러닝화',
         },
         {
            id: `prod_${String(Date.now()).slice(-6)}_bag`,
            name: 'REVE 데일리 백',
            categoryMain: '잡화',
            categorySub: '가방',
            price: 89000,
            basePrice: 99000,
            active: true,
            couponEligible: true,
            apparelSizes: [],
            shoeSizes: [],
            desc: '데일리로 쓰기 좋은 미니 백',
         },
      ];

      let created = 0;
      samples.forEach((s) => {
         const p = normalizeProduct(s);
         if (!p) return;
         if (exists(p.id)) return;
         state = {
            ...state,
            items: [
               { ...p, createdAt: nowMs(), updatedAt: nowMs() },
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
