/**
 * =============================================
 * 📍 위치: src/store/couponStore.js
 * 역할: 쿠폰 전역 상태 + localStorage 영속화 (유저별 분리)
 *
 * ✅ 이번 패치: 운영(Admin) 쿠폰 카탈로그 연결
 * - AdminCouponStore(localStorage: reve_admin_coupons_v1)의 쿠폰을
 *   일반 유저 register(code)에서 조회 가능하게 "공용 카탈로그"로 합침
 * - 기존 하드코딩 COUPON_CATALOG는 그대로 유지(서버 대체/기본 쿠폰)
 *
 * ✅ 유효성(최소 구현)
 * - active=false 쿠폰은 등록 불가
 * - startsAt/endsAt(선택)이 있으면 기간 밖 등록 불가
 * - minOrderTotal/maxUses는 "등록 단계"에서만 최소한의 정보로 보관
 *   (결제 조건 적용은 추후 고도화에서 pricing/apply 단계로 확장 가능)
 *
 * =============================================
 */

const STORAGE_PREFIX = 'reve_coupons_v1:'; // ✅ 유저별 키 prefix
const LEGACY_KEY_V2 = 'eclat_coupons_v2'; // ✅ 기존 글로벌 키(레거시)
const LEGACY_KEY_V1 = 'eclat_coupons_v1';

let ownerKey = 'guest';

/**
 * ✅ 기본 쿠폰 카탈로그(서버 대체)
 * - 운영 정책은 여기만 바꾸면 됨
 * - admin 쿠폰과 "병합"되어 최종 조회됨
 */
const BASE_COUPON_CATALOG = {
   HELLOWORLD: {
      code: 'HELLOWORLD',
      title: '첫 구매 환영 10%',
      rate: 0.1,
      description: '기본 세일 + 추가 10% 쿠폰 할인',
   },

   UPGRADE_GOLD: {
      code: 'UPGRADE_GOLD',
      title: '골드 승급 축하 7%',
      rate: 0.07,
      description: '골드 승급 기념 추가 7% 할인',
   },
   UPGRADE_ROYAL: {
      code: 'UPGRADE_ROYAL',
      title: '로얄 승급 축하 10%',
      rate: 0.1,
      description: '로얄 승급 기념 추가 10% 할인',
   },
   UPGRADE_VIP: {
      code: 'UPGRADE_VIP',
      title: 'VIP 승급 축하 12%',
      rate: 0.12,
      description: 'VIP 승급 기념 추가 12% 할인',
   },
};

/* ==============================
   0) localStorage Utils
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

function normalizeOwnerKey(v) {
   const k = String(v ?? '').trim();
   return k ? k : 'guest';
}

function getStorageKey(okey = ownerKey) {
   return `${STORAGE_PREFIX}${normalizeOwnerKey(okey)}`;
}

function normalizeCode(code) {
   return String(code ?? '')
      .trim()
      .toUpperCase();
}

function clampRate(n) {
   const r = Number(n || 0);
   if (!Number.isFinite(r)) return 0;
   return Math.max(0, Math.min(1, r));
}

function nowMs() {
   return Date.now();
}

function toMsMaybe(v) {
   const s = String(v ?? '').trim();
   if (!s) return 0;
   const n = Number(s);
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

function toIntMaybe(v) {
   const s = String(v ?? '').trim();
   if (!s) return 0;
   const n = Number(s);
   if (!Number.isFinite(n)) return 0;
   return Math.max(0, Math.floor(n));
}

/* ==============================
   0.5) Admin Catalog Bridge (NEW)
   - adminCouponStore(localStorage)의 items를 읽어
     "공용 카탈로그" 형태로 변환한다.
   ============================== */

const ADMIN_COUPON_STORAGE_KEY = 'reve_admin_coupons_v1';

