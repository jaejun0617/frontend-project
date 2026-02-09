/**
 * =============================================
 * 📍 위치: src/pages/productDetail/index.js
 * 역할: 상품 상세 페이지
 * 경로: /product/:id
 *
 * ✅ 이번 반영 요구사항
 * 1) 장바구니 클릭 시 토스트
 * 2) 사이즈 있는 상품: 사이즈 미선택 상태로 장바구니/바로구매 클릭하면 "사이즈 선택" 토스트
 * 3) 사이즈 선택 후 다른 사이즈 클릭하면 "변경할까요?" 모달 → 확인 시 변경
 * 4) 바로구매 클릭하면 "장바구니로 이동할까요?" 모달 → 확인 시 /cart 이동
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

   return `
    <div class='product-detail__layout' data-product-id='${product.id}' data-selected-size=''>
      <div class='product-detail__media' aria-hidden='true'></div>

      <div class='product-detail__info'>
        <div class='product-detail__brand'>${product.brand}</div>
        <h2 class='product-detail__name'>${product.name}</h2>

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
                      data-size="${s}"
                      aria-pressed="false"
                      title="사이즈 ${s}"
                    >
                      ${s}
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

   // ✅ 상태(선택된 사이즈)
   let selectedSize = '';

   const sizeWrap = wrap.querySelector('[data-opt-size]');
   const needsSize = Boolean(sizeWrap?.querySelector('[data-size]'));

   /* ==============================
      ✅ Cart → Detail 일관성: 이미 담긴 사이즈가 있으면 상세에서 자동 선택
      - 같은 상품이 여러 사이즈로 담겨있을 수 있으므로 "가장 최근 라인"(state.items는 최신이 앞) 기준 1개만 프리셋
      - UI만 프리셋하고, 사용자는 언제든 다른 사이즈로 변경 가능
   ============================== */

   if (needsSize) {
      const lines = cartStore.getItemsByProductId?.(product.id) ?? [];
      const firstSize = Array.isArray(lines)
         ? String(
              lines.find((l) => l?.options?.size)?.options?.size || '',
           ).trim()
         : '';

      if (firstSize) {
         setSelectedSize(firstSize);
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
      // ✅ 로그인 가드: 비로그인이면 auth로 보내고, 돌아올 경로는 현재 상세로
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

         // ✅ 변경 모달
         const ok = await confirmModal({
            title: '사이즈 변경',
            message: `선택하신 사이즈를 변경할까요?\n\n• 현재: ${selectedSize}\n• 변경: ${nextSize}\n\n확인하면 새로운 사이즈로 바뀝니다.`,
            confirmText: '변경할게요',
            cancelText: '유지할래요',
         });

         if (!ok) return;

         setSelectedSize(nextSize);
         toast.show('사이즈가 변경됐어요 👌', { duration: 1400 });
         return;
      }

      /* ==============================
         2) 장바구니 담기
         - 로그인 가드
         - 사이즈 가드(토스트)
         - 담기 후 토스트
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
         - 로그인 가드
         - 사이즈 가드(토스트)
         - 담기 후 "장바구니 이동" 모달
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
}
