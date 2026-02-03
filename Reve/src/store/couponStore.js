/**
 * =============================================
 * 📍 위치: src/store/couponStore.js
 * 역할: 쿠폰 전역 상태 + localStorage 영속화 (유저별 분리)
 *
 * ✅ 핵심
 * - storage key: reve_coupons_v1:<ownerKey>
 * - ownerKey: userId 또는 'guest'
 * - auth 변경 시 couponStore.setOwner(userId) 호출하면 자동 스위칭
 *
 * ✅ 마이그레이션
 * - 레거시 글로벌 키(eclat_coupons_v2/v1)가 있으면
 *   현재 ownerKey로 1회 옮기고 레거시 키 삭제
 * =============================================
 */

const STORAGE_PREFIX = 'reve_coupons_v1:'; // ✅ 유저별 키 prefix
const LEGACY_KEY_V2 = 'eclat_coupons_v2'; // ✅ 기존 글로벌 키(레거시)
const LEGACY_KEY_V1 = 'eclat_coupons_v1';

let ownerKey = 'guest';

/**
 * ✅ 쿠폰 카탈로그(서버 대체)
 * - 운영 정책은 여기만 바꾸면 됨
 */
const COUPON_CATALOG = {
   HELLOWORLD: {
      code: 'HELLOWORLD',
      title: '첫 구매 환영 10%',
      rate: 0.1,
      description: '기본 세일 + 추가 10% 쿠폰 할인',
   },

   // ✅ 승급 축하 쿠폰
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

/**
 * @typedef {Object} OwnedCoupon
 * @property {string} code
 * @property {string} title
 * @property {number} rate
 * @property {boolean} used
 * @property {number} createdAt
 * @property {number} usedAt
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
 * - 유저별 분리 전 프로젝트에서 이미 저장된 쿠폰이 있다면 살려서 옮김
 * - 옮긴 후 레거시 키 삭제(중복 노출/재오염 방지)
 */
function migrateLegacyIntoOwner(okey) {
   if (!hasStorage()) return false;

   const legacyV2 = safeParse(readRaw(LEGACY_KEY_V2) || '');
   const legacyV1 = safeParse(readRaw(LEGACY_KEY_V1) || '');

   const legacy = legacyV2 || legacyV1;
   if (!legacy) return false;

   const normalizedLegacy = normalizeState(legacy);

   // ✅ 현재 owner 저장이 비어있을 때만 옮기는 게 안전
   const current = readStateByOwner(okey);
   const hasAny =
      (current.owned?.length || 0) > 0 || Boolean(current.appliedCode);

   if (!hasAny) {
      writeStateByOwner(okey, normalizedLegacy);
   }

   // ✅ 레거시 삭제: 이제부터는 유저별 key만 신뢰
   removeRaw(LEGACY_KEY_V2);
   removeRaw(LEGACY_KEY_V1);

   return true;
}

/* ==============================
   3) Store Core
   ============================== */

let state = (() => {
   // ✅ 최초는 guest로 읽기
   const s = readStateByOwner(ownerKey);

   // ✅ 레거시가 있으면 guest로 한번 옮겨줌(초기 진입 보호)
   // (로그인 되면 setOwner에서 다시 해당 유저로 읽음)
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

function getCatalog(code) {
   const c = normalizeCode(code);
   return COUPON_CATALOG[c] || null;
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

export const couponStore = {
   /* ------------------------------
      owner switching (핵심)
   ------------------------------ */

   /**
    * ✅ 로그인/로그아웃 시 호출
    * - userId 없으면 guest로 스위칭
    * - 스위칭 시 해당 owner의 state를 다시 로드 + notify
    */
   setOwner(userId) {
      const nextOwner = normalizeOwnerKey(userId || 'guest');
      if (nextOwner === ownerKey) return;

      ownerKey = nextOwner;

      // ✅ 레거시가 남아 있으면 "현재 로그인 유저"쪽으로도 1회 이동 시도
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

   getCatalog() {
      return COUPON_CATALOG;
   },

   getOwned({ includeUsed = true } = {}) {
      if (includeUsed) return state.owned;
      return state.owned.filter((c) => !c.used);
   },

   /**
    * ✅ 적용된 쿠폰 객체 반환 (없으면 null)
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
      };
   },

   /* ------------------------------
      commands
   ------------------------------ */

   register(codeInput) {
      const code = normalizeCode(codeInput);
      if (!code) return fail('쿠폰 코드를 입력해 주세요.');

      const catalog = getCatalog(code);
      if (!catalog) return fail('유효하지 않은 쿠폰 코드입니다.');

      if (findOwned(code)) return fail('이미 보유 중인 쿠폰입니다.');

      const next = /** @type {OwnedCoupon} */ ({
         code: catalog.code,
         title: String(catalog.title || catalog.code),
         rate: clampRate(catalog.rate),
         used: false,
         createdAt: Date.now(),
         usedAt: 0,
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

   /**
    * ✅ 현재 ownerKey 범위에서만 초기화
    */
   clearAll() {
      state = { owned: [], appliedCode: '' };
      removeRaw(getStorageKey(ownerKey));
      notify();
   },

   /**
    * ✅ 레거시 키 완전 제거(정리용)
    * - 보통은 안 써도 됨(마이그레이션에서 자동 제거함)
    */
   purgeLegacyKeys() {
      removeRaw(LEGACY_KEY_V2);
      removeRaw(LEGACY_KEY_V1);
   },
};