function normalizeAdminCoupon(raw) {
   if (!raw || typeof raw !== 'object') return null;

   const code = normalizeCode(raw.code);
   const title = String(raw.title ?? '').trim();
   if (!code || !title) return null;

   return {
      code,
      title,
      rate: clampRate(raw.rate),

      active: raw.active === false ? false : true,

      startsAt: toMsMaybe(raw.startsAt),
      endsAt: toMsMaybe(raw.endsAt),

      minOrderTotal: toIntMaybe(raw.minOrderTotal),
      maxUses: toIntMaybe(raw.maxUses),

      description: String(raw.description ?? '').trim(),
      updatedAt: Number(raw.updatedAt || 0) || 0,
      createdAt: Number(raw.createdAt || 0) || 0,
   };
}

function isAdminCouponInPeriod(c, t = nowMs()) {
   const start = Number(c?.startsAt || 0) || 0;
   const end = Number(c?.endsAt || 0) || 0;

   if (start && t < start) return false;
   if (end && t > end) return false;
   return true;
}

/**
 * ✅ 운영 쿠폰을 "공용 카탈로그"로 변환
 * - code 중복 시 updatedAt 최신 우선
 * - active=false 제외
 * - 기간(start/end) 벗어나면 제외
 */
function readAdminCatalogAsMap() {
   if (!hasStorage()) return new Map();

   const parsed = safeParse(readRaw(ADMIN_COUPON_STORAGE_KEY) || '');
   const items = Array.isArray(parsed?.items) ? parsed.items : [];

   const normalized = items.map(normalizeAdminCoupon).filter(Boolean);

   const map = new Map();
   normalized.forEach((c) => {
      if (!c.active) return;
      if (!isAdminCouponInPeriod(c)) return;

      const prev = map.get(c.code);
      if (!prev) map.set(c.code, c);
      else {
         const pt = Number(prev.updatedAt || 0) || 0;
         const ct = Number(c.updatedAt || 0) || 0;
         map.set(c.code, ct >= pt ? c : prev);
      }
   });

   return map;
}

/**
 * ✅ 최종 카탈로그 조회
 * - admin 쿠폰이 BASE 쿠폰을 "덮어씀" (운영이 우선권)
 */
function getMergedCatalogItem(codeInput) {
   const code = normalizeCode(codeInput);

   const adminMap = readAdminCatalogAsMap();
   const admin = adminMap.get(code) || null;
   if (admin) return admin;

   return BASE_COUPON_CATALOG[code] || null;
}

/**
 * 전체 카탈로그를 조회하고 싶은 화면이 있으면 이 함수로
 * (필요 시 admin + base를 합쳐 반환)
 */
function getMergedCatalogAll() {
   const adminMap = readAdminCatalogAsMap();
   const out = { ...BASE_COUPON_CATALOG };

   adminMap.forEach((v, k) => {
      out[k] = v;
   });

   return out;
}

/* ==============================
   Types
   ============================== */

/**
 * @typedef {Object} OwnedCoupon
 * @property {string} code
 * @property {string} title
 * @property {number} rate
 * @property {boolean} used
 * @property {number} createdAt
 * @property {number} usedAt
 * @property {number} minOrderTotal
 * @property {number} maxUses
 * @property {number} startsAt
 * @property {number} endsAt
 * @property {string} description
 */

/**
 * @typedef {Object} CouponState
 * @property {OwnedCoupon[]} owned
 * @property {string} appliedCode
 */

/* ==============================
   1) Normalize
   ============================== */

