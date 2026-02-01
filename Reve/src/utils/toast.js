/**
 * =============================================
 * 📍 위치: src/utils/toast.js
 * 역할: 토스트 동작 로직(타이머/중복 방지)
 * - DOM은 Toast 컴포넌트가 만들고,
 * - 여기서는 "보여주기/숨기기"만 담당
 * =============================================
 */

/**
 * @param {HTMLElement} root
 * @returns {{ show: (message: string, options?: { duration?: number }) => void }}
 */
export function createToastController(root) {
   /** @type {number | null} */
   let hideTimer = null;

   // 토스트 엘리먼트는 1개만 재사용(연타해도 부드럽게 교체)
   const toastEl = document.createElement('div');
   toastEl.className = 'toast';
   toastEl.setAttribute('role', 'status');
   toastEl.setAttribute('aria-live', 'polite');
   toastEl.setAttribute('aria-atomic', 'true');
   root.appendChild(toastEl);

   function hide() {
      toastEl.classList.remove('is-toast-show');
   }

   /**
    * @param {string} message
    * @param {{ duration?: number }} [options]
    */
   function show(message, options = {}) {
      const duration = Number(options.duration ?? 1400);

      // 메시지 업데이트
      toastEl.textContent = message;

      // 이전 타이머가 있으면 취소(연타 시 덮어쓰기)
      if (hideTimer) {
         window.clearTimeout(hideTimer);
      }

      // 보여주기
      // (CSS 애니메이션을 위해 reflow 한 번)
      toastEl.classList.remove('is-toast-show');
      // eslint-disable-next-line no-unused-expressions
      toastEl.offsetHeight;
      toastEl.classList.add('is-toast-show');

      // 자동 닫힘
      hideTimer = window.setTimeout(() => {
         hide();
         hideTimer = null;
      }, duration);
   }

   return { show };
}
