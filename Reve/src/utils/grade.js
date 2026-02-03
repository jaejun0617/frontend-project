/**
 * =============================================
 * 📍 위치: src/utils/grade.js
 * 역할: 회원 등급/적립률 정책 계산 유틸
 * =============================================
 */

export const GRADE_POLICY = [
   { grade: 'SILVER', min: 0, max: 2_999_999, pointRate: 0.02 },
   { grade: 'GOLD', min: 3_000_000, max: 5_999_999, pointRate: 0.04 },
   { grade: 'ROYAL', min: 6_000_000, max: 11_999_999, pointRate: 0.06 },
   { grade: 'VIP', min: 12_000_000, max: 14_999_999, pointRate: 0.08 },
   { grade: 'VVIP', min: 15_000_000, max: Infinity, pointRate: 0.1 },
];

export function getGradeByTotalSpent(totalSpent = 0) {
   const spent = Math.max(0, Number(totalSpent) || 0);
   const found = GRADE_POLICY.find((g) => spent >= g.min && spent <= g.max);
   return found?.grade ?? 'SILVER';
}

export function getPointRateByTotalSpent(totalSpent = 0) {
   const spent = Math.max(0, Number(totalSpent) || 0);
   const grade = getGradeByTotalSpent(spent);
   const policy =
      GRADE_POLICY.find((g) => g.grade === grade) || GRADE_POLICY[0];
   return policy.pointRate;
}

export function getNextGradeInfo(totalSpent = 0) {
   const spent = Math.max(0, Number(totalSpent) || 0);
   const currentGrade = getGradeByTotalSpent(spent);

   const idx = GRADE_POLICY.findIndex((g) => g.grade === currentGrade);
   const current = GRADE_POLICY[idx] || GRADE_POLICY[0];
   const next = GRADE_POLICY[idx + 1] || null;

   if (!next) {
      return {
         currentGrade,
         nextGrade: null,
         progress: 1,
         leftToNext: 0,
         nextMin: null,
      };
   }

   const start = current.min;
   const end = next.min; // 다음 등급 시작점
   const raw = end <= start ? 1 : (spent - start) / (end - start);

   return {
      currentGrade,
      nextGrade: next.grade,
      progress: Math.min(1, Math.max(0, raw)),
      leftToNext: Math.max(0, next.min - spent),
      nextMin: next.min,
   };
}

export function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

export function formatPercent(rate) {
   const r = Number(rate || 0);
   return `${Math.round(r * 100)}%`;
}

// grade.clearAll();
