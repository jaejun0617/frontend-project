/**
 * =============================================
 * 📍 위치: src/utils/guards.js
 * 역할: 로그인/권한 접근 가드
 * - 페이지 진입 가드 (requireAuth / requireAdmin)
 * - 필요 시 /auth로 리다이렉트 + redirectTo 쿼리 유지
 * =============================================
 */

import { authStore } from '../store/authStore.js';

function goAuth(redirectTo = '/') {
   const next = encodeURIComponent(redirectTo);
   window.dispatchEvent(
      new CustomEvent('app:navigate', {
         detail: { href: `/auth?redirectTo=${next}` },
      }),
   );
}

export function requireAuth({ redirectTo = window.location.pathname } = {}) {
   if (authStore.isLoggedIn()) return true;
   goAuth(redirectTo);
   return false;
}

export function requireAdmin({ redirectTo = window.location.pathname } = {}) {
   if (!authStore.isLoggedIn()) {
      goAuth(redirectTo);
      return false;
   }
   if (authStore.getRole() === 'ADMIN') return true;

   // 로그인은 했는데 권한 없음
   window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { href: '/404' } }),
   );
   return false;
}
