/**
 * =============================================
 * 📍 위치: src/components/Toast.js
 * 역할: 전역 토스트(알림) UI 컴포넌트
 * 사용처: app.js에서 1번 init 후, toast.show(message)로 호출
 * =============================================
 */

import { createToastController } from '../utils/toast.js';

/**
 * 토스트를 body에 1번만 마운트하고 컨트롤러를 반환
 * @returns {{ show: (message: string, options?: { duration?: number }) => void }}
 */
export function initToast() {
   // 이미 있으면 재사용(라우팅으로 #app이 갈아끼워져도 body는 유지)
   let root = document.querySelector('[data-toast-root]');

   if (!root) {
      root = document.createElement('div');
      root.setAttribute('data-toast-root', '');
      root.className = 'toast-root';
      root.setAttribute('aria-live', 'polite');
      root.setAttribute('aria-atomic', 'true');
      document.body.appendChild(root);
   }

   const controller = createToastController(root);

   return {
      show: controller.show,
   };
}
