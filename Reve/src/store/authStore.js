/**
 * =============================================
 * 📍 위치: src/store/authStore.js
 * 역할: 로그인 상태 전역 저장소 (MVP)
 * - localStorage 영속화
 * - authUi/guards가 쓰는 헬퍼 메서드 제공
 * - ✅ updateUser(patch)로 결제/포인트/등급 연동 확장
 *
 * ✅ 패치 요약
 * - points 필드 normalize에 포함 (포인트가 저장 직전 증발하던 버그 fix)
 * - number 정규화 강화 (NaN/음수 방지)
 * - localStorage 안전 접근 (에러 방지)
 * =============================================
 */

const STORAGE_KEY = 'reve_auth_v1';

/* ==============================
   0) Safe Storage Utils
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

function normalizeNumber(n, fallback = 0) {
   const v = Number(n);
   if (!Number.isFinite(v)) return fallback;
   return v;
}

function normalizeMoney(n) {
   // ✅ 원 단위: 정수화 + 음수 방지
   return Math.max(0, Math.floor(normalizeNumber(n, 0)));
}

/* ==============================
   1) User Normalizer
   ============================== */

function normalizeUser(user) {
   if (!user || typeof user !== 'object') return null;

   const id = String(user.id ?? '').trim();
   const name = String(user.name ?? '').trim();

   // ✅ 권한은 MEMBER/ADMIN만 허용
   const role = String(user.role ?? 'MEMBER')
      .trim()
      .toUpperCase();

   if (!id || !name) return null;

   return {
      id,
      name,
      role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',

      // ✅ 누적 구매액(원)
      totalSpent: normalizeMoney(user.totalSpent ?? 0),

      // ✅ 보유 포인트(정수)
      // - 기존 버그: 이 필드가 normalize에서 빠져서 업데이트해도 저장이 안 됐음
      points: normalizeMoney(user.points ?? 0),
   };
}

/* ==============================
   2) State IO
   ============================== */

function readState() {
   if (!hasStorage()) {
      return { isLoggedIn: false, user: null };
   }

   const raw = window.localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;

   const user = normalizeUser(parsed?.user);
   return {
      isLoggedIn: Boolean(user),
      user,
   };
}

function writeState(next) {
   if (!hasStorage()) return;
   window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/* ==============================
   3) Store Core
   ============================== */

let state = readState();

/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

export const authStore = {
   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getUser() {
      return state.user;
   },

   isLoggedIn() {
      return Boolean(state.user);
   },

   getRole() {
      return state.user?.role ?? 'GUEST';
   },

   /**
    * 로그인 처리
    * - normalizeUser로 shape 고정
    */
   login(user) {
      const normalized = normalizeUser(user);
      if (!normalized) {
         console.warn('[authStore] invalid user payload:', user);
         return { ok: false, message: 'invalid user payload' };
      }

      state = { isLoggedIn: true, user: normalized };
      notify();
      return { ok: true };
   },

   logout() {
      state = { isLoggedIn: false, user: null };
      notify();
      return { ok: true };
   },

   /**
    * ✅ 로그인 유지 상태에서 user 일부만 업데이트
    * - 결제 후 totalSpent 누적 / 포인트 적립 등에 사용
    * - merge 후 normalize로 값 안정화
    */
   updateUser(patch) {
      if (!state.user) return { ok: false, message: 'not logged in' };

      const next = normalizeUser({
         ...state.user,
         ...(patch && typeof patch === 'object' ? patch : {}),
      });

      if (!next) return { ok: false, message: 'normalize failed' };

      state = { ...state, user: next };
      notify();
      return { ok: true };
   },

   /**
    * (디버그) 저장 데이터까지 완전 초기화
    */
   clearAll() {
      state = { isLoggedIn: false, user: null };
      if (hasStorage()) window.localStorage.removeItem(STORAGE_KEY);
      notify();
   },
};
