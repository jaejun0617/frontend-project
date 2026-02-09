/**
 * =============================================
 * 📍 위치: src/pages/search/index.js
 * 역할: 검색(Search) 결과 페이지 (4탄 최종)
 * =============================================
 *
 * ✅ 4탄 목표
 * - /search?q=... 기반 결과 렌더
 * - 가격 필터(min/max), 정렬, 페이지네이션(20개) 추가
 * - URL 쿼리 동기화 (?q=&min=&max=&sort=&page=)
 * - 입력/정렬은 "즉시 반영"(page=1 리셋)
 * - SearchPage 진입 시 Drawer 닫힘 유지
 *
 * 🔗 연동
 * - SearchDrawer ↔ SearchPage: recent-search:changed로 최근검색 동기화
 * - app.js: app:searchDrawerClose 수신 → drawer.close()
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';

import {
   getRecentSearches,
   addRecentSearch,
   removeRecentSearch,
   clearRecentSearches,
} from '../../utils/searchHistory.js';

/* =====================================================================
   0) Constants / Selectors
   ===================================================================== */

const PAGE_SIZE = 20;

const DEFAULT_SUGGESTIONS = [
   'New Season',
   'Prada',
   'Louis Vuitton',
   'Chanel',
   'Cartier',
];

const SORT_OPTIONS = [
   { value: 'NEW', label: '최신순' },
   { value: 'PRICE_DESC', label: '가격 높은순' },
   { value: 'PRICE_ASC', label: '가격 낮은순' },
   { value: 'HOT', label: 'HOT' },
   { value: 'BEST', label: '베스트' },
];

const SELECTORS = {
   pageRoot: '.search-page',
   status: '[data-search-status]',
   results: '[data-search-results]',

   recentList: '[data-page-recent]',
   suggestList: '[data-page-suggest]',
   clearAllBtn: '[data-page-recent-clear]',

   controls: '[data-search-controls]',
   minInput: '[data-filter-min]',
   maxInput: '[data-filter-max]',
   sortSelect: '[data-filter-sort]',
   applyBtn: '[data-filter-apply]',
   resetBtn: '[data-filter-reset]',
   summary: '[data-filter-summary]',

   pagerSlot: '[data-search-pager-slot]',
   pagerPrev: '[data-page-prev]',
   pagerNext: '[data-page-next]',
   pagerNums: '[data-page-numbers]',
};

