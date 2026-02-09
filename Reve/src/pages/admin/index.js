/**
 * =============================================
 * 📍 위치: src/pages/admin/index.js
 * 역할: 관리자(Admin) 페이지 엔트리 + 운영 탭 UI
 * 경로: /admin (app.js에서 requireAdmin 가드 적용됨)
 *
 * 포함 기능
 * - 탭: Products / Orders / Coupons / Audit / Backup
 * - Products: 등록/수정/삭제 + 대/중분류 + 검증 + 검색/필터 + 활성 토글
 * - Orders: (로컬스토리지 prefix 스캔) 전체 주문 조회 + 상태 변경(전이 검증)
 * - Coupons: (운영용 Catalog) 쿠폰 등록/수정/삭제 + 기간/최소금액/사용제한 등
 * - Audit: 관리자 액션 로그 기록/조회/삭제
 * - Backup: products/coupons/audit/orders(전체 스캔) 내보내기/가져오기
 *
 * 설계 포인트
 * - root 내부 이벤트 위임(data-bound)으로 중복 init 방지
 * - localStorage 파손 대비: store가 normalize & repair 수행
 * =============================================
 */

import { initToast } from '../../components/Toast.js';
import { confirmModal } from '../../components/ConfirmModal.js';

import { adminProductStore } from '../../store/adminProductStore.js';
import { adminOrderStore } from '../../store/adminOrderStore.js';
import { adminCouponStore } from '../../store/adminCouponStore.js';

import {
   validateProductDraft,
   validateCouponDraft,
   validateOrderStatusTransition,
} from '../../utils/validate.js';

import {
   exportAdminBundle,
   importAdminBundle,
} from '../../utils/exportImport.js';

import { auditLog } from '../../utils/auditLog.js';

/* ==============================
   1) Page Template
============================== */

export function AdminPage() {
   return `
     <section class="page admin-page" aria-label="Admin Page" data-admin>
       <header class="page__header">
         <h1 class="page__title">Admin</h1>
         <p class="page__desc">관리자 운영 툴 (LocalStorage 기반)</p>
       </header>

       <div class="page__content">
         <nav class="admin-tabs" aria-label="Admin Tabs">
           ${renderTabs('products')}
         </nav>

         <div class="admin-main">
           ${renderPanelProducts()}
           ${renderPanelOrders()}
           ${renderPanelCoupons()}
           ${renderPanelAudit()}
           ${renderPanelBackup()}
         </div>
       </div>
     </section>
   `;
}

/* ==============================
   2) Tabs / Panels
============================== */

const TABS = [
   { key: 'products', label: '상품 관리', enabled: true },
   { key: 'orders', label: '주문 관리', enabled: true },
   { key: 'coupons', label: '쿠폰/이벤트', enabled: true },
   { key: 'audit', label: '감사 로그', enabled: true },
   { key: 'backup', label: '백업/복구', enabled: true },
];

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function renderTabs(activeKey) {
   return `
     <ul class="admin-tabs__list" role="tablist">
       ${TABS.map((t) => {
          const on = t.key === activeKey;
          const disabled = !t.enabled;
          return `
            <li role="presentation">
              <button
                type="button"
                class="admin-tab ${on ? 'is-active' : ''}"
                role="tab"
                aria-selected="${on ? 'true' : 'false'}"
                data-admin-tab="${t.key}"
                ${disabled ? 'disabled aria-disabled="true"' : ''}
              >
                ${escapeHtml(t.label)}
                ${disabled ? `<span class="pill">SOON</span>` : ''}
              </button>
            </li>
          `;
       }).join('')}
     </ul>
   `;
}

function renderPanelProducts() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="products" aria-hidden="false">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">상품 관리</h2>
           <p class="admin-desc">상품 등록/수정/삭제 및 분류(대/중분류) 관리</p>
         </div>

         <div class="admin-head__actions">
           <button type="button" class="btn" data-admin-seed-products>더미 상품 생성</button>
           <button type="button" class="btn primary" data-admin-add-product>+ 상품 등록</button>
         </div>
       </div>

       <div class="admin-toolbar" aria-label="Products Toolbar">
         <input class="admin-input" type="text" placeholder="검색: 이름/ID/분류" data-admin-product-q />
         <select class="admin-select" data-admin-product-main>
           <option value="">대분류(전체)</option>
         </select>
         <select class="admin-select" data-admin-product-sub>
           <option value="">중분류(전체)</option>
         </select>
         <select class="admin-select" data-admin-product-status>
           <option value="ALL">상태(전체)</option>
           <option value="ACTIVE">활성</option>
           <option value="INACTIVE">비활성</option>
         </select>
         <button type="button" class="btn subtle" data-admin-product-reset>필터 초기화</button>
       </div>

       <div class="admin-card" data-admin-products-wrap>
         <p class="loading">불러오는 중...</p>
       </div>
     </section>
   `;
}

function renderPanelOrders() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="orders" aria-hidden="true">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">주문 관리</h2>
           <p class="admin-desc">전체 주문 조회 및 상태 변경(ADMIN 전용)</p>
         </div>

         <div class="admin-head__actions">
           <button type="button" class="btn" data-admin-refresh-orders>새로고침</button>
         </div>
       </div>

       <div class="admin-toolbar" aria-label="Orders Toolbar">
         <input class="admin-input" type="text" placeholder="검색: 주문번호/유저/상태" data-admin-order-q />
         <select class="admin-select" data-admin-order-status>
           <option value="ALL">상태(전체)</option>
           <option value="PAID">결제완료</option>
           <option value="SHIPPING">배송중</option>
           <option value="DELIVERED">배송완료</option>
           <option value="CANCELED">취소</option>
         </select>
       </div>

       <div class="admin-card" data-admin-orders-wrap>
         <p class="loading">불러오는 중...</p>
       </div>
     </section>
   `;
}

