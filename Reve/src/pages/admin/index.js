/**
 * =============================================
 * 📍 위치: src/pages/admin/index.js
 * 역할: 관리자(Admin) 페이지 엔트리
 * 경로: /admin
 * - Seed / Backup / Audit / (Products/Coupons 준비)
 * =============================================
 */

import { adminProductStore } from '../../store/adminProductStore.js';
import { adminCouponStore } from '../../store/adminCouponStore.js';
import { adminOrderStore } from '../../store/adminOrderStore.js';
import { auditLog } from '../../utils/auditLog.js';
import { downloadExportJson, importAppData } from '../../utils/exportImport.js';
import { confirmModal } from '../../components/ConfirmModal.js';
import { initToast } from '../../components/Toast.js';

export function AdminPage() {
   return `
     <section class="page admin-page" aria-label="Admin Page" data-admin>
       <header class="page__header">
         <h1 class="page__title">Admin</h1>
         <p class="page__desc">운영 도구 (Products / Orders / Coupons / Backup / Audit)</p>
       </header>

       <div class="page__content">
         <div class="admin-panel">
           <p class="admin-hint">여기는 관리자만 접근 가능합니다.</p>

           <div class="admin-actions">
             <button type="button" class="btn" data-admin-seed-products>
               더미 상품 생성
             </button>
             <button type="button" class="btn" data-admin-seed-coupons>
               더미 쿠폰 생성
             </button>
             <button type="button" class="btn primary" data-admin-export>
               백업(Export JSON)
             </button>
             <label class="btn subtle" style="display:inline-flex; gap:8px; align-items:center; cursor:pointer;">
               Import JSON
               <input type="file" accept="application/json" data-admin-import hidden />
             </label>
             <button type="button" class="btn subtle" data-admin-audit>
               감사로그 보기
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
   const root = document.querySelector('[data-admin]');
   if (!root) return;

   // ✅ 중복 바인딩 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const toast = initToast();
   const logEl = root.querySelector('[data-admin-log]');

   function log(msg) {
      if (!logEl) return;
      logEl.innerHTML = `<p class="result">${String(msg || '')}</p>`;
   }

   // ✅ 상태 변화 시 최소 리프레시(원하면 확장)
   adminProductStore.subscribe(() => {});
   adminCouponStore.subscribe(() => {});

   root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-admin-seed-products]')) {
         const r = adminProductStore.seedDummy();
         toast.show(`상품 더미 생성: ${r.created}개`, { duration: 1300 });
         log(`✅ 더미 상품 생성 완료 (${r.created}개)`);
         return;
      }

      if (e.target.closest('[data-admin-seed-coupons]')) {
         const r = adminCouponStore.seedDummy();
         toast.show(`쿠폰 더미 생성: ${r.created}개`, { duration: 1300 });
         log(`✅ 더미 쿠폰 생성 완료 (${r.created}개)`);
         return;
      }

      if (e.target.closest('[data-admin-export]')) {
         const ok = await confirmModal({
            title: '백업 Export',
            message: '현재 로컬 데이터를 JSON 파일로 백업할까요?',
            confirmText: '백업',
            cancelText: '취소',
         });
         if (!ok) return;

         downloadExportJson({ filename: `reve-backup-${Date.now()}.json` });
         log('💾 백업 파일 다운로드를 시작했습니다.');
         return;
      }

      if (e.target.closest('[data-admin-audit]')) {
         const items = auditLog.list({ limit: 20 });
         const text = items.length
            ? items
                 .map((x) => {
                    const t = new Date(x.ts).toLocaleString('ko-KR');
                    return `• [${t}] ${x.action} (${x.targetType}:${x.targetId || '-'})`;
                 })
                 .join('\n')
            : '감사 로그가 없습니다.';

         await confirmModal({
            title: '감사 로그(최근 20개)',
            message: text,
            confirmText: '확인',
            cancelText: '닫기',
         });
         return;
      }
   });

   // ✅ Import는 file input change로 처리
   const fileInput = root.querySelector('[data-admin-import]');
   fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();

      const ok = await confirmModal({
         title: 'Import 복원',
         message:
            '백업 JSON을 복원할까요?\n\n주의: replace 모드로 복원하면 기존 데이터가 덮어써질 수 있습니다.',
         confirmText: '복원',
         cancelText: '취소',
      });
      if (!ok) return;

      // ✅ 기본은 replace=false (안전)
      const r = importAppData(text, { replace: false });

      if (r.ok) {
         toast.show(`복원 완료: ${r.applied}개 키 적용`, { duration: 1500 });
         log(`✅ Import 복원 완료 (${r.applied}개 키 적용)`);
      } else {
         toast.show(r.message || 'Import 실패', { duration: 1500 });
         log(`❌ Import 실패: ${r.message || 'unknown error'}`);
      }

      // input 초기화(같은 파일 다시 선택 가능)
      e.target.value = '';
   });

   log('🧪 Admin 준비 완료. Seed/Backup/Audit를 먼저 사용해보세요.');
}
