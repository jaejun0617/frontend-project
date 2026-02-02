/**
 * =============================================
 * 📍 위치: src/pages/admin/index.js
 * 역할: 관리자(Admin) 페이지 엔트리
 * 경로: /admin
 * =============================================
 */

export function AdminPage() {
   return `
     <section class="page admin-page" aria-label="Admin Page">
       <header class="page__header">
         <h1 class="page__title">Admin</h1>
         <p class="page__desc">관리자 전용 페이지 (MVP)</p>
       </header>
 
       <div class="page__content">
         <div class="admin-panel">
           <p class="admin-hint">여기는 관리자만 접근 가능합니다.</p>
 
           <div class="admin-actions">
             <button type="button" class="btn" data-admin-seed>
               더미 데이터 생성
             </button>
             <button type="button" class="btn primary" data-admin-open-products>
               상품 관리(준비중)
             </button>
           </div>
 
           <div class="admin-log" data-admin-log>
             <p class="loading">액션을 실행해보세요.</p>
           </div>
         </div>
       </div>
     </section>
   `;
}

export function initAdminPage() {
   const logEl = document.querySelector('[data-admin-log]');
   if (!logEl) return;

   function log(msg) {
      logEl.innerHTML = `<p class="result">${msg}</p>`;
   }

   document.addEventListener('click', (e) => {
      if (e.target.closest('[data-admin-seed]')) {
         log('✅ 더미 데이터 생성(예시) 완료');
         return;
      }

      if (e.target.closest('[data-admin-open-products]')) {
         log('🧱 상품 관리 화면은 다음 단계에서 붙일 예정');
      }
   });
}
