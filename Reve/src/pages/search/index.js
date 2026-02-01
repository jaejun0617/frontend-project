/**
 * =============================================
 * 📍 위치: src/pages/search/index.js
 * 역할: 검색(Search) 페이지 엔트리 (검색 결과/필터)
 * 사용처: 라우터/페이지 스위처(app.js 등)에서 경로에 따라 렌더링
 * =============================================
 */

export const Search = () => {
   return `
        <h1 class=''>Search 검색</h1>
    `;
};

/**
 * =============================================
 * 📍 위치: src/pages/search/index.js
 * 역할: 검색(Search) 결과 페이지
 *
 * ✅ 흐름
 * - Header Search Drawer에서 검색 실행
 * - URL이 /search?q=키워드 로 변경됨
 * - 라우터가 /search 페이지를 렌더
 * - 이 페이지가 q를 읽고 상품을 필터링해서 결과를 보여줌
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';

/* ==============================
   1) 쿼리 유틸
   ============================== */

function getKeywordFromQuery() {
   const params = new URLSearchParams(window.location.search);
   return (params.get('q') ?? '').trim();
}

/* ==============================
   2) 검색 필터
   ============================== */

/**
 * 검색어로 상품을 필터링
 * - name 포함
 * - tags(배열) 포함
 */
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
   3) 페이지 템플릿(동기)
   ============================== */

export const SearchPage = () => {
   // 여기서는 "뼈대"만 그리고, 실제 결과는 afterRender에서 채움
   return `
    <section class='page search-page' aria-label='Search Page'>
      <header class='page__header'>
        <h1 class='page__title'>검색</h1>
        <p class='page__desc'>검색어에 맞는 상품을 찾아 보여줍니다.</p>
      </header>

      <div class='page__content'>
        <!-- 상태 메시지/결과가 들어갈 영역 -->
        <div class='search-status' data-search-status></div>

        <!-- 결과 리스트 -->
        <div class='product-grid' data-search-results></div>
      </div>
    </section>
  `;
};

/* ==============================
   4) 렌더 직후 로직(afterRender)
   ============================== */

export async function initSearchPage() {
   const statusEl = document.querySelector('[data-search-status]');
   const resultsEl = document.querySelector('[data-search-results]');

   if (!statusEl || !resultsEl) return;

   // (1) Empty 상태: q가 없으면 안내만 보여주고 끝
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
