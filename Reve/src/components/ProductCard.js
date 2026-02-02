/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI(이름/가격/태그 등) 렌더링용 컴포넌트
 * 사용처: Product/Search 페이지에서 반복 렌더링(map/loop)
 * =============================================
 */

function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(value);
}

function toPercent(rate) {
   const n = Number(rate || 0);
   return Math.round(n * 100);
}

/**
 * 상품 카드 컴포넌트
 * @param {Object} product
 * @param {string} product.id
 * @param {string} product.name
 * @param {string} product.brand
 * @param {number} product.price            // 최종가(세일 반영)
 * @param {number} product.basePrice        // 정가
 * @param {number} product.discountRate     // 세일율(0~1)
 * @param {boolean} product.couponEligible  // 쿠폰 가능 여부
 * @param {string[]} product.tags           // displayTags + searchTokens 섞여 있음
 */
export function ProductCard(product) {
   const id = product?.id ?? '';
   const name = product?.name ?? '';
   const brand = product?.brand ?? '';

   const price = Number(product?.price ?? 0);
   const basePrice = Number(product?.basePrice ?? 0);
   const discountRate = Number(product?.discountRate ?? 0);

   const couponEligible = Boolean(product?.couponEligible);
   const tags = Array.isArray(product?.tags) ? product.tags : [];

   // ✅ 세일 여부 판단
   const hasDiscount = basePrice > 0 && price > 0 && price < basePrice;
   const discountPercent = hasDiscount ? toPercent(discountRate) : 0;

   // ✅ UI에 보여줄 태그만 추려내기
   // - tags에는 검색 토큰이 많으니, 카드용으로만 제한
   // - 정책: brand(영문) + (신상/베스트/HOT 중 0~1개)
   const displayTags = [brand, '신상', '베스트', 'HOT'];
   const visibleTags = tags.filter((t) => displayTags.includes(t)).slice(0, 2);

   return `
   <article class='product-card' data-product-id='${id}'>
     <div class='product-card__thumb' aria-hidden='true'>
       ${
          hasDiscount
             ? `<span class='product-badge product-badge--sale'>-${discountPercent}%</span>`
             : ''
       }
       ${couponEligible ? `<span class='product-badge product-badge--coupon'>쿠폰</span>` : ''}
     </div>

     <div class='product-card__body'>
       <h3 class='product-card__name'>${name}</h3>

       ${
          hasDiscount
             ? `
           <div class='product-card__pricebox' aria-label='Price'>
             <p class='product-card__price'>₩ ${formatKRW(price)}</p>
             <p class='product-card__base'>₩ ${formatKRW(basePrice)}</p>
           </div>
         `
             : `
           <p class='product-card__price'>₩ ${formatKRW(price)}</p>
         `
       }

       <ul class='product-card__tags' aria-label='Product Tags'>
         ${visibleTags.map((t) => `<li class='product-tag'>#${t}</li>`).join('')}
       </ul>

       <div class='product-card__actions'>
         <button type='button' class='btn-add-cart' data-add-cart>
           장바구니
         </button>
       </div>
     </div>
   </article>
 `;
}