function renderPanelCoupons() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="coupons" aria-hidden="true">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">쿠폰/이벤트 관리</h2>
           <p class="admin-desc">운영용 쿠폰 Catalog를 관리합니다(로컬 기준)</p>
         </div>

         <div class="admin-head__actions">
           <button type="button" class="btn" data-admin-seed-coupons>더미 쿠폰 생성</button>
           <button type="button" class="btn primary" data-admin-add-coupon>+ 쿠폰 등록</button>
         </div>
       </div>

       <div class="admin-toolbar" aria-label="Coupons Toolbar">
         <input class="admin-input" type="text" placeholder="검색: 코드/타이틀" data-admin-coupon-q />
         <select class="admin-select" data-admin-coupon-active>
           <option value="ALL">상태(전체)</option>
           <option value="ACTIVE">활성</option>
           <option value="INACTIVE">비활성</option>
         </select>
       </div>

       <div class="admin-card" data-admin-coupons-wrap>
         <p class="loading">불러오는 중...</p>
       </div>

       <p class="admin-note muted">
         ※ 현재 storefront의 couponStore는 내부 카탈로그(상수) 기반입니다.
         운영 카탈로그를 storefront에 연결하려면 couponStore를 Catalog store로 교체하는 단계가 필요합니다.
       </p>
     </section>
   `;
}

function renderPanelAudit() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="audit" aria-hidden="true">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">감사 로그(Audit)</h2>
           <p class="admin-desc">관리자 액션(생성/수정/삭제/상태변경)을 기록합니다.</p>
         </div>

         <div class="admin-head__actions">
           <button type="button" class="btn" data-admin-clear-audit>로그 비우기</button>
           <button type="button" class="btn primary" data-admin-refresh-audit>새로고침</button>
         </div>
       </div>

       <div class="admin-card" data-admin-audit-wrap>
         <p class="loading">불러오는 중...</p>
       </div>
     </section>
   `;
}

