/**
 * =============================================
 * 📍 위치: src/pages/admin/index.js
 * 역할: 관리자(Admin) 페이지 엔트리 + 운영 탭 UI
 * 경로: /admin (app.js에서 requireAdmin 가드 적용됨)
 *
 * ✅ 이번 패치(첨부파일 업로드 + 최신순 + 모달 UX 정리 + 가격 자동계산)
 * - 상품 등록/수정: 이미지 URL + 파일 첨부 둘 다 지원
 * - 파일 첨부 시 DataURL(base64)로 변환하여 image 필드에 자동 반영
 * - 최신순 정렬(기본): updatedAt → createdAt 내림차순
 * - 상품 등록 모달: 섹션(그룹) 구조로 입력 폼 가독성 개선
 * - 판매가(price) + 할인율(discountRate) 입력 시 정가(basePrice) 자동 계산
 *
 * ⚠️ 주의
 * - LocalStorage에 base64 이미지를 저장하므로 용량 제한이 있음(브라우저마다 다름).
 *   기본 2MB 제한을 걸어둠. (Firebase 연결 시 업로드 방식으로 교체 추천)
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
import { toStatusTimeline, statusKo } from '../../utils/orderTimeline.js';

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
           ${renderTimeline()}
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
   { key: 'timeline', label: '주문 타임라인', enabled: true },
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
function renderTimeline() {
   return `
     <section class="admin-panel" role="tabpanel" data-admin-panel="timeline" aria-hidden="true">
       <div class="admin-head">
         <div>
           <h2 class="admin-title">주문 타임라인</h2>
           <p class="admin-desc">전체 주문의 상태 변경 이력을 모아서 봅니다.</p>
         </div>

         <div class="admin-head__actions">
           <button type="button" class="btn" data-admin-refresh-timeline>새로고침</button>
         </div>
       </div>

       <div class="admin-card" data-admin-timeline-wrap>
         <p class="loading">불러오는 중...</p>
       </div>
     </section>
   `;
}

function renderTimelineList(rows) {
   if (!rows.length) {
      return `
        <div class="empty">
          <p class="empty__title">타임라인이 없습니다.</p>
          <p class="empty__desc">주문 상태가 변경되면 이력이 쌓입니다.</p>
        </div>
      `;
   }

   return `
     <ul class="audit-list" aria-label="Timeline List">
       ${rows
          .map((r) => {
             return `
               <li class="audit-item">
                 <div class="audit-item__top">
                   <span class="pill">${escapeHtml(r.orderId)}</span>
                   <span class="muted">${escapeHtml(fmtDate(r.at))}</span>
                 </div>
                 <p class="audit-item__msg">
                   <strong>${escapeHtml(r.owner || '-')}</strong> · ${escapeHtml(
                      statusKo(r.status) || statusLabel(r.status),
                   )}
                 </p>
               </li>
             `;
          })
          .join('')}
     </ul>
   `;
}

function buildTimelineRowsFromOrders(orders) {
   const list = Array.isArray(orders) ? orders : [];

   const rows = list.flatMap((o) => {
      const timeline = toStatusTimeline(o?.statusHistory);
      return timeline.map((t) => ({
         orderId: o.orderId,
         owner: o.__ownerKey,
         status: t.status,
         at: t.at,
      }));
   });

   // 최신순
   return rows.sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
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
   ✅ (중요) 주문 상세에서 statusHistory 표준 처리
   - orderStore(객체) / 혹시 다른 형태여도 toStatusTimeline이 흡수
============================== */

function buildAdminOrderDetailLines(order) {
   const lines = [
      `주문번호: ${order.orderId}`,
      `유저: ${order.__ownerKey || '-'}`,
      `상태: ${statusLabel(order.status)}`,
      `결제: ₩ ${formatKRW(order?.pricing?.total || 0)}`,
      `배송비: ₩ ${formatKRW(order?.pricing?.shipping || 0)}`,
      `쿠폰: ${order?.coupon?.code || '없음'}`,
      `생성일: ${fmtDate(order.createdAt)}`,
   ];

   const rows = toStatusTimeline(order?.statusHistory);
   if (rows.length) {
      lines.push('');
      lines.push('상태 이력:');
      rows.forEach((r, idx) => {
         lines.push(`${idx + 1}. ${statusKo(r.status)} (${fmtDate(r.at)})`);
      });
   } else {
      lines.push('');
      lines.push('상태 이력: 없음');
   }

   return lines.join('\n');
}

