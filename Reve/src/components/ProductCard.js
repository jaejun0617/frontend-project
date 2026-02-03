/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI + 리스트에서 옵션 선택 지원
 * - 장바구니 버튼을 아이콘(favorite.svg)으로 변경
 * - 하단 고정(absolute)용 래퍼 제공
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
   return [...apparel, ...shoeText];
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

   // ✅ 컬러 제거: 사이즈만 지원
   const sizes = getSizeOptions(product);
   const defaultSize = sizes[0] ? String(sizes[0]) : '';
   const hasSize = Boolean(defaultSize);

   return `
  <article class="product-card" data-product-id="${safeId}" data-selected-size="${escapeHtml(defaultSize)}">
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
         hasSize
            ? `
          <div class="product-card__sizes" aria-label="사이즈 선택" data-size-pills>
            ${sizes
               .map((s, idx) => {
                  const v = String(s).trim();
                  if (!v) return '';
                  const isSelected = idx === 0; // 기본값 첫번째
                  return `
                  <button
                    type="button"
                    class="size-pill ${isSelected ? 'is-active' : ''}"
                    data-size-pill
                    data-size-value="${escapeHtml(v)}"
                    aria-pressed="${isSelected ? 'true' : 'false'}"
                  >
                    ${escapeHtml(v)}
                  </button>
                `;
               })
               .join('')}
          </div> 
        `
            : ''
      }
               <div class='br'></div>
      <!-- ✅ 하단 고정 액션 영역 -->
      <div class="product-card__floating">
        <button
          type="button"
          class="cart-fav-btn"
          data-add-cart
          aria-label="장바구니 담기"
          title="장바구니 담기"
        >
          <img src="/src/icons/favorite.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  </article>
  `;
}
