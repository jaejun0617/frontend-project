/**
 * =============================================
 * 📍 위치: src/components/ConfirmModal.js
 * 역할: Confirm 모달 (Promise 기반)
 * 사용: const ok = await confirmModal({ title, message, okText, cancelText })
 * =============================================
 */

let modalEl = null;
let resolver = null;

function ensureModal() {
   if (modalEl) return modalEl;

   const wrap = document.createElement('div');
   wrap.className = 'confirm-modal';
   wrap.innerHTML = `
    <div class="confirm-modal__overlay" data-confirm-overlay></div>

    <section
      class="confirm-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <header class="confirm-modal__header">
        <h2 class="confirm-modal__title" id="confirm-title">확인</h2>
        <button type="button" class="confirm-modal__x" aria-label="Close" data-confirm-cancel>✕</button>
      </header>

      <p class="confirm-modal__desc" id="confirm-desc">
        정말 진행할까요?
      </p>

      <div class="confirm-modal__actions">
        <button type="button" class="confirm-modal__btn" data-confirm-cancel>취소</button>
        <button type="button" class="confirm-modal__btn primary" data-confirm-ok>확인</button>
      </div>
    </section>
  `;

   document.body.appendChild(wrap);
   modalEl = wrap;

   // 이벤트 위임 (1번만)
   modalEl.addEventListener('click', (e) => {
      const okBtn = e.target.closest('[data-confirm-ok]');
      const cancelBtn = e.target.closest('[data-confirm-cancel]');
      const overlay = e.target.closest('[data-confirm-overlay]');

      if (okBtn) return close(true);
      if (cancelBtn) return close(false);
      if (overlay) return close(false);
   });

   // ESC 닫기
   document.addEventListener('keydown', (e) => {
      if (!modalEl || modalEl.hidden) return;
      if (e.key === 'Escape') close(false);
   });

   hide();
   return modalEl;
}

function show() {
   ensureModal();
   modalEl.hidden = false;
   document.body.classList.add('is-modal-open');

   // 접근성: 첫 포커스 OK 버튼
   const ok = modalEl.querySelector('[data-confirm-ok]');
   ok?.focus();
}

function hide() {
   ensureModal();
   modalEl.hidden = true;
   document.body.classList.remove('is-modal-open');
}

function close(result) {
   hide();

   const done = resolver;
   resolver = null;

   if (typeof done === 'function') done(Boolean(result));
}

export function confirmModal({
   title = '확인',
   message = '정말 진행할까요?',
   okText = '확인',
   cancelText = '취소',
} = {}) {
   ensureModal();

   // 텍스트 주입
   const titleEl = modalEl.querySelector('#confirm-title');
   const descEl = modalEl.querySelector('#confirm-desc');
   const okBtn = modalEl.querySelector('[data-confirm-ok]');
   const cancelBtn = modalEl.querySelector(
      '[data-confirm-cancel].confirm-modal__btn',
   );

   if (titleEl) titleEl.textContent = String(title);
   if (descEl) descEl.textContent = String(message);
   if (okBtn) okBtn.textContent = String(okText);
   if (cancelBtn) cancelBtn.textContent = String(cancelText);

   show();

   return new Promise((resolve) => {
      resolver = resolve;
   });
}
