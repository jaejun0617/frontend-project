/**
 * =============================================
 * 📍 위치: src/pages/product/index.js
 * 역할: 상품(Product) 리스트 페이지
 * - ProductCard 렌더링
 * - 상품 리스트에서 "담김 상태" 유지(아이콘 빨강 등)
 * - 사이즈 pill 선택 상태를 카드 dataset에 저장 (기본 선택 ❌)
 *
 * ✅ 기능(필터/정렬/페이지네이션)
 * - 가격대(min/max) 입력 필터
 * - 정렬(최신/가격↑/가격↓/HOT/베스트)
 * - 페이지네이션(기본 20개/페이지)
 * - URL 쿼리 동기화 (?min=&max=&sort=&page=)
 *
 * ✅ UX 정책
 * - 초기 진입 시: 필터를 "적용"하지 않아도 20개가 바로 보여야 함
 * - 정렬/가격 입력은 "즉시" 리스트에 반영 (page=1로 리셋)
 * - 페이지 이동 시 URL(page=)도 함께 갱신 + 자동 스크롤
 *
 * ⚠️ 절대 규칙
 * - bindSizePills()는 수정하지 않는다 (ProductCard + CSS 활성화 영향)
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';
import { cartStore } from '../../store/cartStore.js';

/* =====================================================================
   0) 상수 / 옵션 / 셀렉터
   ===================================================================== */

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
   { value: 'NEW', label: '최신순' },
   { value: 'PRICE_DESC', label: '가격 높은순' },
   { value: 'PRICE_ASC', label: '가격 낮은순' },
   { value: 'HOT', label: 'HOT' },
   { value: 'BEST', label: '베스트' },
];

const SELECTORS = {
   page: '[data-product-page]',
   grid: '[data-product-grid]',
   controls: '[data-product-controls]',

   minInput: '[data-filter-min]',
   maxInput: '[data-filter-max]',
   sortSelect: '[data-filter-sort]',
   applyBtn: '[data-filter-apply]',
   resetBtn: '[data-filter-reset]',
   summary: '[data-filter-summary]',

   pagerSlot: '[data-product-pager-slot]',
   pagerPrev: '[data-page-prev]',
   pagerNext: '[data-page-next]',
   pagerNums: '[data-page-numbers]',
};

/* =====================================================================
   1) 공통 유틸
   ===================================================================== */

function clampInt(n, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
   // ✅ 빈 값은 "미입력"으로 처리 (null)
   if (n == null) return null;
   const raw = String(n).trim();
   if (!raw) return null;

   const v = Number(raw);
   if (!Number.isFinite(v)) return null;

   const i = Math.floor(v);
   return Math.max(min, Math.min(max, i));
}

function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

function getDisplayBadge(product, type) {
   const tags = Array.isArray(product?.tags) ? product.tags : [];
   if (type === 'HOT') return tags.includes('HOT');
   if (type === 'BEST') return tags.includes('베스트');
   return false;
}

/* =====================================================================
   2) URL Query <-> State
   ===================================================================== */

function getQueryState() {
   const params = new URLSearchParams(window.location.search);

   const min = clampInt(params.get('min'), { min: 0 });
   const max = clampInt(params.get('max'), { min: 0 });

   const sortRaw = String(params.get('sort') || 'NEW').toUpperCase();
   const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'NEW';

   const page = clampInt(params.get('page'), { min: 1, max: 9999 }) || 1;

   // ✅ min > max 방지
   const safeMin = min != null ? min : null;
   const safeMax = max != null ? max : null;
   if (safeMin != null && safeMax != null && safeMin > safeMax) {
      return { min: safeMax, max: safeMin, sort, page };
   }

   return { min: safeMin, max: safeMax, sort, page };
}

