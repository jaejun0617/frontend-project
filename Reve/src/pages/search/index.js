/**
 * =============================================
 * 📍 위치: src/pages/search/index.js
 * 역할: 검색(Search) 결과 페이지
 *
 * ✅ 목표(현재 단계)
 * - /search?q=... 쿼리 기반 검색 결과 렌더
 * - 페이지에서도 최근/추천 검색어 칩 노출
 * - 최근 검색어: 개별 삭제(×), 전체삭제
 * - 칩 클릭 시 /search?q=... 로 이동 + 최근검색 갱신
 *
 * 🔗 연동
 * - SearchDrawer: 최근검색 변경 시 recent-search:changed 이벤트 발행
 * - SearchPage: 해당 이벤트 수신 시 칩 UI를 동기화
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

/* =============================================
 * 0) Constants
 * ============================================= */

// NOTE: Drawer와 동일. 추후 constants로 분리 가능.
const DEFAULT_SUGGESTIONS = [
   'New Season',
   'Prada',
   'Louis Vuitton',
   'Chanel',
   'Cartier',
];

const SELECTORS = {
   pageRoot: '.search-page',
   status: '[data-search-status]',
   results: '[data-search-results]',

   recentList: '[data-page-recent]',
   suggestList: '[data-page-suggest]',
   clearAllBtn: '[data-page-recent-clear]',
};

/* =============================================
 * 1) Query / Navigation
 * ============================================= */

function getKeywordFromQuery() {
   const params = new URLSearchParams(window.location.search);
   return String(params.get('q') ?? '').trim();
}

function navigateToSearch(keyword) {
   const q = String(keyword ?? '').trim();
   if (!q) return;

   // ✅ 페이지에서 검색 이동도 최근검색에 남긴다.
   addRecentSearch(q);
   window.dispatchEvent(new CustomEvent('recent-search:changed'));

   const url = `/search?q=${encodeURIComponent(q)}`;
   window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { href: url } }),
   );
}

/* =============================================
 * 2) Search filtering
 * ============================================= */

function filterProducts(products, keyword) {
   if (!keyword) return [];

   const normalized = keyword.toLowerCase();

   return products.filter((p) => {
      const name = String(p?.name ?? '').toLowerCase();
      const tags = Array.isArray(p?.tags) ? p.tags.join(' ') : '';
      const tagText = String(tags).toLowerCase();

      return name.includes(normalized) || tagText.includes(normalized);
   });
}

/* =============================================
 * 3) Safe HTML helpers
 * ============================================= */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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

/* =============================================
 * 4) Chips UI
 * ============================================= */

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

/* =============================================
 * 5) Page template
 * ============================================= */

export const SearchPage = () => {
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
        <div class='search-status' data-search-status></div>
        <div class='product-grid' data-search-results></div>
      </div>
    </section>
  `;
};

/* =============================================
 * 6) afterRender
 * ============================================= */

/**
 * ✅ 중복 바인딩 방지(모듈 스코프)
 * - SPA 라우팅으로 initSearchPage가 여러 번 호출될 수 있으므로
 *   window 이벤트는 단 1회만 등록한다.
 */
let isRecentChangedListenerBound = false;

export async function initSearchPage() {
   const pageRoot = document.querySelector(SELECTORS.pageRoot);
   if (!pageRoot) return;

   const statusEl = pageRoot.querySelector(SELECTORS.status);
   const resultsEl = pageRoot.querySelector(SELECTORS.results);
   if (!statusEl || !resultsEl) return;

   // ✅ 페이지 들어올 때마다 최신 메타 리스트 렌더
   syncMetaLists(pageRoot);

   // ✅ Drawer/SearchPage 어느 쪽에서든 최근검색이 바뀌면 페이지 메타 UI 동기화
   if (!isRecentChangedListenerBound) {
      isRecentChangedListenerBound = true;

      window.addEventListener('recent-search:changed', () => {
         const root = document.querySelector(SELECTORS.pageRoot);
         if (!root) return;
         syncMetaLists(root);
      });
   }

   // ✅ 페이지 DOM 이벤트: 루트에 1회만 바인딩
   if (pageRoot.dataset.bound !== '1') {
      pageRoot.dataset.bound = '1';

      pageRoot.addEventListener('click', (e) => {
         // (1) 전체 삭제
         const clearAll = e.target.closest(SELECTORS.clearAllBtn);
         if (clearAll) {
            clearRecentSearches();
            syncMetaLists(pageRoot);
            window.dispatchEvent(new CustomEvent('recent-search:changed'));
            return;
         }

         // (2) 개별 삭제
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

         // (3) 검색 이동
         const chipBtn = e.target.closest(
            "button[data-action='search'][data-chip]",
         );
         if (chipBtn) {
            const value = decodeChipValue(chipBtn.getAttribute('data-chip'));
            navigateToSearch(value);
         }
      });
   }

   // (A) q 없으면 안내만
   const keyword = getKeywordFromQuery();
   if (!keyword) {
      statusEl.innerHTML = "<p class='empty'>검색어를 입력해 주세요.</p>";
      resultsEl.innerHTML = '';
      return;
   }

   // (B) Loading
   statusEl.innerHTML = `<p class='loading'>"${escapeHtml(keyword)}" 검색 중...</p>`;
   resultsEl.innerHTML = '';

   try {
      const products = await getProducts();
      const filtered = filterProducts(products, keyword);

      // (C) No Result
      if (!filtered.length) {
         statusEl.innerHTML = `<p class='empty'>"${escapeHtml(keyword)}"에 대한 검색 결과가 없습니다.</p>`;
         resultsEl.innerHTML = '';
         return;
      }

      // (D) Result
      statusEl.innerHTML = `
        <p class='result'>"${escapeHtml(keyword)}" 검색 결과: <strong>${filtered.length}</strong>개</p>
      `;

      resultsEl.innerHTML = filtered.map(ProductCard).join('');
   } catch (err) {
      statusEl.innerHTML =
         "<p class='error'>검색에 실패했어요. 다시 시도해 주세요.</p>";
      resultsEl.innerHTML = '';
      console.error('[search] load failed:', err);
   }
}
