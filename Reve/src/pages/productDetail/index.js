/**
 * =============================================
 * 📍 위치: src/pages/productDetail/index.js
 * 역할: 상품 상세 페이지
 * 경로: /product/:id
 *
 * ✅ 요구사항
 * 1) 장바구니 클릭 시 토스트
 * 2) 사이즈 있는 상품: 사이즈 미선택 상태로 장바구니/바로구매 클릭하면 "사이즈 선택" 토스트
 * 3) 사이즈 선택 후 다른 사이즈 클릭하면 "변경할까요?" 모달 → 확인 시 변경
 * 4) 바로구매 클릭하면 "장바구니로 이동할까요?" 모달 → 확인 시 /cart 이동
 *
 * ✅ 추가(이번 반영)
 * - product-detail__media → 실제 이미지 갤러리(메인 + 썸네일)
 * - images 없으면 image/imageUrl/thumbnail로 대체 구성
 * - 안전한 이미지 스킴만 허용 + fallback placeholder
 *
 * ✅ 스타일 방향
 * - 상품리스트(ProductCard)와 같은 “동그란 사이즈 pill” UI로 통일 (size-pill 클래스 재사용)
 * =============================================
 */

import { getProductById } from '../../api/products.js';
import { cartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/format.js';

import { requireAuth } from '../../utils/guards.js';
import { confirmModal } from '../../components/ConfirmModal.js';
import { initToast } from '../../components/Toast.js';

export function ProductDetailPage() {
   return `
    <section class='page product-detail-page' aria-label='Product Detail Page'>
      <header class='page__header'>
        <a class='btn' href='/product' data-link>← 상품 목록</a>
        <h1 class='page__title'>상품 상세</h1>
        <p class='page__desc'>옵션을 선택하고 장바구니에 담아보세요.</p>
      </header>

      <div class='page__content'>
        <div class='product-detail' data-detail>
          <p class='loading'>불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
}

function renderNotFound() {
   return `
    <div class='product-detail__empty'>
      <p>상품을 찾을 수 없어요.</p>
      <a class='btn' href='/product' data-link>상품 목록으로</a>
    </div>
  `;
}

/* =========================================================
   Safe HTML / Image helpers
   ========================================================= */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function buildPlaceholderImage({ id, name }) {
   const text = encodeURIComponent(`${name || 'product'}\n${id || ''}`);
   return `https://placehold.co/900x900?text=${text}`;
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

function toSafeImage(url, { id, name }) {
   const raw = String(url || '').trim();
   if (raw && isSafeImageUrl(raw)) return raw;
   return buildPlaceholderImage({ id, name });
}

/**
 * ✅ product에서 갤러리 이미지 목록 구성
 * 우선순위:
 * - product.images (배열)
 * - product.image / imageUrl / thumbnail (단일)
 * - 기타 흔한 필드들 (product.image?.src 등)
 */
function getGalleryImages(product) {
   const id = String(product?.id ?? '').trim();
   const name = String(product?.name ?? '').trim();

   const pool = [];

   // 1) images 배열 지원
   if (Array.isArray(product?.images)) {
      product.images.forEach((it) => {
         // string or {src}
         const src = typeof it === 'string' ? it : it?.src;
         if (src) pool.push(String(src));
      });
   }

   // 2) 단일 이미지 후보들
   const candidates = [
      product?.image?.src,
      product?.image,
      product?.imageUrl,
      product?.thumbnail,
      product?.thumb,
      product?.mainImage,
   ];

   candidates.forEach((c) => {
      if (c) pool.push(String(c));
   });

   // 중복 제거 + 안전 처리
   const uniq = [];
   const seen = new Set();
   pool.forEach((u) => {
      const s = String(u || '').trim();
      if (!s) return;
      if (seen.has(s)) return;
      seen.add(s);
      uniq.push(toSafeImage(s, { id, name }));
   });

   // 최소 1장 보장
   if (!uniq.length) {
      uniq.push(buildPlaceholderImage({ id, name }));
   }

   return uniq;
}

/**
 * ✅ 상품 사이즈 옵션 합치기 (ProductCard와 동일 규칙)
 */
function getSizeOptions(product) {
   const apparel = Array.isArray(product?.apparelSizes)
      ? product.apparelSizes
      : [];
   const shoe = Array.isArray(product?.shoeSizes) ? product.shoeSizes : [];

   return [...apparel, ...shoe.map((s) => String(s))]
      .map((v) => String(v).trim())
      .filter(Boolean);
}

function renderDetail(product) {
   const hasSale = Number(product.discountRate ?? 0) > 0;
   const basePrice = Number(product.basePrice ?? product.price ?? 0);
   const price = Number(product.price ?? 0);

   const sizes = getSizeOptions(product);
   const needsSize = sizes.length > 0;

   const gallery = getGalleryImages(product);
   const mainSrc = gallery[0];

   const safeId = escapeHtml(String(product.id));
   const safeName = escapeHtml(String(product.name ?? '상품'));
   const safeBrand = escapeHtml(String(product.brand ?? ''));

   const fallback = escapeHtml(
      buildPlaceholderImage({
         id: String(product.id),
         name: String(product.name),
      }),
   );

   return `
    <div class='product-detail__layout' data-product-id='${safeId}' data-selected-size=''>

      <!-- ✅ Real media gallery -->
      <div class='product-detail__media'>
        <div class="pd-gallery" data-gallery>
          <div class="pd-gallery__main">
            <img
              class="pd-gallery__img"
              src="${escapeHtml(mainSrc)}"
              alt="${safeName}"
              loading="eager"
              decoding="async"
              data-gallery-main
              onerror="this.onerror=null; this.src='${fallback}';"
            />
          </div>

          ${
             gallery.length > 1
                ? `
            <div class="pd-gallery__thumbs" aria-label="상품 이미지 썸네일" data-gallery-thumbs>
              ${gallery
                 .map((src, idx) => {
                    const isActive = idx === 0;
                    return `
                      <button
                        type="button"
                        class="pd-thumb ${isActive ? 'is-active' : ''}"
                        data-thumb
                        data-thumb-idx="${idx}"
                        aria-label="썸네일 ${idx + 1}"
                      >
                        <img
                          src="${escapeHtml(src)}"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          onerror="this.onerror=null; this.src='${fallback}';"
                        />
                      </button>
                    `;
                 })
                 .join('')}
            </div>
          `
                : ``
          }
        </div>
      </div>

      <div class='product-detail__info'>
        <div class='product-detail__brand'>${safeBrand}</div>
        <h2 class='product-detail__name'>${safeName}</h2>

        <div class='product-detail__price'>
          ${hasSale ? `<span class='pd-base'>₩ ${formatPrice(basePrice)}</span>` : ''}
          <strong class='pd-final'>₩ ${formatPrice(price)}</strong>
          ${hasSale ? `<span class='pd-rate'>-${Math.round(product.discountRate * 100)}%</span>` : ''}
        </div>

        ${
           needsSize
              ? `
            <div class='product-detail__option'>
              <p class='pd-label'>사이즈</p>

              <!-- ✅ 상품리스트와 같은 pill UI -->
              <div class='product-detail__sizes' data-opt-size aria-label="사이즈 선택">
                ${sizes
                   .map(
                      (s) => `
                    <button
                      type="button"
                      class="size-pill"
                      data-detail-size-pill
                      data-size="${escapeHtml(s)}"
                      aria-pressed="false"
                      title="사이즈 ${escapeHtml(s)}"
                    >
                      ${escapeHtml(s)}
                    </button>
                  `,
                   )
                   .join('')}
              </div>
            </div>
          `
              : ''
        }

        <div class='product-detail__actions'>
          <!-- ✅ disabled 속성은 제거: 클릭 시 토스트/모달로 안내하기 위함 -->
          <button type='button' class='btn' data-detail-add>장바구니</button>
          <button type='button' class='btn primary' data-detail-buy>바로구매</button>
        </div>

        <p class='pd-hint'>
          ${needsSize ? '사이즈 선택 후 구매할 수 있어요.' : '바로 장바구니에 담을 수 있어요.'}
        </p>
      </div>
    </div>
  `;
}

export async function initProductDetailPage(params) {
   const toast = initToast();

   const id = params?.id;
   const wrap = document.querySelector('[data-detail]');
   if (!wrap) return;

   const product = await getProductById(id);
   if (!product) {
      wrap.innerHTML = renderNotFound();
      return;
   }

   wrap.innerHTML = renderDetail(product);

   const layout = wrap.querySelector('[data-product-id]');
   if (!layout) return;

   /* ==============================
      ✅ Gallery state + bind
   ============================== */

   const galleryImages = getGalleryImages(product);
   const mainImg = wrap.querySelector('[data-gallery-main]');
   const thumbsWrap = wrap.querySelector('[data-gallery-thumbs]');

   let activeThumbIdx = 0;

   function setActiveImage(nextIdx) {
      const idx = Math.max(
         0,
         Math.min(galleryImages.length - 1, Number(nextIdx || 0)),
      );
      activeThumbIdx = idx;

      if (mainImg) {
         mainImg.src = galleryImages[idx];
      }

      if (thumbsWrap) {
         thumbsWrap.querySelectorAll('[data-thumb]').forEach((b) => {
            const bi = Number(b.getAttribute('data-thumb-idx') || 0);
            b.classList.toggle('is-active', bi === idx);
         });
      }
   }

   /* ==============================
      ✅ 상태(선택된 사이즈, 프리셋 라인 key)
   ============================== */

   let selectedSize = '';
   let selectedLineKey = '';

   const sizeWrap = wrap.querySelector('[data-opt-size]');
   const needsSize = Boolean(sizeWrap?.querySelector('[data-size]'));

   /* ==============================
      ✅ Cart → Detail 일관성: 이미 담긴 사이즈가 있으면 상세에서 자동 선택
      - 같은 상품이 여러 사이즈로 담겨있을 수 있으므로 "가장 최근 라인"(items는 최신이 앞) 기준 1개만 프리셋
      - UI만 프리셋하고, 사용자는 언제든 다른 사이즈로 변경 가능
   ============================== */

   if (needsSize) {
      const lines = cartStore.getItemsByProductId?.(product.id) ?? [];

      const pickedLine = Array.isArray(lines)
         ? lines.find((l) => l?.options?.size)
         : null;

      const presetSize = String(pickedLine?.options?.size || '').trim();
      const presetKey = String(pickedLine?.key || '').trim();

      if (presetSize) {
         selectedLineKey = presetKey;
         setSelectedSize(presetSize);
      }
   }

   function setSelectedSize(next) {
      selectedSize = String(next || '').trim();
      layout.setAttribute('data-selected-size', selectedSize);

      // ✅ UI 동기화(클래스 + aria-pressed)
      sizeWrap?.querySelectorAll('[data-detail-size-pill]').forEach((b) => {
         const v = String(b.getAttribute('data-size') || '').trim();
         const on = Boolean(selectedSize) && v === selectedSize;
         b.classList.toggle('is-active', on);
         b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
   }

   function ensureAuthOrRedirect() {
      return requireAuth({
         redirectTo: window.location.pathname || `/product/${product.id}`,
      });
   }

   function guardSizeOrToast() {
      if (!needsSize) return true;
      if (selectedSize) return true;

      toast.show('사이즈를 선택한 뒤 진행해 주세요 👟', { duration: 1400 });
      return false;
   }

   wrap.addEventListener('click', async (e) => {
      /* ==============================
         0) Gallery thumbs
         ============================== */
      const thumbBtn = e.target.closest?.('[data-thumb]');
      if (thumbBtn) {
         const idx = Number(thumbBtn.getAttribute('data-thumb-idx') || 0);
         if (Number.isFinite(idx) && idx !== activeThumbIdx) {
            setActiveImage(idx);
         }
         return;
      }

      /* ==============================
         1) 사이즈 pill 클릭
         - 첫 선택: 즉시 반영
         - 다른 사이즈: 변경 확인 모달
      ============================== */
      const sizeBtn = e.target.closest('[data-detail-size-pill]');
      if (sizeBtn) {
         const nextSize = String(
            sizeBtn.getAttribute('data-size') || '',
         ).trim();
         if (!nextSize) return;

         // ✅ 첫 선택은 바로 적용
         if (!selectedSize) {
            setSelectedSize(nextSize);
            return;
         }

         // ✅ 같은 사이즈 재클릭은 무시(실수 방지)
         if (selectedSize === nextSize) return;

         const ok = await confirmModal({
            title: '사이즈 변경',
            message: `선택하신 사이즈를 변경할까요?\n\n• 현재: ${selectedSize}\n• 변경: ${nextSize}\n\n확인하면 새로운 사이즈로 바뀝니다.`,
            confirmText: '변경할게요',
            cancelText: '유지할래요',
         });

         if (!ok) return;

         setSelectedSize(nextSize);

         // ✅ 프리셋 라인이 있으면 해당 라인 옵션 업데이트(일관성)
         if (selectedLineKey) {
            const r = cartStore.updateOptions?.(selectedLineKey, {
               size: nextSize,
            });
            if (r?.ok && r?.key) selectedLineKey = r.key;
         }

         toast.show('사이즈가 변경됐어요 👌', { duration: 1400 });
         return;
      }

      /* ==============================
         2) 장바구니 담기
      ============================== */
      const add = e.target.closest('[data-detail-add]');
      if (add) {
         const okAuth = ensureAuthOrRedirect();
         if (!okAuth) return;

         if (!guardSizeOrToast()) return;

         const result = await cartStore.addById(product.id, 1, {
            ...(selectedSize ? { size: selectedSize } : {}),
         });

         if (!result?.ok) {
            toast.show(result?.message || '장바구니 담기에 실패했어요.', {
               duration: 1400,
            });
            return;
         }

         if (result?.key) selectedLineKey = String(result.key);

         toast.show(
            selectedSize
               ? `장바구니에 담겼어요 · 사이즈 ${selectedSize}`
               : '장바구니에 담겼어요',
            { duration: 1400 },
         );
         return;
      }

      /* ==============================
         3) 바로구매
      ============================== */
      const buy = e.target.closest('[data-detail-buy]');
      if (buy) {
         const okAuth = ensureAuthOrRedirect();
         if (!okAuth) return;

         if (!guardSizeOrToast()) return;

         const result = await cartStore.addById(product.id, 1, {
            ...(selectedSize ? { size: selectedSize } : {}),
         });

         if (!result?.ok) {
            toast.show(result?.message || '담기에 실패했어요.', {
               duration: 1400,
            });
            return;
         }

         if (result?.key) selectedLineKey = String(result.key);

         const goCart = await confirmModal({
            title: '바로구매',
            message: `상품이 장바구니에 담겼어요.\n\n장바구니로 이동해서 결제를 진행할까요?`,
            confirmText: '장바구니로 이동',
            cancelText: '계속 쇼핑',
         });

         if (!goCart) return;

         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
      }
   });

   // 초기 상태: 0번 이미지 확정(thumb 클래스 동기화)
   if (galleryImages.length > 1) setActiveImage(0);
}