function setQueryState(next) {
   const params = new URLSearchParams(window.location.search);

   const min = next?.min;
   const max = next?.max;
   const sort = String(next?.sort || 'NEW').toUpperCase();
   const page = Number(next?.page || 1);

   // min/max
   if (min == null || min === '') params.delete('min');
   else params.set('min', String(min));

   if (max == null || max === '') params.delete('max');
   else params.set('max', String(max));

   // sort/page
   params.set(
      'sort',
      SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'NEW',
   );
   params.set('page', String(page >= 1 ? page : 1));

   const qs = params.toString();
   const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;

   // ✅ 라우터를 태우지 않고(재마운트 방지) URL만 갱신
   window.history.replaceState({}, '', url);
}

/* =====================================================================
   3) Filter / Sort / Pagination (Pure)
   ===================================================================== */

function applyFilterSort(products, { min, max, sort }) {
   const list = Array.isArray(products) ? products : [];

   // 1) filter
   const filtered = list.filter((p) => {
      const price = Number(p?.price ?? 0);
      if (!Number.isFinite(price)) return false;

      if (min != null && price < Number(min)) return false;
      if (max != null && price > Number(max)) return false;
      return true;
   });

   // ✅ 최신순 타이브레이커(NEW 공통)
   const cmpLatest = (a, b) => {
      const ac = Number(a?.createdAt || 0) || 0;
      const bc = Number(b?.createdAt || 0) || 0;
      if (bc !== ac) return bc - ac;

      const au = Number(a?.updatedAt || 0) || 0;
      const bu = Number(b?.updatedAt || 0) || 0;
      if (bu !== au) return bu - au;

      // 마지막은 id로 안정화(동점일 때 깜빡임 방지)
      return String(b?.id || '').localeCompare(String(a?.id || ''));
   };

   // 2) sort
   const sorted = [...filtered].sort((a, b) => {
      const ap = Number(a?.price ?? 0);
      const bp = Number(b?.price ?? 0);

      if (sort === 'PRICE_ASC') return ap - bp;
      if (sort === 'PRICE_DESC') return bp - ap;

      if (sort === 'HOT') {
         const ah = getDisplayBadge(a, 'HOT') ? 1 : 0;
         const bh = getDisplayBadge(b, 'HOT') ? 1 : 0;
         if (bh !== ah) return bh - ah;
         return cmpLatest(a, b); // ✅ 뱃지 우선 후 최신순
      }

      if (sort === 'BEST') {
         const ab = getDisplayBadge(a, 'BEST') ? 1 : 0;
         const bb = getDisplayBadge(b, 'BEST') ? 1 : 0;
         if (bb !== ab) return bb - ab;
         return cmpLatest(a, b); // ✅ 뱃지 우선 후 최신순
      }

      // ✅ NEW: createdAt/updatedAt 기준 "진짜 최신순"
      return cmpLatest(a, b);
   });

   return sorted;
}

function paginate(items, page, pageSize) {
   const total = items.length;
   const totalPages = Math.max(1, Math.ceil(total / pageSize));
   const safePage = Math.min(Math.max(1, page), totalPages);

   const start = (safePage - 1) * pageSize;
   const end = start + pageSize;

   return {
      page: safePage,
      total,
      totalPages,
      pageSize,
      slice: items.slice(start, end),
   };
}

/* =====================================================================
   4) View (Template)
   ===================================================================== */

function renderControls(state) {
   const { min, max, sort } = state;

   return `
    <section class="product-toolbar" data-product-controls aria-label="상품 필터">
      <div class="product-toolbar__row">
        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-min">가격(최소)</label>
          <input
            id="filter-min"
            class="product-toolbar__input"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="예: 300000"
            data-filter-min
            value="${min != null ? String(min) : ''}"
          />
        </div>

        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-max">가격(최대)</label>
          <input
            id="filter-max"
            class="product-toolbar__input"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="예: 2000000"
            data-filter-max
            value="${max != null ? String(max) : ''}"
          />
        </div>

        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-sort">정렬</label>
          <select id="filter-sort" class="product-toolbar__select" data-filter-sort>
            ${SORT_OPTIONS.map(
               (o) =>
                  `<option value="${o.value}" ${o.value === sort ? 'selected' : ''}>${o.label}</option>`,
            ).join('')}
          </select>
        </div>

        <div class="product-toolbar__actions">
          <button type="button" class="btn subtle" data-filter-apply>적용</button>
          <button type="button" class="btn subtle" data-filter-reset>초기화</button>
        </div>
      </div>

      <div class="product-toolbar__meta">
        <p class="product-toolbar__summary muted" data-filter-summary></p>
      </div>
    </section>
  `;
}