/* ==============================
   4) Category + Image helpers
============================== */

function getAdminCategoryOptions() {
   const cats = adminProductStore.getCategories();
   const mainOptions = (cats.main || []).map((m) => ({ value: m, label: m }));
   const subAllOptions = (cats.subAll || []).map((s) => ({
      value: s,
      label: s,
   }));
   return { cats, mainOptions, subAllOptions };
}

function buildPlaceholderImage({ id, categoryMain, categorySub }) {
   const text = encodeURIComponent(
      `${categoryMain || 'product'}${categorySub ? `/${categorySub}` : ''}\n${id || ''}`,
   );
   return `https://placehold.co/800x800?text=${text}`;
}

function readFileAsDataUrl(file) {
   return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
   });
}

function getFileFromInput(el) {
   if (!el) return null;
   const files = el.files;
   if (!files || !files.length) return null;
   return files[0] || null;
}

/* ==============================
   4.5) Brand/Tags helpers
============================== */

function slugifyBrand(brand) {
   return String(brand || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9가-힣]/g, '');
}

function uniq(arr) {
   return Array.from(new Set((arr || []).filter(Boolean)));
}

function buildTagsFromForm(form) {
   const brand = String(form?.brand || '').trim();
   const tags = [];

   if (brand) {
      tags.push(brand);
      tags.push(brand.toLowerCase());
   }

   if (form?.isHot) tags.push('HOT');
   if (form?.isBest) tags.push('베스트');
   if (form?.isNew) tags.push('신상');

   if (form?.categoryMain) tags.push(form.categoryMain);
   if (form?.categorySub) tags.push(form.categorySub);

   return uniq(tags);
}

function getNextIdByBrandSlug(brandSlug) {
   const list = adminProductStore.getProducts();
   const nums = list
      .map((p) => String(p.id || ''))
      .filter((id) => id.startsWith(`${brandSlug}-`))
      .map((id) => Number(id.split('-').pop()))
      .filter((n) => Number.isFinite(n));

   const max = nums.length ? Math.max(...nums) : 0;
   return `${brandSlug}-${max + 1}`;
}

/* ==============================
   4.6) Price auto-calc (NEW)
   - price + discountRate -> basePrice
============================== */

function mountPriceAutoCalc(overlay) {
   const priceEl = overlay.querySelector('[data-f="price"]');
   const rateEl = overlay.querySelector('[data-f="discountRate"]');
   const baseEl = overlay.querySelector('[data-f="basePrice"]');
   if (!priceEl || !rateEl || !baseEl) return;

   let userTouchedBase = false;
   const roundTo10 = (n) => Math.round(n / 10) * 10;

   const computeBase = () => {
      if (userTouchedBase) return;

      const price = Number(priceEl.value || 0);
      const rate = Number(rateEl.value || 0);

      if (!Number.isFinite(price) || price <= 0) return;

      if (!Number.isFinite(rate) || rate <= 0) {
         baseEl.value = String(Math.floor(price));
         return;
      }

      const safeRate = Math.max(0, Math.min(0.99, rate));
      const denom = 1 - safeRate;
      if (denom <= 0) return;

      const base = price / denom;
      if (!Number.isFinite(base) || base <= 0) return;

      baseEl.value = String(roundTo10(base));
   };

   baseEl.addEventListener('input', () => {
      userTouchedBase = String(baseEl.value || '').trim() !== '';
   });

   priceEl.addEventListener('input', computeBase);
   rateEl.addEventListener('input', computeBase);

   computeBase();
}

/* ==============================
   4.7) Product fields builder (NEW)
   - 모달 구조 섹션화
============================== */