/* =====================================================================
   1) Safe helpers
   ===================================================================== */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function clampInt(n, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
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

function encodeChipValue(value) {
   return encodeURIComponent(String(value ?? ''));
}

function decodeChipValue(value) {
   try {
      return decodeURIComponent(String(value ?? ''));
   } catch {
      return String(value ?? '');
   }
}

/* =====================================================================
   2) URL Query <-> State
   ===================================================================== */

function getQueryState() {
   const params = new URLSearchParams(window.location.search);

   const q = String(params.get('q') ?? '').trim();
   const min = clampInt(params.get('min'), { min: 0 });
   const max = clampInt(params.get('max'), { min: 0 });

   const sortRaw = String(params.get('sort') || 'NEW').toUpperCase();
   const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'NEW';

   const page = clampInt(params.get('page'), { min: 1, max: 9999 }) || 1;

   const safeMin = min != null ? min : null;
   const safeMax = max != null ? max : null;
   if (safeMin != null && safeMax != null && safeMin > safeMax) {
      return { q, min: safeMax, max: safeMin, sort, page };
   }

   return { q, min: safeMin, max: safeMax, sort, page };
}

function setQueryState(next) {
   const params = new URLSearchParams(window.location.search);

   const q = String(next?.q ?? params.get('q') ?? '').trim();
   if (!q) params.delete('q');
   else params.set('q', q);

   const min = next?.min;
   const max = next?.max;

   if (min == null || min === '') params.delete('min');
   else params.set('min', String(min));

   if (max == null || max === '') params.delete('max');
   else params.set('max', String(max));

   const sort = String(next?.sort || 'NEW').toUpperCase();
   params.set(
      'sort',
      SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'NEW',
   );

   const page = Number(next?.page || 1);
   params.set('page', String(page >= 1 ? page : 1));

   const qs = params.toString();
   const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;

   window.history.replaceState({}, '', url);
}

/* =====================================================================
   3) Search logic: filter/sort/paginate
   ===================================================================== */

function getDisplayBadge(product, type) {
   const tags = Array.isArray(product?.tags) ? product.tags : [];
   if (type === 'HOT') return tags.includes('HOT');
   if (type === 'BEST') return tags.includes('베스트');
   return false;
}

function filterByKeyword(products, keyword) {
   if (!keyword) return [];
   const normalized = keyword.toLowerCase();

   return (Array.isArray(products) ? products : []).filter((p) => {
      const name = String(p?.name ?? '').toLowerCase();
      const tags = Array.isArray(p?.tags) ? p.tags.join(' ') : '';
      const tagText = String(tags).toLowerCase();
      return name.includes(normalized) || tagText.includes(normalized);
   });
}

function applyFilterSort(list, { min, max, sort }) {
   const filtered = (Array.isArray(list) ? list : []).filter((p) => {
      const price = Number(p?.price ?? 0);
      if (!Number.isFinite(price)) return false;
      if (min != null && price < Number(min)) return false;
      if (max != null && price > Number(max)) return false;
      return true;
   });

   const sorted = [...filtered].sort((a, b) => {
      const ap = Number(a?.price ?? 0);
      const bp = Number(b?.price ?? 0);

      if (sort === 'PRICE_ASC') return ap - bp;
      if (sort === 'PRICE_DESC') return bp - ap;

      if (sort === 'HOT') {
         const ah = getDisplayBadge(a, 'HOT') ? 1 : 0;
         const bh = getDisplayBadge(b, 'HOT') ? 1 : 0;
         if (bh !== ah) return bh - ah;
         return String(b?.id || '').localeCompare(String(a?.id || ''));
      }

      if (sort === 'BEST') {
         const ab = getDisplayBadge(a, 'BEST') ? 1 : 0;
         const bb = getDisplayBadge(b, 'BEST') ? 1 : 0;
         if (bb !== ab) return bb - ab;
         return String(b?.id || '').localeCompare(String(a?.id || ''));
      }

      return String(b?.id || '').localeCompare(String(a?.id || ''));
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

function buildPageNumbers({ page, totalPages }) {
   const windowSize = 2;
   const set = new Set([1, totalPages]);

   for (let i = page - windowSize; i <= page + windowSize; i++) {
      if (i >= 1 && i <= totalPages) set.add(i);
   }

   const nums = Array.from(set).sort((a, b) => a - b);

   const out = [];
   for (let i = 0; i < nums.length; i++) {
      const cur = nums[i];
      const prev = nums[i - 1];
      if (i > 0 && cur - prev > 1) out.push('…');
      out.push(cur);
   }
   return out;
}

/* =====================================================================
   4) Meta chips UI (최근/추천)
   ===================================================================== */

function renderChips(listEl, items, { removable = false } = {}) {
   if (!listEl) return;

   if (!items || !items.length) {
      listEl.innerHTML = "<li><span class='chip-empty'>없음</span></li>";
      return;
   }

   listEl.innerHTML = items
      .map((text) => {
         const raw = String(text ?? '').trim();
         const encoded = encodeChipValue(raw);

         const removeBtn = removable
            ? `<button type='button' class='chip-remove' data-action='remove' data-chip='${encoded}' aria-label='최근 검색어 삭제'>×</button>`
            : '';

         return `
        <li>
          <div class='chip-row'>
            <button type='button' class='chip-btn' data-action='search' data-chip='${encoded}'>${escapeHtml(raw)}</button>
            ${removeBtn}
          </div>
        </li>
      `;
      })
      .join('');
}

function syncMetaLists(pageRoot) {
   const recentEl = pageRoot.querySelector(SELECTORS.recentList);
   const suggestEl = pageRoot.querySelector(SELECTORS.suggestList);

   renderChips(recentEl, getRecentSearches(), { removable: true });
   renderChips(suggestEl, DEFAULT_SUGGESTIONS, { removable: false });
}

/* =====================================================================
   5) Controls / Pager template
   ===================================================================== */

function renderControls(state) {
   const { min, max, sort } = state;

   return `
    <section class="product-toolbar" data-search-controls aria-label="검색 필터">
      <div class="product-toolbar__row">
        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="search-min">가격(최소)</label>
          <input
            id="search-min"
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
          <label class="product-toolbar__label" for="search-max">가격(최대)</label>
          <input
            id="search-max"
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
          <label class="product-toolbar__label" for="search-sort">정렬</label>
          <select id="search-sort" class="product-toolbar__select" data-filter-sort>
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
    <nav class="product-pager" aria-label="검색 결과 페이지네이션">
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

/* =====================================================================
   6) Page template
   ===================================================================== */

export const SearchPage = () => {
   const qs = getQueryState();

   return `
    <section class='page search-page' aria-label='Search Page'>
      <section class='search-meta' aria-label='Search Meta'>
        <div class='search-meta__block'>
          <div class='search-meta__head'>
            <h2 class='search-meta__title'>최근 검색어</h2>
            <button type='button' class='search-meta__clear' data-page-recent-clear>
              전체삭제
            </button>
          </div>
          <ul class='chip-list' data-page-recent></ul>
        </div>

        <div class='search-meta__block'>
          <div class='search-meta__head'>
            <h2 class='search-meta__title'>추천 검색어</h2>
          </div>
          <ul class='chip-list' data-page-suggest></ul>
        </div>
      </section>

      <div class='page__content'>
        <div data-search-controls-slot>
          ${renderControls(qs)}
        </div>

        <div class='search-status' data-search-status></div>
        <div class='product-grid' data-search-results></div>

        <div data-search-pager-slot></div>
      </div>
    </section>
  `;
};

/* =====================================================================
   7) afterRender
   ===================================================================== */

let isRecentChangedListenerBound = false;

export async function initSearchPage() {
   const pageRoot = document.querySelector(SELECTORS.pageRoot);
   if (!pageRoot) return;

   const statusEl = pageRoot.querySelector(SELECTORS.status);
   const resultsEl = pageRoot.querySelector(SELECTORS.results);
   const pagerSlot = pageRoot.querySelector(SELECTORS.pagerSlot);
   const controlsSlot = pageRoot.querySelector('[data-search-controls-slot]');
   if (!statusEl || !resultsEl) return;

   /* ==============================
     ✅ UX: SearchPage 진입 시 Drawer 닫기
     ============================== */
   window.dispatchEvent(new CustomEvent('app:searchDrawerClose'));

   /* ==============================
     ✅ Meta lists
     ============================== */
   syncMetaLists(pageRoot);

   /* ==============================
     ✅ recent-search 동기화 (window 이벤트는 1회만)
     ============================== */
   if (!isRecentChangedListenerBound) {
      isRecentChangedListenerBound = true;

      window.addEventListener('recent-search:changed', () => {
         const root = document.querySelector(SELECTORS.pageRoot);
         if (!root) return;
         syncMetaLists(root);
      });
   }

   let allProducts = [];

   function scrollToTopOfList() {
      const anchor =
         pageRoot.querySelector(SELECTORS.controls) ||
         pageRoot.querySelector('[data-search-controls-slot]') ||
         pageRoot;

      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
   }

   function readControlsState() {
      const minEl = pageRoot.querySelector(SELECTORS.minInput);
      const maxEl = pageRoot.querySelector(SELECTORS.maxInput);
      const sortEl = pageRoot.querySelector(SELECTORS.sortSelect);

      const min = clampInt(minEl?.value, { min: 0 });
      const max = clampInt(maxEl?.value, { min: 0 });

      const sortRaw = String(sortEl?.value || 'NEW').toUpperCase();
      const sort = SORT_OPTIONS.some((o) => o.value === sortRaw)
         ? sortRaw
         : 'NEW';

      if (min != null && max != null && min > max) {
         return { min: max, max: min, sort };
      }

      return { min: min ?? null, max: max ?? null, sort };
   }

   function paint({ page } = {}) {
      const qs = getQueryState();
      const controls = readControlsState();

      const nextState = {
         q: qs.q,
         min: controls.min,
         max: controls.max,
         sort: controls.sort,
         page: page ?? qs.page ?? 1,
      };

      setQueryState(nextState);

      const keywordFiltered = filterByKeyword(allProducts, nextState.q);
      const processed = applyFilterSort(keywordFiltered, nextState);
      const paged = paginate(processed, nextState.page, PAGE_SIZE);

      const parts = [];
      if (nextState.min != null)
         parts.push(`₩${formatKRW(nextState.min)} 이상`);
      if (nextState.max != null)
         parts.push(`₩${formatKRW(nextState.max)} 이하`);
      const sortLabel =
         SORT_OPTIONS.find((o) => o.value === nextState.sort)?.label ||
         '최신순';

      if (!processed.length) {
         statusEl.innerHTML = `
        <p class='empty'>
          "${escapeHtml(nextState.q)}" 결과가 없습니다. <br/>
          <span class="muted">${escapeHtml(parts.join(' / ') || '필터 없음')} · 정렬: ${escapeHtml(sortLabel)}</span>
        </p>
      `;
         resultsEl.innerHTML = '';
         if (pagerSlot) pagerSlot.innerHTML = '';
         return;
      }

      statusEl.innerHTML = `
      <p class='result'>
        "${escapeHtml(nextState.q)}" 검색 결과: <strong>${processed.length}</strong>개
        <span class="muted">· ${escapeHtml(parts.join(' / ') || '필터 없음')} · 정렬: ${escapeHtml(sortLabel)}</span>
      </p>
    `;

      resultsEl.innerHTML = paged.slice.map(ProductCard).join('');

      const summaryEl = pageRoot.querySelector(SELECTORS.summary);
      if (summaryEl) {
         const filterText = parts.length ? parts.join(' / ') : '필터 없음';
         summaryEl.textContent = `총 ${paged.total}개 · ${filterText} · 정렬: ${sortLabel} · ${paged.page}/${paged.totalPages} 페이지`;
      }

      if (pagerSlot) {
         pagerSlot.innerHTML = renderPager({
            page: paged.page,
            totalPages: paged.totalPages,
         });

         const numsEl = pageRoot.querySelector(SELECTORS.pagerNums);
         if (numsEl) {
            const nums = buildPageNumbers({
               page: paged.page,
               totalPages: paged.totalPages,
            });

            numsEl.innerHTML = nums
               .map((n) => {
                  if (n === '…')
                     return `<span class="pager-ellipsis" aria-hidden="true">…</span>`;
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

   if (pageRoot.dataset.bound !== '1') {
      pageRoot.dataset.bound = '1';

      pageRoot.addEventListener('click', (e) => {
         const clearAll = e.target.closest(SELECTORS.clearAllBtn);
         if (clearAll) {
            clearRecentSearches();
            syncMetaLists(pageRoot);
            window.dispatchEvent(new CustomEvent('recent-search:changed'));
            return;
         }

         const removeBtn = e.target.closest(
            "button[data-action='remove'][data-chip]",
         );
         if (removeBtn) {
            const value = decodeChipValue(removeBtn.getAttribute('data-chip'));
            removeRecentSearch(value);
            syncMetaLists(pageRoot);
            window.dispatchEvent(new CustomEvent('recent-search:changed'));
            return;
         }

         const chipBtn = e.target.closest(
            "button[data-action='search'][data-chip]",
         );
         if (chipBtn) {
            const value = decodeChipValue(chipBtn.getAttribute('data-chip'));
            const q = String(value ?? '').trim();
            if (!q) return;

            addRecentSearch(q);
            window.dispatchEvent(new CustomEvent('recent-search:changed'));

            setQueryState({ q, min: null, max: null, sort: 'NEW', page: 1 });

            if (controlsSlot)
               controlsSlot.innerHTML = renderControls(getQueryState());

            paint({ page: 1 });
            return;
         }

         const applyBtn = e.target.closest(SELECTORS.applyBtn);
         if (applyBtn) {
            paint({ page: 1 });
            return;
         }

         const resetBtn = e.target.closest(SELECTORS.resetBtn);
         if (resetBtn) {
            const minEl = pageRoot.querySelector(SELECTORS.minInput);
            const maxEl = pageRoot.querySelector(SELECTORS.maxInput);
            const sortEl = pageRoot.querySelector(SELECTORS.sortSelect);

            if (minEl) minEl.value = '';
            if (maxEl) maxEl.value = '';
            if (sortEl) sortEl.value = 'NEW';

            paint({ page: 1 });
            return;
         }

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

      pageRoot.addEventListener('change', (e) => {
         const sortEl = e.target.closest(SELECTORS.sortSelect);
         if (sortEl) paint({ page: 1 });
      });

      pageRoot.addEventListener('input', (e) => {
         const minEl = e.target.closest(SELECTORS.minInput);
         const maxEl = e.target.closest(SELECTORS.maxInput);
         if (minEl || maxEl) paint({ page: 1 });
      });

      pageRoot.addEventListener('keydown', (e) => {
         const isInControls = Boolean(e.target?.closest?.(SELECTORS.controls));
         if (!isInControls) return;
         if (e.key !== 'Enter') return;

         const tag = String(e.target?.tagName || '').toUpperCase();
         if (tag === 'SELECT') return;

         e.preventDefault();
         paint({ page: 1 });
      });
   }

   const qs = getQueryState();

   if (!qs.q) {
      statusEl.innerHTML = "<p class='empty'>검색어를 입력해 주세요.</p>";
      resultsEl.innerHTML = '';
      if (pagerSlot) pagerSlot.innerHTML = '';
      return;
   }

   if (controlsSlot) controlsSlot.innerHTML = renderControls(qs);

   statusEl.innerHTML = `<p class='loading'>"${escapeHtml(qs.q)}" 검색 중...</p>`;
   resultsEl.innerHTML = '';
   if (pagerSlot) pagerSlot.innerHTML = '';

   try {
      const products = await getProducts();
      allProducts = Array.isArray(products) ? products : [];

      paint({ page: qs.page });
   } catch (err) {
      statusEl.innerHTML =
         "<p class='error'>검색에 실패했어요. 다시 시도해 주세요.</p>";
      resultsEl.innerHTML = '';
      if (pagerSlot) pagerSlot.innerHTML = '';
      console.error('[search] load failed:', err);
   }
}
