/**
 * =============================================
 * 📍 위치: src/store/couponStore.js
 * 역할: 쿠폰 전역 상태 + localStorage 영속화
 *
 * ✅ 기능
 * - 쿠폰 등록(register): 코드 입력 → 보유 쿠폰 추가
 * - 쿠폰 적용(apply): 보유 쿠폰 중 1개를 cart에 적용
 * - 쿠폰 해제(clearApplied)
 * - 쿠폰 사용 처리(markUsed): 결제 시점에 "사용됨"으로 변경
 * - 새로고침 유지(owned/appliedCode)
 *
 * ✅ 설계 포인트
 * - Catalog(서버 대체)만 바꾸면 운영/DB 연동 가능
 * - state shape 고정: { owned: Coupon[], appliedCode: string }
 * - appliedCode는 항상 "유효한 보유/미사용 쿠폰"만 유지되도록 정리
 * =============================================
 */

const STORAGE_KEY_V2 = 'eclat_coupons_v2';
const STORAGE_KEY_V1 = 'eclat_coupons_v1';

/**
 * ✅ 쿠폰 카탈로그(서버 대체)
 * - 나중에 DB/서버로 바꿔도 store API는 그대로 두면 됨
 */
const COUPON_CATALOG = {
   HELLOWORLD: {
      code: 'HELLOWORLD',
      title: '첫 구매 환영 10%',
      rate: 0.1,
      description: '기본 세일 + 추가 10% 쿠폰 할인',
   },
   VIP: {
      code: 'VIP',
      title: 'VIP 15%',
      rate: 0.15,
      description: '기본 세일 + 추가 15% 쿠폰 할인',
   },
   SEASON: {
      code: 'SEASON',
      title: '시즌 8%',
      rate: 0.08,
      description: '기본 세일 + 추가 8% 쿠폰 할인',
   },
};

/* ==============================
   0) localStorage 유틸
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
   1) 정규화/마이그레이션
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

   // code 기준 중복 제거(최신 createdAt 우선)
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

   // appliedCode가 유효한지 최종 정리(보유/미사용만 유지)
   const appliedOwned = owned.find((c) => c.code === appliedCode);
   const safeApplied = appliedOwned && !appliedOwned.used ? appliedCode : '';

   return /** @type {CouponState} */ ({
      owned,
      appliedCode: safeApplied,
   });
}

/**
 * v2 → v1 순으로 읽고,
 * v1이 있으면 v2로 승격 저장
 */
function readState() {
   const v2 = safeParse(readRaw(STORAGE_KEY_V2) || '');
   if (v2) return normalizeState(v2);

   const v1 = safeParse(readRaw(STORAGE_KEY_V1) || '');
   const normalized = normalizeState(v1);

   // v1 -> v2 승격 저장(한 번만)
   if (v1 && hasStorage()) {
      writeRaw(STORAGE_KEY_V2, JSON.stringify(normalized));
   }

   return normalized;
}

function writeState(nextState) {
   writeRaw(STORAGE_KEY_V2, JSON.stringify(nextState));
}

/* ==============================
   2) Store 상태 + 구독
   ============================== */

let state = readState();

/** @type {Set<(state: CouponState) => void>} */
const listeners = new Set();

function notify() {
   // 저장 + applied 정리(안정성)
   state = normalizeState(state);
   writeState(state);
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

   getOwned() {
      return state.owned;
   },

   /**
    * 적용된 쿠폰 객체 반환 (없으면 null)
    * - used 쿠폰이면 자동 null
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

   /**
    * 쿠폰 등록
    * @returns {{ok: boolean, message: string}}
    */
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

   /**
    * 쿠폰 적용(보유 쿠폰 중 1개)
    * @returns {{ok: boolean, message: string}}
    */
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

   /**
    * 결제 완료 시점에 호출(사용 처리)
    * - 적용 중이었다면 자동 해제
    */
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

   /**
    * (운영 편의) 보유 쿠폰 삭제
    * - MVP에선 잘 안 쓰지만 관리 기능 붙일 때 유용
    */
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
    * (디버그/초기화) 전부 초기화
    */
   clearAll() {
      state = { owned: [], appliedCode: '' };

      // ✅ v2/v1 저장 데이터까지 제거(완전 초기화)
      if (hasStorage()) {
         window.localStorage.removeItem(STORAGE_KEY_V2);
         window.localStorage.removeItem(STORAGE_KEY_V1);
      }

      notify();
   },
};
// couponStore.clearAll();
