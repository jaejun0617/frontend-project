/**
 * =============================================
 * 📍 위치: src/utils/membership.js
 * 역할: 회원 등급/적립 정책(단일 소스)
 *
 * ✅ 제공 API
 * - getTierInfo(totalSpent): 현재 등급/다음 등급/남은 금액/진행률
 * - getEarnRateByTier(tierName): 등급별 적립률
 * - calcExpectedPoints(total, rate): 예상 적립 포인트 계산
 * - getMembershipSnapshot({ totalSpent, checkoutTotal }): Cart/MyPage용 요약 데이터
 *
 * ✅ 설계 포인트
 * - 등급/정책 변경은 TIERS만 수정하면 전체 반영됨
 * - Cart/MyPage/결제완료 화면이 같은 유틸을 공유 → 불일치 방지
 * =============================================
 */

/**
 * ✅ 등급 정책 테이블
 * - minSpent: 누적 구매액 하한(원)
 * - earnRate: 적립률(0~1)
 *
 * ⚠️ 필요하면 VVVIP 같은 상위 등급을 여기만 추가하면 됨
 */
const TIERS = [
   { name: '실버', minSpent: 0, earnRate: 0.01 },
   { name: '골드', minSpent: 3_000_000, earnRate: 0.02 },
   { name: '로얄', minSpent: 6_000_000, earnRate: 0.03 },
   { name: 'VIP', minSpent: 12_000_000, earnRate: 0.05 },
];

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
 * @property {number} progressToNextPct   // 0~100 (next가 없으면 100)
 */

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
   return [...list].sort((a, b) => a.minSpent - b.minSpent);
}

const TIERS_ASC = sortTiersAsc(TIERS);

function findTierIndexBySpent(totalSpent) {
   const spent = normalizeMoney(totalSpent);

   // ✅ 가장 높은 minSpent를 만족하는 등급이 현재 등급
   let idx = 0;
   for (let i = 0; i < TIERS_ASC.length; i++) {
      if (spent >= TIERS_ASC[i].minSpent) idx = i;
   }
   return idx;
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

   // ✅ 다음 등급까지 남은 금액
   const remainToNext = next ? Math.max(0, next.minSpent - spent) : 0;

   // ✅ 진행률(현재 등급 구간에서 next까지)
   // - 실버(0) -> 골드(3M) 같은 경우: 0~3M 구간
   // - next가 없으면 100%
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

   // ✅ 포인트 정책: 반올림(원하면 floor로 바꿔도 됨)
   return Math.round(t * r);
}

/**
 * Cart/MyPage에서 바로 쓰기 좋은 요약 스냅샷
 */
export function getMembershipSnapshot({
   totalSpent = 0,
   checkoutTotal = 0,
} = {}) {
   const tierInfo = getTierInfo(totalSpent);
   const earnRate = clamp01(tierInfo.current.earnRate);
   const expectedPoints = calcExpectedPoints(checkoutTotal, earnRate);

   return {
      tierInfo,
      earnRate,
      expectedPoints,
   };
}

export function formatPercent(rate) {
   return `${Math.round(clamp01(rate) * 100)}%`;
}
