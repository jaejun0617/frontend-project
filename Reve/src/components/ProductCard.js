/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI + 리스트에서 "사이즈 칩" 선택 지원
 * - 컬러 옵션 제거
 * - 사이즈 선택은 버튼 칩(원형) UI
 * =============================================
 */

function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function calcDiscountPercent(discountRate) {
   const r = Number(discountRate || 0);
   if (!r) return 0;
   return Math.round(r * 100);
}

function getDisplayTags(product) {
   const brand = String(product?.brand ?? '').trim();
   const tags = Array.isArray(product?.tags) ? product.tags : [];
   const badgePool = ['신상', '베스트', 'HOT'];
   const badges = badgePool.filter((b) => tags.includes(b));
   return [brand, ...badges].filter(Boolean).slice(0, 3);
}

function getSizeOptions(product) {
   const apparel = Array.isArray(product?.apparelSizes)
      ? product.apparelSizes
      : [];
   const shoe = Array.isArray(product?.shoeSizes) ? product.shoeSizes : [];
   const shoeText = shoe.map((s) => String(s));

   const all = [...apparel, ...shoeText]
      .map((v) => String(v).trim())
      .filter(Boolean);

   return Array.from(new Set(all));
}

export function ProductCard(product) {
   const rawId = String(product?.id ?? '').trim();
   const safeId = escapeHtml(rawId);

   const rawName = String(product?.name ?? '').trim();
   const safeName = escapeHtml(rawName);

   const price = Number(product?.price ?? 0);
   const basePrice = Number(product?.basePrice ?? price);
   const discountRate = Number(product?.discountRate ?? 0);
   const isDiscounted = discountRate > 0 && basePrice > price;
   const percent = calcDiscountPercent(discountRate);

   const displayTags = getDisplayTags(product);

   const sizes = getSizeOptions(product);
   const hasSizes = sizes.length > 0;

   return `
 <article
   class="product-card"
   data-product-id="${safeId}"
   data-has-size="${hasSizes ? '1' : '0'}"
   data-selected-size=""
 >
   <a
     class="product-card__thumb"
     href="/product/${safeId}"
     data-link
     aria-label="${escapeHtml(rawName)} 상세 보기"
   ></a>

   <div class="product-card__body">
     <h3 class="product-card__name">
       <a href="/product/${safeId}" data-link>${safeName}</a>
     </h3>

     <div class="product-card__pricebox">
       ${
          isDiscounted
             ? `
             <p class="product-card__base" aria-label="정가">₩ ${formatKRW(basePrice)}</p>
             <p class="product-card__price" aria-label="할인가">
               ₩ ${formatKRW(price)}
               <span class="product-card__discount" aria-label="할인율">-${percent}%</span>
             </p>
           `
             : `<p class="product-card__price">₩ ${formatKRW(price)}</p>`
       }
     </div>

     <ul class="product-card__tags" aria-label="Product Tags">
       ${
          displayTags.length
             ? displayTags
                  .map((t) => `<li class="product-tag">#${escapeHtml(t)}</li>`)
                  .join('')
             : ''
       }
     </ul>

     ${
        hasSizes
           ? `
           <div class="product-card__options" aria-label="사이즈 선택">
             <div class="pc-opt__head">
               <span class="pc-opt__label">사이즈</span>
               <span class="pc-opt__hint" data-size-hint hidden>사이즈를 선택해 주세요</span>
             </div>

             <div class="pc-sizes" role="radiogroup" aria-label="사이즈 옵션">
               ${sizes
                  .map((s) => {
                     const v = String(s).trim();
                     return `
                       <button
                         type="button"
                         class="pc-size"
                         data-size-pill
                         data-size-value="${escapeHtml(v)}"
                         role="radio"
                         aria-checked="false"
                       >
                         ${escapeHtml(v)}
                       </button>
                     `;
                  })
                  .join('')}
             </div>
           </div>
         `
           : ''
     }

     <div class="product-card__actions">
       <button type="button" class="btn-add-cart" data-add-cart>
         장바구니
       </button>
     </div>
   </div>
 </article>
 `;
}
