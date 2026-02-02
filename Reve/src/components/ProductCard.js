/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI
 * - 할인/정가/할인율 표시
 * - 카드 태그: 브랜드(영문) + 뱃지(신상/베스트/HOT)만 노출
 * - 상세 진입: /product/:id (data-link)
 * =============================================
 */

function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

/**
 * HTML 문자열 깨짐/XSS 방지용 최소 escape
 * (템플릿 문자열로 innerHTML에 꽂는 구조라 기본 방어)
 */
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

/**
 * 카드에 보여줄 태그만 추출
 * - 브랜드(영문): product.brand
 * - 뱃지: tags 안에 '신상'|'베스트'|'HOT'가 있으면 추가
 * - 최대 3개 (브랜드 + 뱃지들)
 */
function getDisplayTags(product) {
   const brand = String(product?.brand ?? '').trim();
   const tags = Array.isArray(product?.tags) ? product.tags : [];

   const badgePool = ['신상', '베스트', 'HOT'];
   const badges = badgePool.filter((b) => tags.includes(b));

   return [brand, ...badges].filter(Boolean).slice(0, 3);
}

export function ProductCard(product) {
   const rawId = String(product?.id ?? '').trim();
   const safeId = escapeHtml(rawId);

   const rawName = String(product?.name ?? '').trim();
   const safeName = escapeHtml(rawName);

   const price = Number(product?.price ?? 0);
   const basePrice = Number(product?.basePrice ?? price);
   const discountRate = Number(product?.discountRate ?? 0);
   const image = String(product?.image ?? '').trim();
   const isDiscounted = discountRate > 0 && basePrice > price;
   const percent = calcDiscountPercent(discountRate);

   const displayTags = getDisplayTags(product);

   return `
  <article class='product-card' data-product-id='${safeId}'>
    <a
      class='product-card__thumb'
      href='/product/${safeId}'
      data-link
      aria-label='${escapeHtml(rawName)} 상세 보기'
    ></a>

    <div class='product-card__body'>
      <h3 class='product-card__name'>
        <a href='/product/${safeId}' data-link>${safeName}</a>
      </h3>

      <div class='product-card__pricebox'>
        ${
           isDiscounted
              ? `
              <p class='product-card__base' aria-label='정가'>₩ ${formatKRW(basePrice)}</p>
              <p class='product-card__price' aria-label='할인가'>
                ₩ ${formatKRW(price)}
                <span class='product-card__discount' aria-label='할인율'>-${percent}%</span>
              </p>
            `
              : `<p class='product-card__price'>₩ ${formatKRW(price)}</p>`
        }
      </div>

      <ul class='product-card__tags' aria-label='Product Tags'>
        ${
           displayTags.length
              ? displayTags
                   .map((t) => `<li class='product-tag'>#${escapeHtml(t)}</li>`)
                   .join('')
              : ''
        }
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
