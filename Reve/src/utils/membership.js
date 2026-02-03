/**
 * =============================================
 * 📍 위치: src/utils/membership.js
 * 역할: 회원 등급/적립 정책(단일 소스)
 *
 * ✅ 제공 API
 * - getTierInfo(totalSpent)
 * - getTierIndexByTotalSpent(totalSpent)
 * - getEarnRateByTier(tierName)
 * - calcExpectedPoints(total, rate)
 * - getMembershipSnapshot({ totalSpent, checkoutTotal })
 * - getUpgradedTiers({ prevTotalSpent, nextTotalSpent })
 * - getUpgradeCouponCode(tierName)
 * - formatPercent(rate)
 *
 * ✅ 설계 포인트
 * - 정책 변경은 MEMBERSHIP_TIERS만 수정하면 전체 반영
 * - Cart/MyPage/결제완료 화면이 같은 유틸 공유 → 불일치 방지
 * =============================================
 */

/* ==============================
   1) Policy Tables (Single Source)
   ============================== */

export const MEMBERSHIP_TIERS = [
   { name: '실버', minSpent: 0, earnRate: 0.01 },
   { name: '골드', minSpent: 3_000_000, earnRate: 0.02 },
   { name: '로얄', minSpent: 6_000_000, earnRate: 0.03 },
   { name: 'VIP', minSpent: 12_000_000, earnRate: 0.05 },
];

export const UPGRADE_COUPON_BY_TIER = {
   골드: 'UPGRADE_GOLD',
   로얄: 'UPGRADE_ROYAL',
   VIP: 'UPGRADE_VIP',
};

/* ==============================
    2) Types (JSDoc)
    ============================== */

/**
 * @typedef {Object} Tier
 * @property {string} name
 * @property {number} minSpent
 * @property {number} earnRate
 */

/**
 * @typedef {Object} TierInfo
 * @property {Tier} current
 * @property {Tier|null} next
 * @property {number} totalSpent
 * @property {number} remainToNext
 * @property {number} progressToNextPct // 0~100 (next가 없으면 100)
 */

/* ==============================
    3) Internal Utils
    ============================== */

function clamp01(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return 0;
   return Math.max(0, Math.min(1, v));
}

function normalizeMoney(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return 0;
   return Math.max(0, Math.floor(v));
}

function sortTiersAsc(list) {
   const arr = Array.isArray(list) ? list : [];
   return [...arr].sort(
      (a, b) => Number(a.minSpent || 0) - Number(b.minSpent || 0),
   );
}

const TIERS_ASC = sortTiersAsc(MEMBERSHIP_TIERS);

/** ✅ totalSpent 기준 "현재 등급 index" */
function findTierIndexBySpent(totalSpent) {
   const spent = normalizeMoney(totalSpent);

   let idx = 0;
   for (let i = 0; i < TIERS_ASC.length; i++) {
      if (spent >= TIERS_ASC[i].minSpent) idx = i;
   }
   return idx;
}

/* ==============================
    4) Public APIs
    ============================== */

export function getTierIndexByTotalSpent(totalSpent) {
   return findTierIndexBySpent(totalSpent);
}

export function getEarnRateByTier(tierName) {
   const name = String(tierName || '').trim();
   const t = TIERS_ASC.find((x) => x.name === name);
   return clamp01(t?.earnRate ?? 0);
}

export function getTierInfo(totalSpent) {
   const spent = normalizeMoney(totalSpent);

   const idx = findTierIndexBySpent(spent);
   const current = TIERS_ASC[idx];
   const next = TIERS_ASC[idx + 1] || null;

   const remainToNext = next ? Math.max(0, next.minSpent - spent) : 0;

   let progressToNextPct = 100;
   if (next) {
      const base = current.minSpent;
      const top = next.minSpent;
      const denom = Math.max(1, top - base);

      progressToNextPct = Math.round(((spent - base) / denom) * 100);
      progressToNextPct = Math.max(0, Math.min(100, progressToNextPct));
   }

   /** @type {TierInfo} */
   return {
      current,
      next,
      totalSpent: spent,
      remainToNext,
      progressToNextPct,
   };
}

export function calcExpectedPoints(total, rate) {
   const t = normalizeMoney(total);
   const r = clamp01(rate);
   return Math.round(t * r);
}

export function getMembershipSnapshot({
   totalSpent = 0,
   checkoutTotal = 0,
} = {}) {
   const tierInfo = getTierInfo(totalSpent);
   const earnRate = clamp01(tierInfo.current.earnRate);
   const expectedPoints = calcExpectedPoints(checkoutTotal, earnRate);

   return {
      tierInfo,
      current: tierInfo.current,
      next: tierInfo.next,
      totalSpent: tierInfo.totalSpent,
      remainToNext: tierInfo.remainToNext,
      progressToNextPct: tierInfo.progressToNextPct,
      earnRate,
      expectedPoints,
   };
}

/**
 * ✅ 승급 감지: prev -> next 누적 구매액 비교해서 "새로 달성한 등급들" 반환
 * - 실버→로얄처럼 2단 점프 시: 골드, 로얄 모두 반환(정책)
 */
export function getUpgradedTiers({
   prevTotalSpent = 0,
   nextTotalSpent = 0,
} = {}) {
   const prevIdx = findTierIndexBySpent(prevTotalSpent);
   const nextIdx = findTierIndexBySpent(nextTotalSpent);

   if (nextIdx <= prevIdx) return [];
   return TIERS_ASC.slice(prevIdx + 1, nextIdx + 1);
}

export function getUpgradeCouponCode(tierName) {
   const name = String(tierName || '').trim();
   return UPGRADE_COUPON_BY_TIER?.[name] || '';
}

export function formatPercent(rate) {
   return `${Math.round(clamp01(rate) * 100)}%`;
}
