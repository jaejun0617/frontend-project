/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI + 리스트에서 옵션 선택 지원
 * - 장바구니 버튼을 아이콘(favorite.svg)으로 변경
 * - 하단 고정(absolute)용 래퍼 제공
 * - 사이즈 기본 선택 ❌ (사용자가 직접 선택)
 *
 * ✅ 이번 패치
 * - product.image가 dataURL / blob URL / http(s) / 상대경로 모두 안전 렌더링
 * - 위험한 스킴(javascript: 등) 차단
 * - 이미지 실패 시 placeholder로 fallback
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
   return [...apparel, ...shoe.map((s) => String(s))].filter(Boolean);
}

/* ==============================
✅ Image helpers (safe)
============================== */

function buildPlaceholderImage({ id, name }) {
   const text = encodeURIComponent(`${name || 'product'}\n${id || ''}`);
   return `https://placehold.co/800x800?text=${text}`;
}

function isSafeImageUrl(url) {
   const u = String(url || '').trim();
   if (!u) return false;

   // ✅ allow: dataURL(이미지), blob, http(s), 상대경로(/ ./ ../)
   if (u.startsWith('data:image/')) return true;
   if (u.startsWith('blob:')) return true;
   if (u.startsWith('https://') || u.startsWith('http://')) return true;
   if (u.startsWith('/') || u.startsWith('./') || u.startsWith('../'))
      return true;

   return false;
}

function getSafeImageSrc(product) {
   const raw =
      String(product?.image ?? '').trim() ||
      String(product?.imageUrl ?? '').trim() ||
      String(product?.thumbnail ?? '').trim() ||
      '';

   if (raw && isSafeImageUrl(raw)) return raw;

   return buildPlaceholderImage({
      id: String(product?.id ?? '').trim(),
      name: String(product?.name ?? '').trim(),
   });
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
   const hasSize = sizes.length > 0;

   // ✅ 안전한 이미지 src
   const imgSrc = getSafeImageSrc(product);
   const safeImgSrc = escapeHtml(imgSrc);

   // ✅ 이미지 로딩 실패 시 placeholder로 대체 (dataURL/blob/http 모두 대응)
   const fallback = buildPlaceholderImage({ id: rawId, name: rawName });
   const safeFallback = escapeHtml(fallback);

   return `
<article
class="product-card"
data-product-id="${safeId}"
data-selected-size=""
${hasSize ? `data-requires-size="1"` : ``}
>
<a
  class="product-card__thumb"
  href="/product/${safeId}"
  data-link
  aria-label="${escapeHtml(rawName)} 상세 보기"
>
  <img
    class="product-card__img"
    src="${safeImgSrc}"
    alt="${safeName}"
    loading="lazy"
    decoding="async"
    onerror="this.onerror=null; this.src='${safeFallback}';"
  />
</a>

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
           .map((s) => {
              const v = String(s).trim();
              if (!v) return '';
              return `
               <button
                 type="button"
                 class="size-pill"
                 data-size-pill
                 data-size="${escapeHtml(v)}"
                 data-size-value="${escapeHtml(v)}"
                 aria-pressed="false"
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