function renderPager({ page, totalPages }) {
   return `
    <nav class="product-pager" aria-label="상품 페이지네이션">
      <button type="button" class="btn subtle" data-page-prev ${page <= 1 ? 'disabled' : ''}>
        이전
      </button>

      <div class="product-pager__numbers" data-page-numbers></div>

      <button type="button" class="btn subtle" data-page-next ${page >= totalPages ? 'disabled' : ''}>
        다음
      </button>
    </nav>
  `;
}

function buildPageNumbers({ page, totalPages }) {
   // ✅ 너무 길어지지 않게: 현재 기준 ±2 + 처음/끝
   const windowSize = 2;
   const set = new Set([1, totalPages]);

   for (let i = page - windowSize; i <= page + windowSize; i++) {
      if (i >= 1 && i <= totalPages) set.add(i);
   }

   const nums = Array.from(set).sort((a, b) => a - b);

   // gap 처리(…)
   const out = [];
   for (let i = 0; i < nums.length; i++) {
      const cur = nums[i];
      const prev = nums[i - 1];
      if (i > 0 && cur - prev > 1) out.push('…');
      out.push(cur);
   }

   return out;
}

export const ProductPage = () => {
   const qs = getQueryState();

   return `
    <section class='page product-page' aria-label='Product Page' data-product-page>
      <header class='page__header'>
        <h1 class='page__title'>상품</h1>
        <p class='page__desc'>목업 데이터 기반 상품 리스트 (MVP)</p>
      </header>

      <div class='page__content'>
        <div data-product-controls-slot>
          ${renderControls(qs)}
        </div>

        <div class='product-grid' data-product-grid>
          <p class='loading'>불러오는 중...</p>
        </div>

        <div data-product-pager-slot></div>
      </div>
    </section>
  `;
};

/* =====================================================================
   5) Controller (init)
   ===================================================================== */

