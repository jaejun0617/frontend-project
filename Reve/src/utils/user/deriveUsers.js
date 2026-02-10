/**
 * =====================================================
 * 📍 위치: src/utils/user/deriveUsers.js
 * 역할: Admin "유저" 탭 표시용 파이프(정렬/검색/필터/등급계산)
 *
 * ✅ 설계(정답 루트)
 * - users 원본: adminUserStore.getUsers() (reve_users_v1)
 * - 누적 구매(totalSpent): adminOrderStore.getAllOrders()의 __ownerKey 기준 합산(정답)
 * - 등급(grade): 누적 구매(totalSpent) 기준으로 재계산(정답)
 * - 표시/검색/필터/정렬: deriveUsers()에서 최종 처리
 *
 * ✅ 이번 수정 포인트
 * - 정렬 방향 버그 방지: asc/desc가 뒤집히지 않도록 dirMul로 정리
 * - 숫자 필드(totalSpent/points/createdAt/updatedAt)는 무조건 숫자 정렬
 * - 문자열 필드(id/username/role/grade)는 localeCompare 정렬
 * =====================================================
 */

/* ==============================
   0) Grade map (입력값 정규화)
============================== */

const GRADE_TO_ENUM = {
   실버: 'SILVER',
   골드: 'GOLD',
   로얄: 'ROYAL',
   VIP: 'VIP',
   VVIP: 'VVIP',
   SILVER: 'SILVER',
   GOLD: 'GOLD',
   ROYAL: 'ROYAL',
   VIP: 'VIP',
   VVIP: 'VVIP',
};

const ENUM_TO_LABEL = {
   SILVER: 'SILVER',
   GOLD: 'GOLD',
   ROYAL: 'ROYAL',
   VIP: 'VIP',
   VVIP: 'VVIP',
};

/* ==============================
    1) Primitive helpers
 ============================== */

function toNum(v, fallback = 0) {
   const n = Number(v ?? fallback);
   return Number.isFinite(n) ? n : fallback;
}

function toStr(v) {
   return String(v ?? '');
}

function toStrLower(v) {
   return toStr(v).toLowerCase();
}

function includesQ(haystack, q) {
   if (!q) return true;
   return toStrLower(haystack).includes(q);
}

/**
 * ✅ fallback comparator
 * - key가 예상치 못한 값이어도 안정적으로 정렬되게 함
 */
function compareGeneric(a, b, dirMul) {
   const na = toNum(a, NaN);
   const nb = toNum(b, NaN);

   // 둘 다 "유효한 숫자"면 숫자 비교
   if (Number.isFinite(na) && Number.isFinite(nb)) {
      return (na - nb) * dirMul;
   }

   // 아니면 문자열 비교
   return toStrLower(a).localeCompare(toStrLower(b)) * dirMul;
}

/* ==============================
    2) Normalizers
 ============================== */

function normalizeRole(raw) {
   const v = toStr(raw).trim().toUpperCase();
   return v === 'ADMIN' ? 'ADMIN' : 'MEMBER';
}

function normalizeUserName(u) {
   // username/name 둘 다 대응
   return toStr(u?.username || u?.name || '').trim();
}

function normalizeGrade(raw) {
   const v = toStr(raw).trim();
   return GRADE_TO_ENUM[v] || 'SILVER';
}

/* ==============================
    3) Grade computing (정답: totalSpent 기반)
 ============================== */

/**
 * ✅ 누적 구매액(totalSpent) 기반 등급 계산(정답)
 * - 네 정책: SILVER < 300만, GOLD < 600만, ROYAL < 1200만, VIP < 3000만, 그 이상 VVIP
 */
function computeGradeEnum(totalSpent = 0) {
   const v = Math.max(0, Math.floor(toNum(totalSpent, 0)));
   if (v < 3_000_000) return 'SILVER';
   if (v < 6_000_000) return 'GOLD';
   if (v < 12_000_000) return 'ROYAL';
   if (v < 30_000_000) return 'VIP';
   return 'VVIP';
}

/* ==============================
    4) Orders -> SpentMap (정답 루트)
 ============================== */

/**
 * ✅ 주문 목록에서 ownerKey별 누적 결제액 합산
 * - adminOrderStore.getAllOrders()는 __ownerKey를 넣어주므로 그걸 최우선
 * - 혹시 다른 포맷이면 ownerKey도 지원
 */
function buildSpentMapFromOrders(orders) {
   const map = new Map();
   const list = Array.isArray(orders) ? orders : [];

   for (const o of list) {
      const ownerKey = toStr(o?.__ownerKey || o?.ownerKey || '').trim();
      if (!ownerKey) continue;

      const total = Math.max(0, Math.floor(toNum(o?.pricing?.total, 0)));
      map.set(ownerKey, (map.get(ownerKey) || 0) + total);
   }

   return map;
}

