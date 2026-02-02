/**
 * =============================================
 * 📍 위치: src/store/authStore.js
 * 역할: 로그인 상태 전역 저장소 (MVP)
 * - localStorage 영속화
 * - authUi/guards가 쓰는 헬퍼 메서드 제공
 * - ✅ updateUser(patch)로 결제/등급연동 확장
 * =============================================
 */

const STORAGE_KEY = 'reve_auth_v1';

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function normalizeUser(user) {
   if (!user || typeof user !== 'object') return null;

   const id = String(user.id ?? '').trim();
   const name = String(user.name ?? '').trim();
   const role = String(user.role ?? 'MEMBER')
      .trim()
      .toUpperCase();

   if (!id || !name) return null;

   return {
      id,
      name,
      role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      totalSpent: Math.max(0, Number(user.totalSpent ?? 0)),
   };
}

function readState() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : null;

   const user = normalizeUser(parsed?.user);
   return {
      isLoggedIn: Boolean(user),
      user,
   };
}

function writeState(next) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

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

   login(user) {
      const normalized = normalizeUser(user);
      if (!normalized) {
         console.warn('[authStore] invalid user payload:', user);
         return;
      }
      state = { isLoggedIn: true, user: normalized };
      notify();
   },

   logout() {
      state = { isLoggedIn: false, user: null };
      notify();
   },

   /**
    * ✅ 로그인 유지 상태에서 user 일부만 업데이트
    * - 결제 후 totalSpent 누적 등에 사용
    */
   updateUser(patch) {
      if (!state.user) return;

      const next = normalizeUser({
         ...state.user,
         ...(patch && typeof patch === 'object' ? patch : {}),
      });

      if (!next) return;
      state = { ...state, user: next };
      notify();
   },
};
