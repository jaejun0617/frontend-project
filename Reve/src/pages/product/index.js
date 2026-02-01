/**
 * =============================================
 * 📍 위치: src/pages/product/index.js
 * 역할: 상품(Product) 페이지 엔트리 (상품 리스트/상세 진입점)
 * 사용처: 라우터/페이지 스위처(app.js 등)에서 경로에 따라 렌더링
 * =============================================
 */

/**
 * =============================================
 * 📍 위치: src/pages/product/index.js
 * 역할: 상품(Product) 리스트 페이지
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';

/**
 * 페이지 템플릿(동기)
 * - 데이터는 afterRender에서 가져오고, 여기서는 Loading 뼈대만 먼저 보여줌
 */
export const ProductPage = () => {
   return `
    <section class='page product-page' aria-label='Product Page'>
      <header class='page__header'>
        <h1 class='page__title'>상품</h1>
        <p class='page__desc'>목업 데이터 기반 상품 리스트 (MVP)</p>
      </header>

      <!-- Loading / Result 렌더링 영역 -->
      <div class='page__content'>
        <div class='product-grid' data-product-grid>
          <p class='loading'>불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
};

/**
 * 렌더 직후 실행
 * - getProducts()로 데이터 가져오기
 * - ProductCard로 반복 렌더링
 */
export async function initProductPage() {
   const gridEl = document.querySelector('[data-product-grid]');
   if (!gridEl) return;

   try {
      const products = await getProducts();

      // 결과 렌더
      gridEl.innerHTML = products.map(ProductCard).join('');
   } catch (err) {
      // 에러 상태(친절하게)
      gridEl.innerHTML = `
        <p class='error'>상품을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>
      `;

      console.error('[product] load failed:', err);
   }
}