function renderPanelBackup() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="backup" aria-hidden="true">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">백업/복구</h2>
           <p class="admin-desc">운영 데이터(products/coupons/audit/orders)를 JSON으로 내보내기/가져오기</p>
         </div>
       </div>

       <div class="admin-card">
         <div class="backup-actions">
           <button type="button" class="btn primary" data-admin-export>Export JSON</button>
           <button type="button" class="btn" data-admin-import>Import JSON</button>
         </div>

         <textarea class="backup-textarea" rows="12" placeholder="Export 결과(JSON)가 여기에 출력됩니다. Import 시 여기에 JSON을 붙여넣으세요." data-admin-backup-text></textarea>

         <p class="muted">
           - Export: 현재 로컬 데이터를 하나의 번들로 출력<br/>
           - Import: 번들 JSON을 읽어 복원(덮어쓰기)합니다
         </p>
       </div>
     </section>
   `;
}

/* ==============================
   3) Render helpers
============================== */

function formatKRW(n) {
   const v = Number(n || 0);
   const safe = Number.isFinite(v) ? v : 0;
   return new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.floor(safe)));
}

function fmtDate(ms) {
   const d = new Date(Number(ms || 0));
   if (Number.isNaN(d.getTime())) return '-';
   return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
   }).format(d);
}

function statusLabel(s) {
   const v = String(s || '').toUpperCase();
   if (v === 'PAID') return '결제완료';
   if (v === 'SHIPPING') return '배송중';
   if (v === 'DELIVERED') return '배송완료';
   if (v === 'CANCELED') return '취소';
   return '결제완료';
}

/* ==============================
   4) Modals
============================== */

function openFormModal({ title, fields, initial = {}, submitText = '저장' }) {
   return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'reve-modal-overlay admin-form-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      const renderField = (f) => {
         const key = f.key;
         const label = f.label;
         const type = f.type || 'text';
         const placeholder = f.placeholder || '';
         const value = initial?.[key] ?? '';
         const hint = f.hint
            ? `<p class="muted">${escapeHtml(f.hint)}</p>`
            : '';

         if (type === 'textarea') {
            return `
              <label class="form-field">
                <span class="k">${escapeHtml(label)}</span>
                <textarea rows="3" data-f="${escapeHtml(key)}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
                ${hint}
              </label>
            `;
         }

         if (type === 'select') {
            const opts = Array.isArray(f.options) ? f.options : [];
            return `
              <label class="form-field">
                <span class="k">${escapeHtml(label)}</span>
                <select data-f="${escapeHtml(key)}">
                  ${opts
                     .map((o) => {
                        const ov = String(o?.value ?? '');
                        const ot = String(o?.label ?? ov);
                        const selected = String(value) === ov ? 'selected' : '';
                        return `<option value="${escapeHtml(ov)}" ${selected}>${escapeHtml(ot)}</option>`;
                     })
                     .join('')}
                </select>
                ${hint}
              </label>
            `;
         }

         if (type === 'checkbox') {
            const checked = Boolean(value) ? 'checked' : '';
            return `
              <label class="form-field checkbox">
                <input type="checkbox" data-f="${escapeHtml(key)}" ${checked} />
                <span class="k">${escapeHtml(label)}</span>
                ${hint}
              </label>
            `;
         }

         return `
           <label class="form-field">
             <span class="k">${escapeHtml(label)}</span>
             <input type="${escapeHtml(type)}" data-f="${escapeHtml(key)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
             ${hint}
           </label>
         `;
      };

      overlay.innerHTML = `
        <div class="reve-modal admin-form-modal">
          <div class="reve-modal__header">
            <h3 class="reve-modal__title">${escapeHtml(title)}</h3>
            <button type="button" class="reve-modal__close" data-close aria-label="닫기">×</button>
          </div>

          <div class="reve-modal__body">
            <div class="form-grid">
              ${fields.map(renderField).join('')}
            </div>
          </div>

          <div class="reve-modal__footer">
            <button type="button" class="btn" data-cancel>취소</button>
            <button type="button" class="btn primary" data-submit>${escapeHtml(
               submitText,
            )}</button>
          </div>
        </div>
      `;

      const getValue = (key, type) => {
         const el = overlay.querySelector(`[data-f="${key}"]`);
         if (!el) return '';
         if (type === 'checkbox') return Boolean(el.checked);
         return String(el.value ?? '').trim();
      };

      const close = (result) => {
         document.body.classList.remove('is-modal-open');
         overlay.remove();
         resolve(result);
      };

      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) close(null);
         if (e.target.closest('[data-close]')) close(null);
         if (e.target.closest('[data-cancel]')) close(null);

         if (e.target.closest('[data-submit]')) {
            const out = {};
            fields.forEach((f) => {
               out[f.key] = getValue(f.key, f.type);
            });
            close(out);
         }
      });

      overlay.addEventListener('keydown', (e) => {
         if (e.key === 'Escape') close(null);
      });

      document.body.appendChild(overlay);
      document.body.classList.add('is-modal-open');

      setTimeout(() => {
         overlay.querySelector('[data-f]')?.focus?.();
      }, 0);
   });
}

/* ==============================
   5) Products UI
============================== */

function renderProductsTable(products) {
   if (!products.length) {
      return `
        <div class="empty">
          <p class="empty__title">상품이 없습니다.</p>
          <p class="empty__desc">상품 등록 버튼으로 새 상품을 추가하세요.</p>
        </div>
      `;
   }

   return `
     <div class="admin-table-wrap">
       <table class="admin-table" aria-label="Products Table">
         <thead>
           <tr>
             <th>ID</th>
             <th>이름</th>
             <th>대분류</th>
             <th>중분류</th>
             <th>가격</th>
             <th>상태</th>
             <th>수정일</th>
             <th>액션</th>
           </tr>
         </thead>
         <tbody>
           ${products
              .map((p) => {
                 return `
                   <tr data-admin-product-row="${escapeHtml(p.id)}">
                     <td><code>${escapeHtml(p.id)}</code></td>
                     <td>${escapeHtml(p.name)}</td>
                     <td>${escapeHtml(p.categoryMain || '-')}</td>
                     <td>${escapeHtml(p.categorySub || '-')}</td>
                     <td>₩ ${formatKRW(p.price)}</td>
                     <td>
                       <span class="pill ${p.active ? 'pill--on' : 'pill--off'}">
                         ${p.active ? 'ACTIVE' : 'INACTIVE'}
                       </span>
                     </td>
                     <td class="muted">${escapeHtml(fmtDate(p.updatedAt))}</td>
                     <td>
                       <div class="admin-row-actions">
                         <button type="button" class="btn small" data-admin-product-edit="${escapeHtml(
                            p.id,
                         )}">수정</button>
                         <button type="button" class="btn small subtle" data-admin-product-toggle="${escapeHtml(
                            p.id,
                         )}">${p.active ? '비활성' : '활성'}</button>
                         <button type="button" class="btn small danger" data-admin-product-delete="${escapeHtml(
                            p.id,
                         )}">삭제</button>
                       </div>
                     </td>
                   </tr>
                 `;
              })
              .join('')}
         </tbody>
       </table>
     </div>
   `;
}

function fillCategorySelects(root) {
   const mainSel = root.querySelector('[data-admin-product-main]');
   const subSel = root.querySelector('[data-admin-product-sub]');
   if (!mainSel || !subSel) return;

   const cats = adminProductStore.getCategories();
   const main = cats.main;
   const subByMain = cats.subByMain;

   // main options
   const currentMain = String(mainSel.value || '').trim();
   mainSel.innerHTML =
      `<option value="">대분류(전체)</option>` +
      main
         .map(
            (m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`,
         )
         .join('');

   mainSel.value = currentMain;

   // sub options depends on main
   const mKey = String(mainSel.value || '').trim();
   const subs = mKey ? subByMain[mKey] || [] : cats.subAll;

   const currentSub = String(subSel.value || '').trim();
   subSel.innerHTML =
      `<option value="">중분류(전체)</option>` +
      subs
         .map(
            (s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`,
         )
         .join('');

   // currentSub 유지 (없으면 초기화)
   if (subs.includes(currentSub)) subSel.value = currentSub;
   else subSel.value = '';
}

/* ==============================
   6) Orders UI
============================== */

function renderOrdersTable(orders) {
   if (!orders.length) {
      return `
        <div class="empty">
          <p class="empty__title">주문이 없습니다.</p>
          <p class="empty__desc">결제를 진행하면 주문이 생성됩니다.</p>
        </div>
      `;
   }

   return `
     <div class="admin-table-wrap">
       <table class="admin-table" aria-label="Orders Table">
         <thead>
           <tr>
             <th>주문번호</th>
             <th>유저</th>
             <th>상태</th>
             <th>결제</th>
             <th>생성일</th>
             <th>액션</th>
           </tr>
         </thead>
         <tbody>
           ${orders
              .map((o) => {
                 const owner = o.__ownerKey || 'unknown';
                 const s = String(o.status || 'PAID').toUpperCase();
                 return `
                   <tr data-admin-order-row="${escapeHtml(o.orderId)}">
                     <td><code>${escapeHtml(o.orderId)}</code></td>
                     <td><span class="pill">${escapeHtml(owner)}</span></td>
                     <td><span class="pill">${escapeHtml(statusLabel(s))}</span></td>
                     <td>₩ ${formatKRW(o?.pricing?.total || 0)}</td>
                     <td class="muted">${escapeHtml(fmtDate(o.createdAt))}</td>
                     <td>
                       <div class="admin-row-actions">
                         <button type="button" class="btn small subtle" data-admin-order-detail="${escapeHtml(
                            o.orderId,
                         )}">상세</button>
                         <button type="button" class="btn small" data-admin-order-next="${escapeHtml(
                            o.orderId,
                         )}" ${s === 'DELIVERED' || s === 'CANCELED' ? 'disabled' : ''}>
                           다음 상태
                         </button>
                         <button type="button" class="btn small danger" data-admin-order-cancel="${escapeHtml(
                            o.orderId,
                         )}" ${s === 'CANCELED' || s === 'DELIVERED' ? 'disabled' : ''}>
                           취소
                         </button>
                       </div>
                     </td>
                   </tr>
                 `;
              })
              .join('')}
         </tbody>
       </table>
     </div>
   `;
}

/* ==============================
   7) Coupons UI
============================== */

function renderCouponsTable(coupons) {
   if (!coupons.length) {
      return `
        <div class="empty">
          <p class="empty__title">쿠폰이 없습니다.</p>
          <p class="empty__desc">쿠폰 등록 버튼으로 새 쿠폰을 추가하세요.</p>
        </div>
      `;
   }

   return `
     <div class="admin-table-wrap">
       <table class="admin-table" aria-label="Coupons Table">
         <thead>
           <tr>
             <th>코드</th>
             <th>타이틀</th>
             <th>할인</th>
             <th>기간</th>
             <th>조건</th>
             <th>상태</th>
             <th>수정일</th>
             <th>액션</th>
           </tr>
         </thead>
         <tbody>
           ${coupons
              .map((c) => {
                 const pct = Math.round(Number(c.rate || 0) * 100);
                 const period = `${c.startsAt ? fmtDate(c.startsAt) : '-'} ~ ${
                    c.endsAt ? fmtDate(c.endsAt) : '-'
                 }`;
                 const cond = [
                    c.minOrderTotal
                       ? `최소 ₩${formatKRW(c.minOrderTotal)}`
                       : '최소금액 없음',
                    c.maxUses ? `최대 ${c.maxUses}회` : '사용제한 없음',
                 ].join(' · ');

                 return `
                   <tr data-admin-coupon-row="${escapeHtml(c.code)}">
                     <td><code>${escapeHtml(c.code)}</code></td>
                     <td>${escapeHtml(c.title)}</td>
                     <td>${pct}%</td>
                     <td class="muted">${escapeHtml(period)}</td>
                     <td class="muted">${escapeHtml(cond)}</td>
                     <td>
                       <span class="pill ${c.active ? 'pill--on' : 'pill--off'}">
                         ${c.active ? 'ACTIVE' : 'INACTIVE'}
                       </span>
                     </td>
                     <td class="muted">${escapeHtml(fmtDate(c.updatedAt))}</td>
                     <td>
                       <div class="admin-row-actions">
                         <button type="button" class="btn small" data-admin-coupon-edit="${escapeHtml(
                            c.code,
                         )}">수정</button>
                         <button type="button" class="btn small subtle" data-admin-coupon-toggle="${escapeHtml(
                            c.code,
                         )}">${c.active ? '비활성' : '활성'}</button>
                         <button type="button" class="btn small danger" data-admin-coupon-delete="${escapeHtml(
                            c.code,
                         )}">삭제</button>
                       </div>
                     </td>
                   </tr>
                 `;
              })
              .join('')}
         </tbody>
       </table>
     </div>
   `;
}

/* ==============================
   8) Audit UI
============================== */

function renderAuditList(rows) {
   const list = Array.isArray(rows) ? rows : [];
   if (!list.length) {
      return `
        <div class="empty">
          <p class="empty__title">로그가 없습니다.</p>
          <p class="empty__desc">관리자 액션을 실행하면 여기에 기록됩니다.</p>
        </div>
      `;
   }

   return `
     <ul class="audit-list" aria-label="Audit List">
       ${list
          .map((r) => {
             return `
               <li class="audit-item">
                 <div class="audit-item__top">
                   <span class="pill">${escapeHtml(r.action)}</span>
                   <span class="muted">${escapeHtml(fmtDate(r.at))}</span>
                 </div>
                 <p class="audit-item__msg">${escapeHtml(r.message)}</p>
                 ${
                    r.meta
                       ? `<pre class="audit-item__meta">${escapeHtml(
                            JSON.stringify(r.meta, null, 2),
                         )}</pre>`
                       : ''
                 }
               </li>
             `;
          })
          .join('')}
     </ul>
   `;
}

/* ==============================
   9) Init
============================== */

export function initAdminPage() {
   const root = document.querySelector('[data-admin]');
   if (!root) return;

   // ✅ 중복 바인딩 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const toast = initToast();

   const panels = {
      products: root.querySelector('[data-admin-panel="products"]'),
      orders: root.querySelector('[data-admin-panel="orders"]'),
      coupons: root.querySelector('[data-admin-panel="coupons"]'),
      audit: root.querySelector('[data-admin-panel="audit"]'),
      backup: root.querySelector('[data-admin-panel="backup"]'),
   };

   const productsWrap = root.querySelector('[data-admin-products-wrap]');
   const ordersWrap = root.querySelector('[data-admin-orders-wrap]');
   const couponsWrap = root.querySelector('[data-admin-coupons-wrap]');
   const auditWrap = root.querySelector('[data-admin-audit-wrap]');
   const backupText = root.querySelector('[data-admin-backup-text]');

   const productQ = root.querySelector('[data-admin-product-q]');
   const productMain = root.querySelector('[data-admin-product-main]');
   const productSub = root.querySelector('[data-admin-product-sub]');
   const productStatus = root.querySelector('[data-admin-product-status]');

   const orderQ = root.querySelector('[data-admin-order-q]');
   const orderStatus = root.querySelector('[data-admin-order-status]');

   const couponQ = root.querySelector('[data-admin-coupon-q]');
   const couponActive = root.querySelector('[data-admin-coupon-active]');

   /* ------------------------------
      A) Tab control
   ------------------------------ */

   const setActiveTab = (key) => {
      const next = String(key || 'products').trim();

      root.querySelectorAll('[data-admin-tab]').forEach((btn) => {
         const k = btn.getAttribute('data-admin-tab');
         const on = k === next;
         btn.classList.toggle('is-active', on);
         btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      Object.entries(panels).forEach(([k, el]) => {
         if (!el) return;
         const on = k === next;
         el.setAttribute('aria-hidden', on ? 'false' : 'true');
         el.classList.toggle('is-active', on);
      });

      return next;
   };

   /* ------------------------------
      B) Paint functions
   ------------------------------ */

   const state = {
      products: { q: '', main: '', sub: '', status: 'ALL' },
      orders: { q: '', status: 'ALL' },
      coupons: { q: '', active: 'ALL' },
   };

   const paintProducts = () => {
      if (!productsWrap) return;

      // select options sync
      fillCategorySelects(root);

      const list = adminProductStore.getProducts();
      const q = String(state.products.q || '').toLowerCase();
      const main = String(state.products.main || '').trim();
      const sub = String(state.products.sub || '').trim();
      const st = String(state.products.status || 'ALL').toUpperCase();

      const filtered = list.filter((p) => {
         const matchQ =
            !q ||
            String(p.name || '')
               .toLowerCase()
               .includes(q) ||
            String(p.id || '')
               .toLowerCase()
               .includes(q) ||
            String(p.categoryMain || '')
               .toLowerCase()
               .includes(q) ||
            String(p.categorySub || '')
               .toLowerCase()
               .includes(q);

         const matchMain = !main || p.categoryMain === main;
         const matchSub = !sub || p.categorySub === sub;

         const matchStatus =
            st === 'ALL'
               ? true
               : st === 'ACTIVE'
                 ? Boolean(p.active)
                 : !Boolean(p.active);

         return matchQ && matchMain && matchSub && matchStatus;
      });

      productsWrap.innerHTML = renderProductsTable(filtered);
   };

   const paintOrders = () => {
      if (!ordersWrap) return;

      const list = adminOrderStore.getAllOrders(); // includes __ownerKey
      const q = String(state.orders.q || '').toLowerCase();
      const st = String(state.orders.status || 'ALL').toUpperCase();

      const filtered = list.filter((o) => {
         const matchQ =
            !q ||
            String(o.orderId || '')
               .toLowerCase()
               .includes(q) ||
            String(o.__ownerKey || '')
               .toLowerCase()
               .includes(q) ||
            String(o.status || '')
               .toLowerCase()
               .includes(q);

         const matchStatus =
            st === 'ALL' ? true : String(o.status).toUpperCase() === st;
         return matchQ && matchStatus;
      });

      ordersWrap.innerHTML = renderOrdersTable(filtered);
   };

   const paintCoupons = () => {
      if (!couponsWrap) return;

      const list = adminCouponStore.getCoupons();
      const q = String(state.coupons.q || '').toLowerCase();
      const st = String(state.coupons.active || 'ALL').toUpperCase();

      const filtered = list.filter((c) => {
         const matchQ =
            !q ||
            String(c.code || '')
               .toLowerCase()
               .includes(q) ||
            String(c.title || '')
               .toLowerCase()
               .includes(q);

         const matchStatus =
            st === 'ALL'
               ? true
               : st === 'ACTIVE'
                 ? Boolean(c.active)
                 : !Boolean(c.active);

         return matchQ && matchStatus;
      });

      couponsWrap.innerHTML = renderCouponsTable(filtered);
   };

   const paintAudit = () => {
      if (!auditWrap) return;
      const rows = auditLog.list();
      auditWrap.innerHTML = renderAuditList(rows);
   };

   /* ------------------------------
      C) Initial paint + subscriptions
   ------------------------------ */

   // input -> state sync
   const syncFiltersFromDOM = () => {
      state.products.q = String(productQ?.value || '');
      state.products.main = String(productMain?.value || '');
      state.products.sub = String(productSub?.value || '');
      state.products.status = String(productStatus?.value || 'ALL');

      state.orders.q = String(orderQ?.value || '');
      state.orders.status = String(orderStatus?.value || 'ALL');

      state.coupons.q = String(couponQ?.value || '');
      state.coupons.active = String(couponActive?.value || 'ALL');
   };

   // default category select fill
   fillCategorySelects(root);

   paintProducts();
   paintOrders();
   paintCoupons();
   paintAudit();

   adminProductStore.subscribe(() => paintProducts());
   adminCouponStore.subscribe(() => paintCoupons());
   auditLog.subscribe(() => paintAudit());

   /* ------------------------------
      D) Events
   ------------------------------ */

   // input events
   root.addEventListener('input', (e) => {
      if (e.target.closest('[data-admin-product-q]')) {
         syncFiltersFromDOM();
         paintProducts();
         return;
      }
      if (e.target.closest('[data-admin-order-q]')) {
         syncFiltersFromDOM();
         paintOrders();
         return;
      }
      if (e.target.closest('[data-admin-coupon-q]')) {
         syncFiltersFromDOM();
         paintCoupons();
      }
   });

   root.addEventListener('change', (e) => {
      if (e.target.closest('[data-admin-product-main]')) {
         syncFiltersFromDOM();
         // main 변경 시 sub options 갱신
         fillCategorySelects(root);
         paintProducts();
         return;
      }
      if (
         e.target.closest('[data-admin-product-sub]') ||
         e.target.closest('[data-admin-product-status]')
      ) {
         syncFiltersFromDOM();
         paintProducts();
         return;
      }

      if (e.target.closest('[data-admin-order-status]')) {
         syncFiltersFromDOM();
         paintOrders();
         return;
      }

      if (e.target.closest('[data-admin-coupon-active]')) {
         syncFiltersFromDOM();
         paintCoupons();
      }
   });

   root.addEventListener('click', async (e) => {
      /* ==============================
         1) Tab change
      ============================== */
      const tabBtn = e.target.closest('[data-admin-tab]');
      if (tabBtn) {
         const key = tabBtn.getAttribute('data-admin-tab');
         setActiveTab(key);
         return;
      }

      /* ==============================
         2) Products actions
      ============================== */

      if (e.target.closest('[data-admin-product-reset]')) {
         if (productQ) productQ.value = '';
         if (productMain) productMain.value = '';
         fillCategorySelects(root);
         if (productSub) productSub.value = '';
         if (productStatus) productStatus.value = 'ALL';

         syncFiltersFromDOM();
         paintProducts();
         toast.show('필터를 초기화했습니다.', { duration: 1200 });
         return;
      }

      if (e.target.closest('[data-admin-seed-products]')) {
         const ok = await confirmModal({
            title: '더미 상품 생성',
            message: '더미 상품을 생성할까요? (기존 상품은 유지)',
            confirmText: '생성',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminProductStore.seed();
         if (r?.ok) {
            auditLog.add('PRODUCT_SEED', '더미 상품 생성', { count: r.count });
            toast.show(`더미 상품 ${r.count}개 생성`, { duration: 1400 });
         } else {
            toast.show(r?.message || '생성 실패', { duration: 1400 });
         }
         return;
      }

      if (e.target.closest('[data-admin-add-product]')) {
         const fields = [
            {
               key: 'id',
               label: '상품 ID',
               placeholder: 'prod_001 (고유)',
               hint: '고유값이어야 합니다.',
            },
            { key: 'name', label: '상품명', placeholder: '상품 이름' },
            {
               key: 'categoryMain',
               label: '대분류',
               placeholder: '예: 의류 / 신발 / 잡화',
            },
            {
               key: 'categorySub',
               label: '중분류',
               placeholder: '예: 후드 / 러닝화 / 가방',
            },
            {
               key: 'price',
               label: '판매가(원)',
               type: 'number',
               placeholder: '10000',
            },
            {
               key: 'basePrice',
               label: '정가(원)',
               type: 'number',
               placeholder: '12000',
               hint: '세일 전 가격(선택)',
            },
            { key: 'active', label: '활성', type: 'checkbox' },
            {
               key: 'couponEligible',
               label: '쿠폰 적용 가능',
               type: 'checkbox',
            },
            {
               key: 'apparelSizes',
               label: '의류 사이즈(쉼표)',
               placeholder: 'S,M,L',
            },
            {
               key: 'shoeSizes',
               label: '신발 사이즈(쉼표)',
               placeholder: '230,240,250',
            },
            {
               key: 'desc',
               label: '설명',
               type: 'textarea',
               placeholder: '상품 설명(선택)',
            },
         ];

         const form = await openFormModal({
            title: '상품 등록',
            fields,
            initial: { active: true, couponEligible: true },
            submitText: '등록',
         });
         if (!form) return;

         const v = validateProductDraft(form);
         if (!v.ok) {
            toast.show(v.message, { duration: 1600 });
            return;
         }

         const ok = await confirmModal({
            title: '상품 등록',
            message: '입력한 내용으로 상품을 등록할까요?',
            confirmText: '등록',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminProductStore.create(form);
         if (!r?.ok) {
            toast.show(r?.message || '등록 실패', { duration: 1600 });
            return;
         }

         auditLog.add('PRODUCT_CREATE', `상품 등록: ${form.id}`, {
            id: form.id,
         });
         toast.show('상품이 등록되었습니다.', { duration: 1200 });
         return;
      }

      const editBtn = e.target.closest('[data-admin-product-edit]');
      if (editBtn) {
         const id = String(
            editBtn.getAttribute('data-admin-product-edit') || '',
         ).trim();
         const current = adminProductStore.getProduct(id);
         if (!current) {
            toast.show('상품을 찾을 수 없습니다.', { duration: 1400 });
            return;
         }

         const fields = [
            {
               key: 'id',
               label: '상품 ID',
               placeholder: 'prod_001',
               hint: 'ID는 수정 불가',
               type: 'text',
            },
            { key: 'name', label: '상품명' },
            { key: 'categoryMain', label: '대분류' },
            { key: 'categorySub', label: '중분류' },
            { key: 'price', label: '판매가(원)', type: 'number' },
            { key: 'basePrice', label: '정가(원)', type: 'number' },
            { key: 'active', label: '활성', type: 'checkbox' },
            {
               key: 'couponEligible',
               label: '쿠폰 적용 가능',
               type: 'checkbox',
            },
            {
               key: 'apparelSizes',
               label: '의류 사이즈(쉼표)',
               placeholder: 'S,M,L',
            },
            {
               key: 'shoeSizes',
               label: '신발 사이즈(쉼표)',
               placeholder: '230,240,250',
            },
            { key: 'desc', label: '설명', type: 'textarea' },
         ];

         const form = await openFormModal({
            title: '상품 수정',
            fields,
            initial: {
               ...current,
               apparelSizes: (current.apparelSizes || []).join(','),
               shoeSizes: (current.shoeSizes || []).join(','),
            },
            submitText: '수정',
         });
         if (!form) return;

         // ID는 수정 금지
         form.id = current.id;

         const v = validateProductDraft(form, { allowIdExisting: true });
         if (!v.ok) {
            toast.show(v.message, { duration: 1600 });
            return;
         }

         const ok = await confirmModal({
            title: '상품 수정',
            message: '입력한 내용으로 수정할까요?',
            confirmText: '수정',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminProductStore.update(current.id, form);
         if (!r?.ok) {
            toast.show(r?.message || '수정 실패', { duration: 1600 });
            return;
         }

         auditLog.add('PRODUCT_UPDATE', `상품 수정: ${current.id}`, {
            id: current.id,
         });
         toast.show('상품이 수정되었습니다.', { duration: 1200 });
         return;
      }

      const toggleBtn = e.target.closest('[data-admin-product-toggle]');
      if (toggleBtn) {
         const id = String(
            toggleBtn.getAttribute('data-admin-product-toggle') || '',
         ).trim();
         const current = adminProductStore.getProduct(id);
         if (!current) return;

         const next = !Boolean(current.active);
         const ok = await confirmModal({
            title: '상품 상태 변경',
            message: `${current.name}\n상태를 ${next ? 'ACTIVE' : 'INACTIVE'}로 변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         adminProductStore.update(id, { active: next });
         auditLog.add('PRODUCT_TOGGLE', `상품 상태 변경: ${id}`, {
            id,
            active: next,
         });
         toast.show('상태가 변경되었습니다.', { duration: 1200 });
         return;
      }

      const delBtn = e.target.closest('[data-admin-product-delete]');
      if (delBtn) {
         const id = String(
            delBtn.getAttribute('data-admin-product-delete') || '',
         ).trim();
         const current = adminProductStore.getProduct(id);
         if (!current) return;

         const ok = await confirmModal({
            title: '상품 삭제',
            message: `"${current.name}" 상품을 삭제할까요?\n삭제 후 복구할 수 없습니다.`,
            confirmText: '삭제',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminProductStore.remove(id);
         if (!r?.ok) {
            toast.show(r?.message || '삭제 실패', { duration: 1600 });
            return;
         }

         auditLog.add('PRODUCT_DELETE', `상품 삭제: ${id}`, { id });
         toast.show('상품이 삭제되었습니다.', { duration: 1200 });
         return;
      }

      /* ==============================
         3) Orders actions
      ============================== */

      if (e.target.closest('[data-admin-refresh-orders]')) {
         paintOrders();
         toast.show('주문 목록을 갱신했습니다.', { duration: 1200 });
         return;
      }

      const detailOrder = e.target.closest('[data-admin-order-detail]');
      if (detailOrder) {
         const orderId = String(
            detailOrder.getAttribute('data-admin-order-detail') || '',
         ).trim();
         const order = adminOrderStore.getOrder(orderId);
         if (!order) {
            toast.show('주문을 찾을 수 없습니다.', { duration: 1400 });
            return;
         }

         const lines = [
            `주문번호: ${order.orderId}`,
            `유저: ${order.__ownerKey || '-'}`,
            `상태: ${statusLabel(order.status)}`,
            `결제: ₩ ${formatKRW(order?.pricing?.total || 0)}`,
            `배송비: ₩ ${formatKRW(order?.pricing?.shipping || 0)}`,
            `쿠폰: ${order?.coupon?.code || '없음'}`,
            `생성일: ${fmtDate(order.createdAt)}`,
         ].join('\n');

         await confirmModal({
            title: '주문 상세',
            message: lines,
            confirmText: '확인',
            cancelText: '닫기',
         });
         return;
      }

      const nextOrder = e.target.closest('[data-admin-order-next]');
      if (nextOrder) {
         const orderId = String(
            nextOrder.getAttribute('data-admin-order-next') || '',
         ).trim();
         const order = adminOrderStore.getOrder(orderId);
         if (!order) return;

         const currentStatus = String(order.status || 'PAID').toUpperCase();
         const nextStatus =
            currentStatus === 'PAID'
               ? 'SHIPPING'
               : currentStatus === 'SHIPPING'
                 ? 'DELIVERED'
                 : currentStatus;

         const v = validateOrderStatusTransition(currentStatus, nextStatus);
         if (!v.ok) {
            toast.show(v.message, { duration: 1500 });
            return;
         }

         const ok = await confirmModal({
            title: '주문 상태 변경',
            message: `주문(${orderId})\n${statusLabel(currentStatus)} → ${statusLabel(
               nextStatus,
            )}\n변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminOrderStore.updateOrderStatus(orderId, nextStatus);
         if (!r?.ok) {
            toast.show(r?.message || '변경 실패', { duration: 1600 });
            return;
         }

         auditLog.add('ORDER_STATUS', `주문 상태 변경: ${orderId}`, {
            orderId,
            from: currentStatus,
            to: nextStatus,
            owner: order.__ownerKey,
         });

         toast.show('주문 상태가 변경되었습니다.', { duration: 1200 });
         paintOrders();
         return;
      }

      const cancelOrder = e.target.closest('[data-admin-order-cancel]');
      if (cancelOrder) {
         const orderId = String(
            cancelOrder.getAttribute('data-admin-order-cancel') || '',
         ).trim();
         const order = adminOrderStore.getOrder(orderId);
         if (!order) return;

         const currentStatus = String(order.status || 'PAID').toUpperCase();
         const nextStatus = 'CANCELED';

         const v = validateOrderStatusTransition(currentStatus, nextStatus);
         if (!v.ok) {
            toast.show(v.message, { duration: 1500 });
            return;
         }

         const ok = await confirmModal({
            title: '주문 취소',
            message: `주문(${orderId})을 취소할까요?\n${statusLabel(currentStatus)} → ${statusLabel(
               nextStatus,
            )}`,
            confirmText: '취소',
            cancelText: '닫기',
         });
         if (!ok) return;

         const r = adminOrderStore.updateOrderStatus(orderId, nextStatus);
         if (!r?.ok) {
            toast.show(r?.message || '취소 실패', { duration: 1600 });
            return;
         }

         auditLog.add('ORDER_CANCEL', `주문 취소: ${orderId}`, {
            orderId,
            from: currentStatus,
            to: nextStatus,
            owner: order.__ownerKey,
         });

         toast.show('주문이 취소되었습니다.', { duration: 1200 });
         paintOrders();
         return;
      }

      /* ==============================
         4) Coupons actions
      ============================== */

      if (e.target.closest('[data-admin-seed-coupons]')) {
         const ok = await confirmModal({
            title: '더미 쿠폰 생성',
            message: '더미 쿠폰을 생성할까요? (기존 쿠폰은 유지)',
            confirmText: '생성',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminCouponStore.seed();
         if (r?.ok) {
            auditLog.add('COUPON_SEED', '더미 쿠폰 생성', { count: r.count });
            toast.show(`더미 쿠폰 ${r.count}개 생성`, { duration: 1400 });
         } else {
            toast.show(r?.message || '생성 실패', { duration: 1400 });
         }
         return;
      }

      if (e.target.closest('[data-admin-add-coupon]')) {
         const fields = [
            {
               key: 'code',
               label: '쿠폰 코드',
               placeholder: 'WELCOME10 (고유)',
               hint: '대문자 권장',
            },
            { key: 'title', label: '타이틀', placeholder: '첫 구매 10%' },
            {
               key: 'rate',
               label: '할인율(0~1)',
               type: 'number',
               placeholder: '0.1',
               hint: '0.1 = 10%',
            },
            { key: 'active', label: '활성', type: 'checkbox' },
            {
               key: 'startsAt',
               label: '시작일(ms, 선택)',
               type: 'number',
               placeholder: '',
            },
            {
               key: 'endsAt',
               label: '종료일(ms, 선택)',
               type: 'number',
               placeholder: '',
            },
            {
               key: 'minOrderTotal',
               label: '최소 주문금액(원, 선택)',
               type: 'number',
               placeholder: '',
            },
            {
               key: 'maxUses',
               label: '최대 사용횟수(선택)',
               type: 'number',
               placeholder: '',
            },
            {
               key: 'description',
               label: '설명(선택)',
               type: 'textarea',
               placeholder: '쿠폰 설명',
            },
         ];

         const form = await openFormModal({
            title: '쿠폰 등록',
            fields,
            initial: { active: true, rate: 0.1 },
            submitText: '등록',
         });
         if (!form) return;

         const v = validateCouponDraft(form);
         if (!v.ok) {
            toast.show(v.message, { duration: 1600 });
            return;
         }

         const ok = await confirmModal({
            title: '쿠폰 등록',
            message: '입력한 내용으로 쿠폰을 등록할까요?',
            confirmText: '등록',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminCouponStore.create(form);
         if (!r?.ok) {
            toast.show(r?.message || '등록 실패', { duration: 1600 });
            return;
         }

         auditLog.add('COUPON_CREATE', `쿠폰 등록: ${form.code}`, {
            code: form.code,
         });
         toast.show('쿠폰이 등록되었습니다.', { duration: 1200 });
         return;
      }

      const editCoupon = e.target.closest('[data-admin-coupon-edit]');
      if (editCoupon) {
         const code = String(
            editCoupon.getAttribute('data-admin-coupon-edit') || '',
         ).trim();
         const current = adminCouponStore.getCoupon(code);
         if (!current) {
            toast.show('쿠폰을 찾을 수 없습니다.', { duration: 1400 });
            return;
         }

         const fields = [
            { key: 'code', label: '쿠폰 코드', hint: '코드는 수정 불가' },
            { key: 'title', label: '타이틀' },
            { key: 'rate', label: '할인율(0~1)', type: 'number' },
            { key: 'active', label: '활성', type: 'checkbox' },
            { key: 'startsAt', label: '시작일(ms, 선택)', type: 'number' },
            { key: 'endsAt', label: '종료일(ms, 선택)', type: 'number' },
            {
               key: 'minOrderTotal',
               label: '최소 주문금액(원, 선택)',
               type: 'number',
            },
            { key: 'maxUses', label: '최대 사용횟수(선택)', type: 'number' },
            { key: 'description', label: '설명(선택)', type: 'textarea' },
         ];

         const form = await openFormModal({
            title: '쿠폰 수정',
            fields,
            initial: current,
            submitText: '수정',
         });
         if (!form) return;

         form.code = current.code;

         const v = validateCouponDraft(form, { allowCodeExisting: true });
         if (!v.ok) {
            toast.show(v.message, { duration: 1600 });
            return;
         }

         const ok = await confirmModal({
            title: '쿠폰 수정',
            message: '입력한 내용으로 수정할까요?',
            confirmText: '수정',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminCouponStore.update(current.code, form);
         if (!r?.ok) {
            toast.show(r?.message || '수정 실패', { duration: 1600 });
            return;
         }

         auditLog.add('COUPON_UPDATE', `쿠폰 수정: ${current.code}`, {
            code: current.code,
         });
         toast.show('쿠폰이 수정되었습니다.', { duration: 1200 });
         return;
      }

      const toggleCoupon = e.target.closest('[data-admin-coupon-toggle]');
      if (toggleCoupon) {
         const code = String(
            toggleCoupon.getAttribute('data-admin-coupon-toggle') || '',
         ).trim();
         const current = adminCouponStore.getCoupon(code);
         if (!current) return;

         const next = !Boolean(current.active);
         const ok = await confirmModal({
            title: '쿠폰 상태 변경',
            message: `${current.title}\n상태를 ${next ? 'ACTIVE' : 'INACTIVE'}로 변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         adminCouponStore.update(code, { active: next });
         auditLog.add('COUPON_TOGGLE', `쿠폰 상태 변경: ${code}`, {
            code,
            active: next,
         });
         toast.show('상태가 변경되었습니다.', { duration: 1200 });
         return;
      }

      const delCoupon = e.target.closest('[data-admin-coupon-delete]');
      if (delCoupon) {
         const code = String(
            delCoupon.getAttribute('data-admin-coupon-delete') || '',
         ).trim();
         const current = adminCouponStore.getCoupon(code);
         if (!current) return;

         const ok = await confirmModal({
            title: '쿠폰 삭제',
            message: `"${current.title}" 쿠폰을 삭제할까요?\n삭제 후 복구할 수 없습니다.`,
            confirmText: '삭제',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = adminCouponStore.remove(code);
         if (!r?.ok) {
            toast.show(r?.message || '삭제 실패', { duration: 1600 });
            return;
         }

         auditLog.add('COUPON_DELETE', `쿠폰 삭제: ${code}`, { code });
         toast.show('쿠폰이 삭제되었습니다.', { duration: 1200 });
         return;
      }

      /* ==============================
         5) Audit actions
      ============================== */

      if (e.target.closest('[data-admin-refresh-audit]')) {
         paintAudit();
         toast.show('감사 로그를 갱신했습니다.', { duration: 1200 });
         return;
      }

      if (e.target.closest('[data-admin-clear-audit]')) {
         const ok = await confirmModal({
            title: '로그 비우기',
            message: '감사 로그를 모두 삭제할까요?',
            confirmText: '삭제',
            cancelText: '취소',
         });
         if (!ok) return;

         auditLog.clear();
         toast.show('감사 로그를 비웠습니다.', { duration: 1200 });
         return;
      }

      /* ==============================
         6) Backup actions
      ============================== */

      if (e.target.closest('[data-admin-export]')) {
         const bundle = exportAdminBundle();
         const json = JSON.stringify(bundle, null, 2);
         if (backupText) backupText.value = json;

         auditLog.add('EXPORT', '관리자 데이터 Export', {
            products: bundle.products?.items?.length || 0,
            coupons: bundle.coupons?.items?.length || 0,
            audit: bundle.audit?.items?.length || 0,
            orders: bundle.orders?.total || 0,
         });

         toast.show('Export JSON을 생성했습니다.', { duration: 1200 });
         return;
      }

      if (e.target.closest('[data-admin-import]')) {
         const raw = String(backupText?.value || '').trim();
         if (!raw) {
            toast.show('Import할 JSON을 붙여넣어 주세요.', { duration: 1500 });
            return;
         }

         let parsed = null;
         try {
            parsed = JSON.parse(raw);
         } catch {
            toast.show('JSON 파싱에 실패했습니다.', { duration: 1600 });
            return;
         }

         const ok = await confirmModal({
            title: 'Import (덮어쓰기)',
            message:
               'Import를 실행하면 현재 관리자 데이터가 덮어쓰기됩니다.\n진행할까요?',
            confirmText: 'Import',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = importAdminBundle(parsed);
         if (!r?.ok) {
            toast.show(r.message || 'Import 실패', { duration: 1600 });
            return;
         }

         auditLog.add('IMPORT', '관리자 데이터 Import', {
            restored: r.restored,
         });
         toast.show('Import 완료', { duration: 1200 });

         // repaint
         fillCategorySelects(root);
         paintProducts();
         paintCoupons();
         paintOrders();
         paintAudit();
      }
   });
}