/* ==============================
    5) deriveUsers (pipe)
 ============================== */

/**
 * @param {{
 *  users: any[],
 *  orders: any[],
 *  q?: string,
 *  grade?: string,      // ALL | SILVER...
 *  sortKey?: string,    // createdAt | updatedAt | totalSpent | points | id | username | role | grade
 *  sortDir?: 'asc'|'desc'
 * }} params
 */
export function deriveUsers({
   users,
   orders,
   q = '',
   grade = 'ALL',
   sortKey = 'createdAt',
   sortDir = 'desc',
} = {}) {
   /* ==============================
       A) 입력 정규화
    ============================== */

   const rawUsers = Array.isArray(users) ? users : [];
   const spentMap = buildSpentMapFromOrders(orders);

   const qq = toStr(q).toLowerCase().trim();
   const g = toStr(grade || 'ALL')
      .toUpperCase()
      .trim();

   /**
    * ✅ 핵심: dirMul
    * - asc:  1
    * - desc: -1
    *
    * comparator는 "기본적으로 오름차순 (a - b)" 형태로 만들고,
    * desc면 dirMul=-1 곱해서 "큰 값이 앞으로" 오게 뒤집는다.
    */
   const dirMul = toStr(sortDir).toLowerCase() === 'asc' ? 1 : -1;
   const key = toStr(sortKey || 'createdAt').trim();

   /* ==============================
       B) rows 생성 (spent/grade 안정화)
    ============================== */

   const rows = rawUsers
      .map((u) => {
         const id = toStr(u?.id || '').trim();
         const username = normalizeUserName(u) || id; // ✅ 빈 값 방어
         const role = normalizeRole(u?.role);

         const points = Math.max(0, Math.floor(toNum(u?.points, 0)));

         // ✅ ownerKey가 id인 케이스가 일반적
         // ✅ 혹시 ownerKey가 username으로 저장된 케이스도 방어
         const spentFromOrders =
            (spentMap.has(id) ? spentMap.get(id) : null) ??
            (spentMap.has(username) ? spentMap.get(username) : null);

         const totalSpent =
            spentFromOrders != null
               ? Math.max(0, Math.floor(toNum(spentFromOrders, 0)))
               : Math.max(0, Math.floor(toNum(u?.totalSpent, 0)));

         // ✅ 등급은 totalSpent 기준 재계산이 "정답"
         const gradeEnum = computeGradeEnum(totalSpent);

         return {
            id,
            username,
            role,

            // 표시 등급
            grade: gradeEnum,
            gradeLabel: ENUM_TO_LABEL[gradeEnum] || gradeEnum,

            // 수치
            points,
            totalSpent,

            // 날짜(숫자)
            createdAt: Math.max(0, Math.floor(toNum(u?.createdAt, 0))),
            updatedAt: Math.max(0, Math.floor(toNum(u?.updatedAt, 0))),
         };
      })
      .filter((r) => r.id); // ✅ id 없는 row 제거

   /* ==============================
       C) search/filter
    ============================== */

   const filtered = rows.filter((r) => {
      const matchQ =
         !qq ||
         includesQ(r.id, qq) ||
         includesQ(r.username, qq) ||
         includesQ(r.role, qq) ||
         includesQ(r.grade, qq);

      const matchGrade = g === 'ALL' ? true : r.grade === g;
      return matchQ && matchGrade;
   });

   /* ==============================
       D) sort (✅ 정렬 버그 방지 핵심 구간)
    ============================== */

   const sorted = filtered.slice().sort((a, b) => {
      // 1) 숫자 필드: (a - b) * dirMul
      if (key === 'totalSpent')
         return (toNum(a.totalSpent) - toNum(b.totalSpent)) * dirMul;
      if (key === 'points') return (toNum(a.points) - toNum(b.points)) * dirMul;
      if (key === 'createdAt')
         return (toNum(a.createdAt) - toNum(b.createdAt)) * dirMul;
      if (key === 'updatedAt')
         return (toNum(a.updatedAt) - toNum(b.updatedAt)) * dirMul;

      // 2) 문자열 필드: a.localeCompare(b) * dirMul
      if (key === 'username')
         return (
            toStrLower(a.username).localeCompare(toStrLower(b.username)) *
            dirMul
         );
      if (key === 'id')
         return toStrLower(a.id).localeCompare(toStrLower(b.id)) * dirMul;
      if (key === 'role')
         return toStrLower(a.role).localeCompare(toStrLower(b.role)) * dirMul;
      if (key === 'grade')
         return toStrLower(a.grade).localeCompare(toStrLower(b.grade)) * dirMul;

      // 3) fallback
      return compareGeneric(a?.[key], b?.[key], dirMul);
   });

   return sorted;
}
