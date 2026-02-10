/**
 * =============================================
 * 📍 위치: src/store/authStore.js
 * 역할: 로그인 상태 전역 저장소 (MVP)
 * - localStorage 영속화
 * - authUi/guards가 쓰는 헬퍼 메서드 제공
 * - ✅ updateUser(patch)로 결제/포인트/등급 연동 확장
 *
 * ✅ 패치 요약
 * - points 필드 normalize에 포함
 * - number 정규화 강화 (NaN/음수 방지)
 * - localStorage 안전 접근
 * - ✅ NEW: reve_users_v1(SSOT) 동기화 + 덮어쓰기 방지 + 로그인 복구
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
   return Math.max(0, Math.floor(normalizeNumber(n, 0)));
}

/* ==============================
   ✅ Users SSOT Sync (reve_users_v1)
============================== */

const USERS_KEY = 'reve_users_v1';

function safeParseUsers(json, fallback) {
   try {
      const v = JSON.parse(json);
      return v ?? fallback;
   } catch {
      return fallback;
   }
}

function readUsers() {
   if (!hasStorage()) return [];
   const raw = window.localStorage.getItem(USERS_KEY);
   const list = safeParseUsers(raw, []);
   return Array.isArray(list) ? list : [];
}

function writeUsers(list) {
   if (!hasStorage()) return;
   window.localStorage.setItem(
      USERS_KEY,
      JSON.stringify(Array.isArray(list) ? list : []),
   );
}

function findUserInUsersStorage(userId) {
   const id = String(userId || '').trim();
   if (!id) return null;
   const list = readUsers();
   return list.find((u) => String(u?.id || '').trim() === id) || null;
}

/**
 * ✅ authStore(user) -> users 저장소(reve_users_v1) 동기화
 * - 덮어쓰기 방지: user.points/totalSpent가 "없으면" 기존 값을 유지
 */
function syncUserToUsersStorage(user) {
   if (!user?.id) return;

   const now = Date.now();
   const list = readUsers();

   const idx = list.findIndex((u) => String(u?.id || '').trim() === user.id);
   const prev = idx >= 0 ? list[idx] : null;

   const incomingPoints =
      user.points === undefined || user.points === null
         ? (prev?.points ?? 0)
         : user.points;

   const incomingSpent =
      user.totalSpent === undefined || user.totalSpent === null
         ? (prev?.totalSpent ?? 0)
         : user.totalSpent;

   const patch = {
      id: String(user.id).trim(),
      username: String(user.name || user.id).trim(),
      role: String(user.role || 'MEMBER')
         .trim()
         .toUpperCase(),
      totalSpent: normalizeMoney(incomingSpent),
      points: normalizeMoney(incomingPoints),
      updatedAt: now,
      createdAt: idx >= 0 ? Number(prev?.createdAt || now) : now,
   };

   if (idx >= 0) {
      list[idx] = { ...prev, ...patch };
   } else {
      list.unshift(patch);
   }

   writeUsers(list);
}

/* ==============================
   1) User Normalizer
============================== */

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
      totalSpent: normalizeMoney(user.totalSpent ?? 0),
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

/**
 * ✅ 부팅 시 1회: 이미 로그인된 상태면 users SSOT에도 반영
 * - (특히 이전에 users가 0으로 덮였던 경우) 복구 트리거가 됨
 */
if (state.user) {
   syncUserToUsersStorage(state.user);
}

/* ==============================
   4) Public API
============================== */

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
    * ✅ users SSOT에서 기존 레코드 있으면 points/totalSpent 복구해서 로그인
    */
   login(user) {
      // 1) 먼저 payload normalize
      const normalizedPayload = normalizeUser(user);
      if (!normalizedPayload) {
         console.warn('[authStore] invalid user payload:', user);
         return { ok: false, message: 'invalid user payload' };
      }

      // 2) SSOT(users)에서 기존 레코드 탐색 후 합치기 (points 유실 방지)
      const fromUsers = findUserInUsersStorage(normalizedPayload.id);

      const merged = normalizeUser({
         ...normalizedPayload,
         // users 쪽 값이 더 신뢰(SSOT) + payload에 points가 없던 케이스 방지
         points:
            normalizedPayload.points > 0
               ? normalizedPayload.points
               : (fromUsers?.points ?? normalizedPayload.points),
         totalSpent: Math.max(
            normalizedPayload.totalSpent,
            normalizeMoney(fromUsers?.totalSpent ?? 0),
         ),
         // name/role은 payload 우선(로그인 UX)
      });

      if (!merged) return { ok: false, message: 'normalize failed' };

      state = { isLoggedIn: true, user: merged };

      // ✅ users에도 upsert (덮어쓰기 방지 로직 포함)
      syncUserToUsersStorage(merged);

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
    */
   updateUser(patch) {
      if (!state.user) return { ok: false, message: 'not logged in' };

      const next = normalizeUser({
         ...state.user,
         ...(patch && typeof patch === 'object' ? patch : {}),
      });

      if (!next) return { ok: false, message: 'normalize failed' };

      state = { ...state, user: next };

      // ✅ users에도 upsert
      syncUserToUsersStorage(next);

      notify();
      return { ok: true };
   },

   clearAll() {
      state = { isLoggedIn: false, user: null };
      if (hasStorage()) window.localStorage.removeItem(STORAGE_KEY);
      notify();
   },
};
