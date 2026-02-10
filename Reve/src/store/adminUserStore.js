/**
 * =============================================
 * 📍 위치: src/store/adminUserStore.js
 * 역할: Admin 전용 유저 조회/삭제(로컬 users 저장소 기반)
 * - users key: reve_users_v1 (authStore에서 쓰는 저장소)
 *
 * ✅ 제공 API
 * - getUsersRaw(): 로컬 원본 배열
 * - getUsers(): normalize + 최신순 정렬
 * - getUser(id): 단일 유저 조회
 * - remove(id): 회원 탈퇴(삭제)
 *
 * ✅ 주의
 * - 여기서 totalSpent/grade는 "원본 user 저장값" 기준일 수 있음
 * - Admin 화면에서는 deriveUsers()가 orders 합산 totalSpent로 덮어쓰고 grade도 재계산함(정답 루트)
 * =============================================
 */

/* ==============================
   0) Storage Key
============================== */

const USERS_KEY = 'reve_users_v1';

/* ==============================
   1) Safe JSON helpers
============================== */

function safeParse(json, fallback) {
   try {
      const v = JSON.parse(json);
      return v ?? fallback;
   } catch {
      return fallback;
   }
}

/* ==============================
   2) Grade helper (원본 normalize용)
   - Admin UI는 deriveUsers()에서 재계산하므로,
     여기 computeGrade는 "원본 데이터 방어" 정도로만 사용
============================== */

function computeGrade(totalSpent = 0) {
   const v = Number(totalSpent || 0);
   if (v < 3_000_000) return 'SILVER';
   if (v < 6_000_000) return 'GOLD';
   if (v < 12_000_000) return 'ROYAL';
   if (v < 30_000_000) return 'VIP';
   return 'VVIP';
}

/* ==============================
   3) User normalize
============================== */

function normalizeUser(u) {
   const id = String(u?.id || u?.userId || u?.username || '').trim();
   const role = String(u?.role || 'MEMBER').toUpperCase();

   const totalSpent = Number(u?.totalSpent || 0) || 0;
   const points =
      Number(
         u?.points ??
            u?.point ?? // 과거 키 대응
            u?.mileage ?? // 과거 키 대응
            u?.rewardPoints ?? // 혹시 남아있을 수 있는 키
            0,
      ) || 0;

   const grade = String(u?.grade || computeGrade(totalSpent)).toUpperCase();

   return {
      id,
      username: String(u?.username || id || '').trim(),
      role,
      totalSpent,
      points,
      grade,
      createdAt: Number(u?.createdAt || 0) || 0,
      updatedAt: Number(u?.updatedAt || 0) || 0,
   };
}

/* ==============================
   4) Low-level storage read/write
============================== */

function readUsersRaw() {
   const raw = localStorage.getItem(USERS_KEY);
   const list = safeParse(raw, []);
   return Array.isArray(list) ? list : [];
}

function writeUsersRaw(list) {
   const arr = Array.isArray(list) ? list : [];
   localStorage.setItem(USERS_KEY, JSON.stringify(arr));
}

/* ==============================
   5) Store (simple pub/sub optional)
============================== */

const listeners = new Set();

function emit() {
   listeners.forEach((fn) => {
      try {
         fn();
      } catch (e) {
         console.warn('[adminUserStore] subscriber error:', e);
      }
   });
}

export const adminUserStore = {
   /* ------------------------------
      Read
   ------------------------------ */

   getUsersRaw() {
      return readUsersRaw();
   },

   getUsers() {
      return this.getUsersRaw()
         .map(normalizeUser)
         .filter((u) => u.id)
         .sort(
            (a, b) =>
               (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt),
         );
   },

   getUser(id) {
      const key = String(id || '').trim();
      if (!key) return null;
      return this.getUsers().find((u) => u.id === key) || null;
   },

   /* ------------------------------
      Delete (회원 탈퇴)
      - 실제로 reve_users_v1 배열에서 제거
   ------------------------------ */

   remove(id) {
      const key = String(id || '').trim();
      if (!key) return { ok: false, message: 'id가 필요합니다.' };

      const list = readUsersRaw();
      const next = list.filter((u) => String(u?.id || '').trim() !== key);

      if (next.length === list.length) {
         return { ok: false, message: '유저를 찾을 수 없습니다.' };
      }

      writeUsersRaw(next);
      try {
         localStorage.removeItem(`reve_coupons_v1:${key}`);
         localStorage.removeItem(`reve_orders_v1:${key}`);
      } catch {}
      // ✅ UI 갱신용 이벤트(원하면 AdminPage에서 subscribe로도 받을 수 있음)
      emit();

      return { ok: true, removedId: key };
   },

   /* ------------------------------
      Subscribe (optional)
   ------------------------------ */

   subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
   },
};