function normalizeOwnedList(list) {
   if (!Array.isArray(list)) return [];

   const normalized = list
      .map((c) => {
         const code = normalizeCode(c?.code);
         if (!code) return null;

         return {
            code,
            title: String(c?.title || code),
            rate: clampRate(c?.rate),
            used: Boolean(c?.used),
            createdAt: Number(c?.createdAt || Date.now()),
            usedAt: Number(c?.usedAt || 0),

            // ✅ 운영 필드(선택): 기존 데이터가 없어도 안전
            minOrderTotal: toIntMaybe(c?.minOrderTotal),
            maxUses: toIntMaybe(c?.maxUses),
            startsAt: toMsMaybe(c?.startsAt),
            endsAt: toMsMaybe(c?.endsAt),
            description: String(c?.description ?? '').trim(),
         };
      })
      .filter(Boolean);

   // code 중복 제거(최신 createdAt 우선)
   const map = new Map();
   normalized.forEach((c) => {
      const prev = map.get(c.code);
      if (!prev) map.set(c.code, c);
      else map.set(c.code, prev.createdAt >= c.createdAt ? prev : c);
   });

   return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeState(raw) {
   const owned = normalizeOwnedList(raw?.owned);
   const appliedCode = normalizeCode(raw?.appliedCode);

   // appliedCode는 "보유 + 미사용"만 유지
   const appliedOwned = owned.find((c) => c.code === appliedCode);
   const safeApplied = appliedOwned && !appliedOwned.used ? appliedCode : '';

   return /** @type {CouponState} */ ({
      owned,
      appliedCode: safeApplied,
   });
}

/* ==============================
   2) Read/Write (per owner)
   ============================== */

function readStateByOwner(okey) {
   const key = getStorageKey(okey);
   const raw = safeParse(readRaw(key) || '');
   return normalizeState(raw);
}

function writeStateByOwner(okey, nextState) {
   const key = getStorageKey(okey);
   writeRaw(key, JSON.stringify(nextState));
}

/**
 * ✅ 레거시 글로벌 키 -> 현재 ownerKey로 1회 마이그레이션
 */
function migrateLegacyIntoOwner(okey) {
   if (!hasStorage()) return false;

   const legacyV2 = safeParse(readRaw(LEGACY_KEY_V2) || '');
   const legacyV1 = safeParse(readRaw(LEGACY_KEY_V1) || '');

   const legacy = legacyV2 || legacyV1;
   if (!legacy) return false;

   const normalizedLegacy = normalizeState(legacy);

   const current = readStateByOwner(okey);
   const hasAny =
      (current.owned?.length || 0) > 0 || Boolean(current.appliedCode);

   if (!hasAny) {
      writeStateByOwner(okey, normalizedLegacy);
   }

   removeRaw(LEGACY_KEY_V2);
   removeRaw(LEGACY_KEY_V1);

   return true;
}

/* ==============================
   3) Store Core
   ============================== */

let state = (() => {
   const s = readStateByOwner(ownerKey);

   const hasAny = (s.owned?.length || 0) > 0 || Boolean(s.appliedCode);
   if (!hasAny) migrateLegacyIntoOwner(ownerKey);

   return readStateByOwner(ownerKey);
})();

/** @type {Set<(state: CouponState) => void>} */
const listeners = new Set();

function notify() {
   state = normalizeState(state);
   writeStateByOwner(ownerKey, state);
   listeners.forEach((fn) => fn(state));
}

function findOwned(code) {
   const c = normalizeCode(code);
   return state.owned.find((x) => x.code === c) || null;
}

function ok(message) {
   return { ok: true, message };
}

function fail(message) {
   return { ok: false, message };
}

/* ==============================
   4) Public API
   ============================== */

export const couponStore = {
   /* ------------------------------
      owner switching
   ------------------------------ */

   setOwner(userId) {
      const nextOwner = normalizeOwnerKey(userId || 'guest');
      if (nextOwner === ownerKey) return;

      ownerKey = nextOwner;

      migrateLegacyIntoOwner(ownerKey);

      state = readStateByOwner(ownerKey);
      listeners.forEach((fn) => fn(state));
   },

   getOwner() {
      return ownerKey;
   },

   /* ------------------------------
      subscribe / getters
   ------------------------------ */

   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   /**
    * ✅ (변경) 최종 병합된 카탈로그 반환
    * - admin + base 합친 결과
    */
   getCatalog() {
      return getMergedCatalogAll();
   },

   getOwned({ includeUsed = true } = {}) {
      if (includeUsed) return state.owned;
      return state.owned.filter((c) => !c.used);
   },

   /**
    * ✅ 적용된 쿠폰 객체 반환 (없으면 null)
    * - 운영 필드도 함께 내려준다(결제 조건/표시 고도화용)
    */
   getAppliedCoupon() {
      const code = normalizeCode(state.appliedCode);
      if (!code) return null;

      const owned = findOwned(code);
      if (!owned || owned.used) return null;

      return {
         code: owned.code,
         title: owned.title,
         rate: owned.rate,
         minOrderTotal: owned.minOrderTotal,
         maxUses: owned.maxUses,
         startsAt: owned.startsAt,
         endsAt: owned.endsAt,
         description: owned.description,
      };
   },

   /* ------------------------------
      commands
   ------------------------------ */

   /**
    * ✅ (변경) register()가 admin catalog도 조회한다.
    */
   register(codeInput) {
      const code = normalizeCode(codeInput);
      if (!code) return fail('쿠폰 코드를 입력해 주세요.');

      const catalog = getMergedCatalogItem(code);
      if (!catalog) return fail('유효하지 않은 쿠폰 코드입니다.');

      // 운영 쿠폰 필드까지 반영: active/기간은 bridge에서 이미 거름
      if (catalog?.active === false) return fail('비활성 쿠폰입니다.');

      // 보유 중복 방지(최소 구현: 1회 보유)
      if (findOwned(code)) return fail('이미 보유 중인 쿠폰입니다.');

      const next = /** @type {OwnedCoupon} */ ({
         code: String(catalog.code || code),
         title: String(catalog.title || code),
         rate: clampRate(catalog.rate),

         used: false,
         createdAt: Date.now(),
         usedAt: 0,

         minOrderTotal: toIntMaybe(catalog.minOrderTotal),
         maxUses: toIntMaybe(catalog.maxUses),
         startsAt: toMsMaybe(catalog.startsAt),
         endsAt: toMsMaybe(catalog.endsAt),
         description: String(catalog.description ?? '').trim(),
      });

      state = { ...state, owned: [next, ...state.owned] };
      notify();

      return ok(`쿠폰 등록 완료: ${next.code}`);
   },

   apply(codeInput) {
      const code = normalizeCode(codeInput);
      if (!code) return fail('적용할 쿠폰을 선택해 주세요.');

      const owned = findOwned(code);
      if (!owned) return fail('보유 중인 쿠폰이 아닙니다.');
      if (owned.used) return fail('이미 사용된 쿠폰입니다.');

      state = { ...state, appliedCode: code };
      notify();

      return ok(`쿠폰 적용: ${code}`);
   },

   clearApplied() {
      if (!state.appliedCode) return;
      state = { ...state, appliedCode: '' };
      notify();
   },

   markUsed(codeInput) {
      const code = normalizeCode(codeInput);
      if (!code) return;

      const owned = findOwned(code);
      if (!owned) return;

      state = {
         ...state,
         owned: state.owned.map((c) =>
            c.code === code ? { ...c, used: true, usedAt: Date.now() } : c,
         ),
         appliedCode: state.appliedCode === code ? '' : state.appliedCode,
      };
      notify();
   },

   removeOwned(codeInput) {
      const code = normalizeCode(codeInput);
      if (!code) return;

      state = {
         ...state,
         owned: state.owned.filter((c) => c.code !== code),
         appliedCode: state.appliedCode === code ? '' : state.appliedCode,
      };
      notify();
   },

   clearAll() {
      state = { owned: [], appliedCode: '' };
      removeRaw(getStorageKey(ownerKey));
      notify();
   },

   purgeLegacyKeys() {
      removeRaw(LEGACY_KEY_V2);
      removeRaw(LEGACY_KEY_V1);
   },
};