export async function initProductPage() {
   const root = document.querySelector(SELECTORS.page);
   const gridEl = document.querySelector(SELECTORS.grid);
   if (!root || !gridEl) return;

   // ✅ 라우팅 재진입 시 이벤트/구독 중복 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const controlsSlot = root.querySelector('[data-product-controls-slot]');
   const pagerSlot = root.querySelector(SELECTORS.pagerSlot);

   /* ==============================
     ✅ Page change UX: 자동 스크롤
     ============================== */
   function scrollToTopOfList() {
      const anchor =
         root.querySelector(SELECTORS.controls) ||
         root.querySelector('[data-product-controls-slot]') ||
         root;

      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
   }

   /* ==============================
     ✅ Cart UI Sync
     ============================== */
   const syncCartUi = () => {
      const cards = gridEl.querySelectorAll('[data-product-id]');
      cards.forEach((card) => {
         const productId = card.getAttribute('data-product-id');
         if (!productId) return;

         const inCart = cartStore.hasLine(productId);
         card.classList.toggle('is-in-cart', inCart);
         card.dataset.inCart = inCart ? '1' : '0';
      });
   };

   /* ==============================
     ⚠️ 절대 수정 금지: bindSizePills()
     ============================== */
   const bindSizePills = () => {
      gridEl.addEventListener('click', (e) => {
         const pill = e.target.closest('[data-size-pill]');
         if (!pill) return;

         const card = pill.closest('[data-product-id]');
         if (!card) return;

         const picked = String(pill.getAttribute('data-size') || '').trim();
         if (!picked) return;

         const prev = String(card.getAttribute('data-selected-size') || '');

         // 같은 사이즈를 다시 누르면 해제(토글)
         const next = prev === picked ? '' : picked;

         // 카드 dataset 업데이트
         card.setAttribute('data-selected-size', next);

         // 같은 카드 안의 pill 상태 갱신
         card.querySelectorAll('[data-size-pill]').forEach((el) => {
            const v = String(el.getAttribute('data-size') || '').trim();
            const active = next && v === next;

            el.classList.toggle('is-active', active);

            // 접근성: 버튼이면 aria-pressed, 그 외는 aria-selected
            if (el.tagName === 'BUTTON') {
               el.setAttribute('aria-pressed', active ? 'true' : 'false');
            } else {
               el.setAttribute('aria-selected', active ? 'true' : 'false');
            }
         });
      });
   };

   bindSizePills();

   /* ==============================
     ✅ In-memory products cache
     ============================== */
   let allProducts = [];

   /* ==============================
     ✅ Controls state reader
     ============================== */
   function readControlsState() {
      const minEl = root.querySelector(SELECTORS.minInput);
      const maxEl = root.querySelector(SELECTORS.maxInput);
      const sortEl = root.querySelector(SELECTORS.sortSelect);

      const min = clampInt(minEl?.value, { min: 0 });
      const max = clampInt(maxEl?.value, { min: 0 });

      const sortRaw = String(sortEl?.value || 'NEW').toUpperCase();
      const sort = SORT_OPTIONS.some((o) => o.value === sortRaw)
         ? sortRaw
         : 'NEW';

      // ✅ min/max 역전 방지
      if (min != null && max != null && min > max) {
         return { min: max, max: min, sort };
      }

      return { min: min ?? null, max: max ?? null, sort };
   }

   /* ==============================
     ✅ Core paint (filter/sort/page -> render)
     ============================== */
   function paint({ page } = {}) {
      const qs = getQueryState();
      const controls = readControlsState();

      const nextState = {
         min: controls.min,
         max: controls.max,
         sort: controls.sort,
         page: page ?? qs.page ?? 1,
      };

      // ✅ URL 동기화
      setQueryState(nextState);

      // ✅ 필터 + 정렬
      const processed = applyFilterSort(allProducts, nextState);

      // ✅ 페이징
      const paged = paginate(processed, nextState.page, PAGE_SIZE);

      // ✅ 그리드 렌더
      if (!paged.slice.length) {
         gridEl.innerHTML = `
        <div class="empty">
          <p class="empty__title">조건에 맞는 상품이 없습니다.</p>
          <p class="empty__desc">가격 범위를 조정하거나 초기화해 보세요.</p>
        </div>
      `;
      } else {
         gridEl.innerHTML = paged.slice.map(ProductCard).join('');
      }

      // ✅ 장바구니 상태 반영
      syncCartUi();

      // ✅ 요약 문구
      const summaryEl = root.querySelector(SELECTORS.summary);
      if (summaryEl) {
         const parts = [];
         if (nextState.min != null)
            parts.push(`₩${formatKRW(nextState.min)} 이상`);
         if (nextState.max != null)
            parts.push(`₩${formatKRW(nextState.max)} 이하`);

         const sortLabel =
            SORT_OPTIONS.find((o) => o.value === nextState.sort)?.label ||
            '최신순';

         parts.push(`정렬: ${sortLabel}`);

         summaryEl.textContent = `총 ${paged.total}개 · ${parts.join(' / ')} · ${paged.page}/${paged.totalPages} 페이지`;
      }

      // ✅ 페이지네이션 렌더
      if (pagerSlot) {
         pagerSlot.innerHTML = renderPager({
            page: paged.page,
            totalPages: paged.totalPages,
         });

         const numsEl = root.querySelector(SELECTORS.pagerNums);
         if (numsEl) {
            const nums = buildPageNumbers({
               page: paged.page,
               totalPages: paged.totalPages,
            });

            numsEl.innerHTML = nums
               .map((n) => {
                  if (n === '…') {
                     return `<span class="pager-ellipsis" aria-hidden="true">…</span>`;
                  }
                  const active = Number(n) === paged.page;
                  return `
              <button
                type="button"
                class="pager-num ${active ? 'is-active' : ''}"
                data-page-num="${n}"
                aria-current="${active ? 'page' : 'false'}"
              >
                ${n}
              </button>
            `;
               })
               .join('');
         }
      }
   }

   /* ==============================
     ✅ Events
     ============================== */

   root.addEventListener('click', (e) => {
      const applyBtn = e.target.closest(SELECTORS.applyBtn);
      if (applyBtn) {
         paint({ page: 1 });
         return;
      }

      const resetBtn = e.target.closest(SELECTORS.resetBtn);
      if (resetBtn) {
         const minEl = root.querySelector(SELECTORS.minInput);
         const maxEl = root.querySelector(SELECTORS.maxInput);
         const sortEl = root.querySelector(SELECTORS.sortSelect);

         if (minEl) minEl.value = '';
         if (maxEl) maxEl.value = '';
         if (sortEl) sortEl.value = 'NEW';

         paint({ page: 1 });
         return;
      }

      // ✅ 페이지네이션: 이동 시 자동 스크롤
      const prevBtn = e.target.closest(SELECTORS.pagerPrev);
      if (prevBtn && !prevBtn.disabled) {
         const qs = getQueryState();
         scrollToTopOfList();
         paint({ page: Math.max(1, qs.page - 1) });
         return;
      }

      const nextBtn = e.target.closest(SELECTORS.pagerNext);
      if (nextBtn && !nextBtn.disabled) {
         const qs = getQueryState();
         scrollToTopOfList();
         paint({ page: qs.page + 1 });
         return;
      }

      const numBtn = e.target.closest('[data-page-num]');
      if (numBtn) {
         const p = clampInt(numBtn.getAttribute('data-page-num'), {
            min: 1,
            max: 9999,
         });
         if (!p) return;

         scrollToTopOfList();
         paint({ page: p });
      }
   });

   root.addEventListener('change', (e) => {
      const sortEl = e.target.closest(SELECTORS.sortSelect);
      if (sortEl) paint({ page: 1 });
   });

   root.addEventListener('input', (e) => {
      const minEl = e.target.closest(SELECTORS.minInput);
      const maxEl = e.target.closest(SELECTORS.maxInput);
      if (minEl || maxEl) paint({ page: 1 });
   });

   root.addEventListener('keydown', (e) => {
      const isInControls = Boolean(e.target?.closest?.(SELECTORS.controls));
      if (!isInControls) return;
      if (e.key !== 'Enter') return;

      const tag = String(e.target?.tagName || '').toUpperCase();
      if (tag === 'SELECT') return;

      e.preventDefault();
      paint({ page: 1 });
   });

   /* ==============================
     ✅ Data load + initial paint
     ============================== */
   try {
      const res = await getProducts();

      // ✅ getProducts()가 배열이든 {items}든 모두 지원
      const products = Array.isArray(res)
         ? res
         : Array.isArray(res?.items)
           ? res.items
           : [];

      allProducts = products;

      if (controlsSlot)
         controlsSlot.innerHTML = renderControls(getQueryState());

      paint({ page: getQueryState().page });
   } catch (err) {
      gridEl.innerHTML = `
      <p class='error'>상품을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>
    `;
      console.error('[product] load failed:', err);
      return;
   }

   /* ==============================
     ✅ cartStore subscribe
     ============================== */
   cartStore.subscribe(() => {
      const stillHere = document.querySelector(SELECTORS.grid);
      if (!stillHere) return;
      syncCartUi();
   });
}

// 4:03
