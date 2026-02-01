/**
 * =============================================
 * 📍 위치: src/pages/search/index.js
 * 역할: 검색(Search) 결과 페이지
 *
 * ✅ 목표(현재 단계)
 * - Search 페이지에서도 최근 검색어 / 추천 검색어를 노출
 * - 최근 검색어는 개별 삭제(×) 가능
 * - 칩 클릭 시 /search?q=... 로 이동해서 결과를 렌더
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';

import {
   getRecentSearches,
   removeRecentSearch,
   clearRecentSearches,
} from '../../utils/searchHistory.js';

/* ==============================
   0) 상수
   ============================== */

// SearchDrawer와 동일한 추천 검색어(일단 중복 OK, 나중에 상수 모듈로 분리 가능)
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

   // 최근/추천 UI
   recentList: '[data-page-recent]',
   suggestList: '[data-page-suggest]',
   clearAllBtn: '[data-page-recent-clear]',
};

/* ==============================
   1) 쿼리 유틸
   ============================== */

function getKeywordFromQuery() {
   const params = new URLSearchParams(window.location.search);
   return (params.get('q') ?? '').trim();
}

function navigateToSearch(keyword) {
   const q = String(keyword ?? '').trim();
   if (!q) return;

   const url = `/search?q=${encodeURIComponent(q)}`;
   window.history.pushState({}, '', url);
   window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ==============================
   2) 검색 필터
   ============================== */

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

/* ==============================
   3) 칩 렌더 유틸
   ============================== */

function renderChips(listEl, items, { removable = false } = {}) {
   if (!listEl) return;

   if (!items || !items.length) {
      listEl.innerHTML = "<li><span class='chip-empty'>없음</span></li>";
      return;
   }

   listEl.innerHTML = items
      .map((text) => {
         const removeBtn = removable
            ? `<button type='button' class='chip-remove' data-action='remove' data-chip='${text}' aria-label='최근 검색어 삭제'>×</button>`
            : '';

         return `
        <li>
          <div class='chip-row'>
            <button type='button' class='chip-btn' data-action='search' data-chip='${text}'>${text}</button>
            ${removeBtn}
          </div>
        </li>
      `;
      })
      .join('');
}

function syncMetaLists() {
   const recentEl = document.querySelector(SELECTORS.recentList);
   const suggestEl = document.querySelector(SELECTORS.suggestList);

   renderChips(recentEl, getRecentSearches(), { removable: true });
   renderChips(suggestEl, DEFAULT_SUGGESTIONS, { removable: false });
}

/* ==============================
   4) 페이지 템플릿(동기)
   ============================== */

export const SearchPage = () => {
   return `
    <section class='page search-page' aria-label='Search Page'>
      <header class='page__header'>
        <h1 class='page__title'>검색</h1>
        <p class='page__desc'>검색어에 맞는 상품을 찾아 보여줍니다.</p>
      </header>

      <!-- ✅ 최근/추천 검색어 영역 (페이지에서도 보이게) -->
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

/* ==============================
   5) 렌더 직후 로직(afterRender)
   ============================== */

export async function initSearchPage() {
   const pageRoot = document.querySelector(SELECTORS.pageRoot);
   const statusEl = document.querySelector(SELECTORS.status);
   const resultsEl = document.querySelector(SELECTORS.results);

   if (!pageRoot || !statusEl || !resultsEl) return;

   // ✅ 페이지 들어올 때마다 최근/추천 갱신
   syncMetaLists();

   // ✅ 이벤트는 페이지 루트에 1회만 바인딩 (라우팅 재렌더 중복 방지)
   if (!pageRoot.dataset.bound) {
      pageRoot.dataset.bound = 'true';

      pageRoot.addEventListener('click', (e) => {
         // 최근 전체 삭제
         const clearAll = e.target.closest(SELECTORS.clearAllBtn);
         if (clearAll) {
            clearRecentSearches();
            syncMetaLists();
            return;
         }

         // 개별 삭제
         const removeBtn = e.target.closest(
            "button[data-action='remove'][data-chip]",
         );
         if (removeBtn) {
            const value = removeBtn.getAttribute('data-chip');
            removeRecentSearch(value);
            syncMetaLists();
            return;
         }

         // 검색 이동
         const chipBtn = e.target.closest(
            "button[data-action='search'][data-chip]",
         );
         if (chipBtn) {
            const value = chipBtn.getAttribute('data-chip');
            navigateToSearch(value);
         }
      });
   }

   // (1) Empty 상태: q가 없으면 안내만
   const keyword = getKeywordFromQuery();
   if (!keyword) {
      statusEl.innerHTML = "<p class='empty'>검색어를 입력해 주세요.</p>";
      resultsEl.innerHTML = '';
      return;
   }

   // (2) Loading 상태
   statusEl.innerHTML = `
    <p class='loading'>"${keyword}" 검색 중...</p>
  `;
   resultsEl.innerHTML = '';

   try {
      const products = await getProducts();
      const filtered = filterProducts(products, keyword);

      // (3) Result / No Result
      if (!filtered.length) {
         statusEl.innerHTML = `
          <p class='empty'>"${keyword}"에 대한 검색 결과가 없습니다.</p>
        `;
         resultsEl.innerHTML = '';
         return;
      }

      statusEl.innerHTML = `
        <p class='result'>"${keyword}" 검색 결과: <strong>${filtered.length}</strong>개</p>
      `;

      resultsEl.innerHTML = filtered.map(ProductCard).join('');
   } catch (err) {
      statusEl.innerHTML =
         "<p class='error'>검색에 실패했어요. 다시 시도해 주세요.</p>";
      resultsEl.innerHTML = '';
      console.error('[search] load failed:', err);
   }
}