function buildProductFields({ mainOptions, subAllOptions, brands, isEdit }) {
   const brandOptions = [
      { value: '', label: '선택' },
      ...(brands || []).map((b) => ({ value: b, label: b })),
   ];

   return [
      { type: 'section', label: '기본 정보' },
      {
         key: 'id',
         label: '상품 ID',
         placeholder: 'prod_001 (고유)',
         hint: isEdit ? 'ID는 수정 불가' : '고유값이어야 합니다.',
         type: 'text',
      },
      { key: 'name', label: '상품명', placeholder: '상품 이름' },
      {
         key: 'brand',
         label: '브랜드',
         type: 'select',
         options: brandOptions,
         hint: '브랜드 선택 시 ID 추천값이 자동으로 채워집니다.',
      },

      { type: 'section', label: '분류' },
      {
         key: 'categoryMain',
         label: '대분류',
         type: 'select',
         options: [{ value: '', label: '선택' }, ...mainOptions],
         hint: '대분류 선택 시 중분류 옵션이 자동으로 변경됩니다.',
      },
      {
         key: 'categorySub',
         label: '중분류',
         type: 'select',
         options: [{ value: '', label: '선택' }, ...subAllOptions],
      },

      {
         type: 'section',
         label: '가격/할인',
         hint: '판매가 + 할인율 입력 시 정가가 자동 계산됩니다.',
      },
      {
         key: 'price',
         label: '판매가(원)',
         type: 'number',
         placeholder: '10000',
      },
      {
         key: 'discountRate',
         label: '할인율(0~1)',
         type: 'number',
         placeholder: '0.2',
         hint: '0.2 = 20% (0~1 사이 값만 허용)',
      },
      {
         key: 'basePrice',
         label: '정가(원)',
         type: 'number',
         placeholder: '12000',
         hint: '직접 입력하면 자동 계산이 멈춥니다.',
      },

      { type: 'section', label: '이미지' },
      {
         key: 'image',
         label: '이미지 URL(선택)',
         placeholder: 'https://... 또는 비워두기',
         hint: '파일 첨부가 있으면 URL보다 파일이 우선됩니다.',
      },
      {
         key: 'imageFile',
         label: '이미지 파일 첨부(선택)',
         type: 'file',
         accept: 'image/*',
         hint: '최대 2MB 권장. (Firebase 연결 시 업로드 방식으로 교체 가능)',
      },

      { type: 'section', label: '옵션/상태' },
      { key: 'active', label: '활성', type: 'checkbox' },
      { key: 'couponEligible', label: '쿠폰 적용 가능', type: 'checkbox' },

      { type: 'section', label: '사이즈/설명' },
      { key: 'apparelSizes', label: '의류 사이즈(쉼표)', placeholder: 'S,M,L' },
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

      ...(isEdit
         ? []
         : [
              { type: 'section', label: '운영 태그(자동 생성용)' },
              { key: 'isHot', label: 'HOT', type: 'checkbox' },
              { key: 'isBest', label: '베스트', type: 'checkbox' },
              { key: 'isNew', label: '신상', type: 'checkbox' },
           ]),
   ];
}

/* ==============================
   5) Modals
   - section type 지원(모달 폼 구조 정리)
============================== */

