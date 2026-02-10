/**
 * =============================================
 * 📍 위치: src/components/ProductCard.js
 * 역할: 상품 카드 UI
 *
 * ✅ 변경(오늘 1순위)
 * - 상품카드에서 사이즈 UI 제거
 * - 사이즈 선택 없이도 장바구니 담기 가능 (리스트 기준)
 *
 * ✅ 유지
 * - 안전한 이미지 렌더링 (dataURL/blob/http/상대경로)
 * - 위험한 스킴 차단 + 이미지 fallback
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

   // ✅ 할인 표기 규칙
   const isDiscounted = discountRate > 0 && basePrice > price;
   const percent = calcDiscountPercent(discountRate);

   const displayTags = getDisplayTags(product);

   const imgSrc = getSafeImageSrc(product);
   const safeImgSrc = escapeHtml(imgSrc);

   const fallback = buildPlaceholderImage({ id: rawId, name: rawName });
   const safeFallback = escapeHtml(fallback);

   return `
<article class="product-card" data-product-id="${safeId}">
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

    <div class="product-card__pricebox" aria-label="가격 정보">
      ${
         isDiscounted
            ? `
            <span class="product-card__discount" aria-label="할인율">-${percent}%</span>
            <p class="product-card__price" aria-label="할인가">₩ ${formatKRW(price)}</p>
            <p class="product-card__base" aria-label="원가">₩ ${formatKRW(basePrice)}</p>
          `
            : `
            <p class="product-card__price" aria-label="판매가">₩ ${formatKRW(price)}</p>
          `
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
