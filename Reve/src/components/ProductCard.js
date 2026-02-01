/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI(이름/가격/태그 등) 렌더링용 컴포넌트
 * 사용처: Product/Search 페이지에서 반복 렌더링(map/loop)
 * =============================================
 */

/**
 * 숫자를 원화(₩) 형태로 포맷
 * - Intl.NumberFormat은 브라우저 표준 API
 */
function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * 상품 카드 컴포넌트
 * @param {Object} product
 * @param {string} product.id
 * @param {string} product.name
 * @param {number} product.price
 * @param {string[]} product.tags
 */
export function ProductCard(product) {
   const id = product?.id ?? '';
   const name = product?.name ?? '';
   const price = Number(product?.price ?? 0);
   const tags = Array.isArray(product?.tags) ? product.tags : [];

   // 이미지가 아직 없으니 placeholder 영역만 준비
   return `
    <article class='product-card' data-product-id='${id}'>
      <div class='product-card__thumb' aria-hidden='true'></div>

      <div class='product-card__body'>
        <h3 class='product-card__name'>${name}</h3>
        <p class='product-card__price'>₩ ${formatKRW(price)}</p>

        <ul class='product-card__tags' aria-label='Product Tags'>
          ${tags
             .slice(0, 3)
             .map((t) => `<li class='product-tag'>#${t}</li>`)
             .join('')}
        </ul>

        <div class='product-card__actions'>
          <!-- MVP: 상세 페이지는 나중에. 지금은 버튼만 UI로 둠 -->
          <button type='button' class='btn-add-cart' data-add-cart>
            장바구니
          </button>
        </div>
      </div>
    </article>
  `;
}