function openFormModal({
   title,
   fields,
   initial = {},
   submitText = '저장',
   onMount,
}) {
   return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'reve-modal-overlay admin-form-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      const renderField = (f) => {
         if (f.type === 'section') {
            return `
              <div class="form-section">
                <h4 class="form-section__title">${escapeHtml(f.label || '')}</h4>
                ${
                   f.hint
                      ? `<p class="form-section__hint muted">${escapeHtml(
                           f.hint,
                        )}</p>`
                      : ''
                }
              </div>
            `;
         }

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
                <textarea rows="3" data-f="${escapeHtml(
                   key,
                )}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(
                   value,
                )}</textarea>
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
                        return `<option value="${escapeHtml(
                           ov,
                        )}" ${selected}>${escapeHtml(ot)}</option>`;
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

         if (type === 'file') {
            const accept = String(f.accept || 'image/*');
            return `
              <label class="form-field">
                <span class="k">${escapeHtml(label)}</span>
                <input type="file" data-f="${escapeHtml(
                   key,
                )}" accept="${escapeHtml(accept)}" />
                ${hint}
              </label>
            `;
         }

         return `
           <label class="form-field">
             <span class="k">${escapeHtml(label)}</span>
             <input
               type="${escapeHtml(type)}"
               data-f="${escapeHtml(key)}"
               value="${escapeHtml(value)}"
               placeholder="${escapeHtml(placeholder)}"
             />
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

      try {
         if (typeof onMount === 'function') onMount(overlay);
      } catch (e) {
         console.warn('[admin] onMount failed:', e);
      }

      const mainSel = overlay.querySelector('[data-f="categoryMain"]');
      const subSel = overlay.querySelector('[data-f="categorySub"]');

      if (mainSel && subSel) {
         const cats = adminProductStore.getCategories();

         const renderSubs = (main) => {
            const m = String(main || '').trim();
            const list = m ? cats.subByMain?.[m] || [] : cats.subAll || [];

            subSel.innerHTML =
               `<option value="">선택</option>` +
               list
                  .map(
                     (s) =>
                        `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`,
                  )
                  .join('');
         };

         renderSubs(String(mainSel.value || '').trim());

         const initSub = String(initial?.categorySub || '').trim();
         if (initSub) subSel.value = initSub;

         mainSel.addEventListener('change', () => {
            renderSubs(String(mainSel.value || '').trim());
            subSel.value = '';
         });
      }

      const getValue = (key, type) => {
         const el = overlay.querySelector(`[data-f="${key}"]`);
         if (!el) return '';
         if (type === 'checkbox') return Boolean(el.checked);
         if (type === 'file') return '';
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
               if (f.type === 'section') return;
               out[f.key] = getValue(f.key, f.type);
            });

            out.__fileInputs = {};
            fields
               .filter((f) => f.type === 'file')
               .forEach((f) => {
                  out.__fileInputs[f.key] = overlay.querySelector(
                     `[data-f="${f.key}"]`,
                  );
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
   6) Products UI
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
   const main = cats.main || [];
   const subByMain = cats.subByMain || {};

   const currentMain = String(mainSel.value || '').trim();
   mainSel.innerHTML =
      `<option value="">대분류(전체)</option>` +
      main
         .map(
            (m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`,
         )
         .join('');
   mainSel.value = currentMain;

   const mKey = String(mainSel.value || '').trim();
   const subs = mKey ? subByMain[mKey] || [] : cats.subAll || [];

   const currentSub = String(subSel.value || '').trim();
   subSel.innerHTML =
      `<option value="">중분류(전체)</option>` +
      subs
         .map(
            (s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`,
         )
         .join('');

   if (subs.includes(currentSub)) subSel.value = currentSub;
   else subSel.value = '';
}

/* ==============================
   7) Orders UI
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
                         <button
                           type="button"
                           class="btn small danger"
                           data-admin-order-cancel="${escapeHtml(o.orderId)}"
                           ${s !== 'PAID' ? 'disabled' : ''}
                         >
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
   8) Coupons UI
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
   9) Audit UI
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
   10) Init
============================== */

export function initAdminPage() {
   const root = document.querySelector('[data-admin]');
   if (!root) return;

   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const toast = initToast();

   const panels = {
      products: root.querySelector('[data-admin-panel="products"]'),
      orders: root.querySelector('[data-admin-panel="orders"]'),
      coupons: root.querySelector('[data-admin-panel="coupons"]'),
      audit: root.querySelector('[data-admin-panel="audit"]'),
      backup: root.querySelector('[data-admin-panel="backup"]'),
      timeline: root.querySelector('[data-admin-panel="timeline"]'),
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
   const timelineWrap = root.querySelector('[data-admin-timeline-wrap]');
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

   const state = {
      products: { q: '', main: '', sub: '', status: 'ALL' },
      orders: { q: '', status: 'ALL' },
      coupons: { q: '', active: 'ALL' },
   };

   const sortProductsLatestFirst = (list) => {
      const arr = Array.isArray(list) ? [...list] : [];
      return arr.sort((a, b) => {
         const at = Number(a?.updatedAt || 0) || 0;
         const bt = Number(b?.updatedAt || 0) || 0;
         if (bt !== at) return bt - at;
         return (
            (Number(b?.createdAt || 0) || 0) - (Number(a?.createdAt || 0) || 0)
         );
      });
   };

   const paintProducts = () => {
      if (!productsWrap) return;

      fillCategorySelects(root);

      const list = sortProductsLatestFirst(adminProductStore.getProducts());
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

      const list = adminOrderStore.getAllOrders();
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
   const paintTimeline = () => {
      if (!timelineWrap) return;
      const orders = adminOrderStore.getAllOrders();
      const rows = buildTimelineRowsFromOrders(orders);
      timelineWrap.innerHTML = renderTimelineList(rows);
   };
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

   fillCategorySelects(root);

   paintProducts();
   paintOrders();
   paintCoupons();
   paintAudit();
   paintTimeline();
   adminProductStore.subscribe(() => paintProducts());
   adminCouponStore.subscribe(() => paintCoupons());
   auditLog.subscribe(() => paintAudit());

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
      const tabBtn = e.target.closest('[data-admin-tab]');
      if (tabBtn) {
         const key = tabBtn.getAttribute('data-admin-tab');
         setActiveTab(key);
         return;
      }

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

         const r = await adminProductStore.seed();
         if (r?.ok) {
            auditLog.add('PRODUCT_SEED', '더미 상품 생성', { count: r.count });
            toast.show(`더미 상품 ${r.count}개 생성`, { duration: 1400 });
         } else {
            toast.show(r?.message || '생성 실패', { duration: 1400 });
         }
         return;
      }
      if (e.target.closest('[data-admin-refresh-timeline]')) {
         paintTimeline();
         toast.show('타임라인을 갱신했습니다.', { duration: 1200 });
         return;
      }
      /* ---------
         Add Product
      --------- */
      if (e.target.closest('[data-admin-add-product]')) {
         const { mainOptions, subAllOptions } = getAdminCategoryOptions();

         const brands = uniq(
            adminProductStore
               .getProducts()
               .map((p) => String(p.brand || '').trim()),
         )
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

         const fields = buildProductFields({
            mainOptions,
            subAllOptions,
            brands,
            isEdit: false,
         });

         const form = await openFormModal({
            title: '상품 등록',
            fields,
            initial: { active: true, couponEligible: true, discountRate: 0 },
            submitText: '등록',
            onMount: (overlay) => {
               const brandEl = overlay.querySelector('[data-f="brand"]');
               const idEl = overlay.querySelector('[data-f="id"]');

               if (brandEl && idEl) {
                  const updateIdPreview = () => {
                     const brand = String(brandEl.value || '').trim();
                     if (!brand) return;

                     const typed = String(idEl.value || '').trim();
                     if (typed) return;

                     const slug = slugifyBrand(brand);
                     idEl.value = getNextIdByBrandSlug(slug);
                  };

                  brandEl.addEventListener('change', updateIdPreview);
                  updateIdPreview();
               }

               mountPriceAutoCalc(overlay);
            },
         });
         if (!form) return;

         const fileEl = form.__fileInputs?.imageFile;
         const file = getFileFromInput(fileEl);

         if (file) {
            const maxBytes = 2 * 1024 * 1024;
            if (file.size > maxBytes) {
               toast.show('이미지 파일은 2MB 이하로 올려주세요.', {
                  duration: 1600,
               });
               return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            if (!dataUrl) {
               toast.show('이미지 파일을 읽지 못했습니다.', { duration: 1600 });
               return;
            }
            form.image = dataUrl;
         }

         delete form.__fileInputs;
         delete form.imageFile;

         form.brand = String(form.brand || '').trim();

         if (!String(form.id || '').trim() && form.brand) {
            const slug = slugifyBrand(form.brand);
            form.id = getNextIdByBrandSlug(slug);
         }

         form.tags = buildTagsFromForm(form);

         delete form.isHot;
         delete form.isBest;
         delete form.isNew;

         const url = String(form.image || '').trim();
         if (
            url &&
            !url.startsWith('data:image/') &&
            !url.startsWith('blob:') &&
            !url.startsWith('http://') &&
            !url.startsWith('https://') &&
            !url.startsWith('/') &&
            !url.startsWith('./') &&
            !url.startsWith('../')
         ) {
            toast.show('이미지 URL 형식이 올바르지 않습니다.', {
               duration: 1600,
            });
            return;
         }

         const drRaw = String(form.discountRate ?? '').trim();
         const dr = drRaw === '' ? 0 : Number(drRaw);
         form.discountRate = Number.isFinite(dr) ? dr : 0;

         const priceNum = Number(form.price ?? 0);
         const baseRaw = String(form.basePrice ?? '').trim();
         const hasBase = baseRaw !== '';

         if (
            form.discountRate > 0 &&
            !hasBase &&
            Number.isFinite(priceNum) &&
            priceNum > 0
         ) {
            const denom = 1 - form.discountRate;
            if (denom > 0) form.basePrice = Math.round(priceNum / denom);
         }

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

         if (!String(form.image || '').trim()) {
            form.image = buildPlaceholderImage({
               id: form.id,
               categoryMain: form.categoryMain,
               categorySub: form.categorySub,
            });
         }

         const r = await adminProductStore.create(form);
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

      /* ---------
         Edit Product
      --------- */
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

         const { mainOptions, subAllOptions } = getAdminCategoryOptions();

         const brands = uniq(
            adminProductStore
               .getProducts()
               .map((p) => String(p.brand || '').trim()),
         )
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

         const fields = buildProductFields({
            mainOptions,
            subAllOptions,
            brands,
            isEdit: true,
         });

         const form = await openFormModal({
            title: '상품 수정',
            fields,
            initial: {
               ...current,
               apparelSizes: (current.apparelSizes || []).join(','),
               shoeSizes: (current.shoeSizes || []).join(','),
            },
            submitText: '수정',
            onMount: (overlay) => {
               const idEl = overlay.querySelector('[data-f="id"]');
               if (idEl) idEl.setAttribute('disabled', 'disabled');
               mountPriceAutoCalc(overlay);
            },
         });
         if (!form) return;

         form.id = current.id;

         const fileEl = form.__fileInputs?.imageFile;
         const file = getFileFromInput(fileEl);

         if (file) {
            const maxBytes = 2 * 1024 * 1024;
            if (file.size > maxBytes) {
               toast.show('이미지 파일은 2MB 이하로 올려주세요.', {
                  duration: 1600,
               });
               return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            if (!dataUrl) {
               toast.show('이미지 파일을 읽지 못했습니다.', { duration: 1600 });
               return;
            }
            form.image = dataUrl;
         }

         delete form.__fileInputs;
         delete form.imageFile;

         const url = String(form.image || '').trim();
         if (
            url &&
            !url.startsWith('data:image/') &&
            !url.startsWith('blob:') &&
            !url.startsWith('http://') &&
            !url.startsWith('https://') &&
            !url.startsWith('/') &&
            !url.startsWith('./') &&
            !url.startsWith('../')
         ) {
            toast.show('이미지 URL 형식이 올바르지 않습니다.', {
               duration: 1600,
            });
            return;
         }

         const drRaw = String(form.discountRate ?? '').trim();
         const dr = drRaw === '' ? 0 : Number(drRaw);
         form.discountRate = Number.isFinite(dr) ? dr : 0;

         const priceNum = Number(form.price ?? 0);
         const baseRaw = String(form.basePrice ?? '').trim();
         const hasBase = baseRaw !== '';

         if (
            form.discountRate > 0 &&
            !hasBase &&
            Number.isFinite(priceNum) &&
            priceNum > 0
         ) {
            const denom = 1 - form.discountRate;
            if (denom > 0) form.basePrice = Math.round(priceNum / denom);
         }

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

         if (!String(form.image || '').trim()) {
            form.image = buildPlaceholderImage({
               id: form.id,
               categoryMain: form.categoryMain,
               categorySub: form.categorySub,
            });
         }

         const r = await adminProductStore.update(current.id, form);
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

      /* ---------
         Toggle Product
      --------- */
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

         await adminProductStore.update(id, { active: next });
         auditLog.add('PRODUCT_TOGGLE', `상품 상태 변경: ${id}`, {
            id,
            active: next,
         });
         toast.show('상태가 변경되었습니다.', { duration: 1200 });
         return;
      }

      /* ---------
         Delete Product
      --------- */
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

         const r = await adminProductStore.remove(id);
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

      // ✅ 여기: 네가 원했던 “주문 상세 모달” 교체 버전
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

         await confirmModal({
            title: '주문 상세',
            message: buildAdminOrderDetailLines(order),
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
            message: `주문(${orderId})\n${statusLabel(currentStatus)} → ${statusLabel(nextStatus)}\n변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });
         if (!ok) return;

         const r = await adminOrderStore.updateOrderStatus(orderId, nextStatus);
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
            message: `주문(${orderId})을 취소할까요?\n${statusLabel(currentStatus)} → ${statusLabel(nextStatus)}`,
            confirmText: '취소',
            cancelText: '닫기',
         });
         if (!ok) return;

         const r = await adminOrderStore.updateOrderStatus(orderId, nextStatus);
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

         const r = await adminCouponStore.seed();
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
            title: '쿠폰 등록',
            fields,
            initial: { active: true, rate: 0.1 },
            submitText: '등록',
         });
         if (!form) return;

         delete form.__fileInputs;

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

         const r = await adminCouponStore.create(form);
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
         delete form.__fileInputs;

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

         const r = await adminCouponStore.update(current.code, form);
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

         await adminCouponStore.update(code, { active: next });
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

         const r = await adminCouponStore.remove(code);
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

         fillCategorySelects(root);
         paintProducts();
         paintCoupons();
         paintOrders();
         paintAudit();
      }
   });
}

/* =========================================================
   ⚠️ renderTimeline()는 네 프로젝트에 이미 존재한다고 가정
   - 이 파일에 실제 정의가 있다면 그대로 두면 됨
   - 만약 없다면, 여기 아래에 정의를 추가해야 함
========================================================= */
