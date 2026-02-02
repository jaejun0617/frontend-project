/**
 * =============================================
 * 📍 위치: src/utils/authUi.js
 * 역할: Header UI 노출 토글 + Logout 바인딩
 *
 * ✅ data 훅
 * - [data-auth-login]  : 게스트만 보이기
 * - [data-auth-logout] : 로그인 상태만 보이기
 * - [data-auth-mypage] : 로그인 상태만 보이기
 * - [data-auth-admin]  : ADMIN만 보이기
 * =============================================
 */

import { authStore } from '../store/authStore.js';
import { confirmModal } from '../components/ConfirmModal.js';
function show(el) {
   if (!el) return;
   el.hidden = false;
}

function hide(el) {
   if (!el) return;
   el.hidden = true;
}

export function initAuthUi() {
   // 로그아웃은 문서 위임 1번만
   document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-logout]');
      if (!btn) return;

      const ok = await confirmModal({
         title: '로그아웃',
         message: '로그아웃 하시겠어요?',
         okText: '로그아웃',
         cancelText: '취소',
      });

      if (!ok) return;

      authStore.logout();
      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href: '/' } }),
      );
   });
   function refresh() {
      const isLoggedIn = authStore.isLoggedIn();
      const role = authStore.getRole(); // 'GUEST' | 'MEMBER' | 'ADMIN'

      // ✅ 게스트 전용 (로그인 버튼/링크)
      document.querySelectorAll('[data-auth-login]').forEach((el) => {
         if (isLoggedIn) hide(el);
         else show(el);
      });

      // ✅ 로그인 전용 (로그아웃 버튼/아이콘)
      document.querySelectorAll('[data-auth-logout]').forEach((el) => {
         if (isLoggedIn) show(el);
         else hide(el);
      });

      // ✅ 로그인 전용 (마이페이지)
      document.querySelectorAll('[data-auth-mypage]').forEach((el) => {
         if (isLoggedIn) show(el);
         else hide(el);
      });

      // ✅ 관리자 전용
      document.querySelectorAll('[data-auth-admin]').forEach((el) => {
         if (isLoggedIn && role === 'ADMIN') show(el);
         else hide(el);
      });
   }

   // store 바뀌면 자동 refresh도 걸어두면 UX가 좋아짐
   authStore.subscribe(() => refresh());

   return { refresh };
}
