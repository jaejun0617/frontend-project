/**
 * =============================================
 * 위치: src/pages/productDetail/index.js
 * 역할: 상품 상세 페이지
 * 경로: /product/:id
 *
 * 구현 목표(UX)
 * 1) 장바구니 클릭 시 토스트 피드백을 제공한다.
 * 2) 사이즈 옵션이 있는 상품은 “사이즈 미선택” 상태에서
 *    장바구니/바로구매 클릭 시 토스트로 안내한다.
 * 3) 사이즈 선택 후 다른 사이즈 클릭 시 변경 확인 모달을 노출한다.
 * 4) 바로구매 클릭 시 “장바구니로 이동” 확인 모달을 띄우고, 확인 시 /cart로 이동한다.
 *
 * UI 정책
 * - ProductCard와 동일한 사이즈 pill UI(.size-pill)를 재사용한다.
 * - 버튼은 disabled로 막지 않고, 클릭 시 토스트/모달로 안내하여 흐름을 유지한다.
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
        <p class='page__desc'>옵션을 선택하고 장바구니에 담아보시기 바랍니다.</p>
      </header>

      <div class='page__content'>
        <div class='product-detail' data-detail>
          <p class='loading'>불러오는 중입니다...</p>
        </div>
      </div>
    </section>
  `;
}

function renderNotFound() {
   return `
    <div class='product-detail__empty'>
      <p>상품을 찾을 수 없습니다.</p>
      <a class='btn' href='/product' data-link>상품 목록으로 이동합니다</a>
    </div>
  `;
}

/**
 * 상품의 사이즈 옵션을 “표시 가능한 문자열 배열”로 정규화한다.
 * - 의류(apparelSizes) + 신발(shoeSizes)을 하나의 옵션 리스트로 통합한다.
 * - 공백/비정상 값을 제거한다.
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

/**
 * 상세 템플릿을 렌더링한다.
 * - data-selected-size: 현재 선택 사이즈(상태 동기화용)이다.
 * - 사이즈 옵션이 있는 경우에만 옵션 섹션을 출력한다.
 */
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
          <button type='button' class='btn' data-detail-add>장바구니</button>
          <button type='button' class='btn primary' data-detail-buy>바로구매</button>
        </div>

        <p class='pd-hint'>
          ${needsSize ? '사이즈 선택 후 구매할 수 있습니다.' : '바로 장바구니에 담을 수 있습니다.'}
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

   // 유효하지 않은 id/데이터인 경우: 안전하게 빈 상태로 종료한다.
   if (!product) {
      wrap.innerHTML = renderNotFound();
      return;
   }

   wrap.innerHTML = renderDetail(product);

   const layout = wrap.querySelector('[data-product-id]');
   if (!layout) return;

   /**
    * 로컬 상태: 현재 선택 사이즈를 관리한다.
    * - DOM(data-selected-size)와 동기화하여 디버깅/확장에 유리하도록 유지한다.
    */
   let selectedSize = '';

   const sizeWrap = wrap.querySelector('[data-opt-size]');

   // 사이즈 옵션 섹션이 있으면 “사이즈 선택이 필요한 상품”으로 간주한다.
   const needsSize = Boolean(sizeWrap?.querySelector('[data-size]'));

   /**
    * 선택된 사이즈를 저장하고, UI(pill 상태/aria)를 즉시 동기화한다.
    */
   function setSelectedSize(next) {
      selectedSize = String(next || '').trim();
      layout.setAttribute('data-selected-size', selectedSize);

      sizeWrap?.querySelectorAll('[data-detail-size-pill]').forEach((b) => {
         const v = String(b.getAttribute('data-size') || '').trim();
         const isActive = Boolean(selectedSize) && v === selectedSize;

         b.classList.toggle('is-active', isActive);
         b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
   }

   /**
    * 인증 가드이다.
    * - 비로그인 상태라면 auth 페이지로 이동시키고, 돌아올 경로를 redirectTo로 전달한다.
    * - requireAuth가 false를 반환하면 이후 흐름을 즉시 중단한다.
    */
   function ensureAuthOrRedirect() {
      return requireAuth({
         redirectTo: window.location.pathname || `/product/${product.id}`,
      });
   }

   /**
    * 사이즈 선택 가드이다.
    * - 옵션이 필요한 상품인데 선택이 없으면 토스트로 안내하고 false를 반환한다.
    */
   function guardSizeOrToast() {
      if (!needsSize) return true;
      if (selectedSize) return true;

      toast.show('사이즈를 선택한 뒤 진행해 주시기 바랍니다.', {
         duration: 1400,
      });
      return false;
   }

   /**
    * 이벤트 위임 방식으로 클릭 이벤트를 처리한다.
    * - 상세 페이지 내의 클릭을 한 곳에서 처리하여 바인딩 비용을 줄인다.
    */
   wrap.addEventListener('click', async (e) => {
      /* ------------------------------------------------
         A) 사이즈 pill 선택 처리이다.
         - 최초 선택: 즉시 적용한다.
         - 다른 사이즈: 변경 확인 모달을 띄우고, 확인 시 적용한다.
         - 같은 사이즈 재클릭: 무시한다.
      ------------------------------------------------ */
      const sizeBtn = e.target.closest('[data-detail-size-pill]');
      if (sizeBtn) {
         const nextSize = String(
            sizeBtn.getAttribute('data-size') || '',
         ).trim();
         if (!nextSize) return;

         // 최초 선택은 바로 적용한다.
         if (!selectedSize) {
            setSelectedSize(nextSize);
            return;
         }

         // 같은 사이즈 재클릭은 무시한다.
         if (selectedSize === nextSize) return;

         // 다른 사이즈 선택은 “변경 확인”을 거친다.
         const ok = await confirmModal({
            title: '사이즈 변경',
            message: `선택하신 사이즈를 변경하시겠습니까?\n\n• 현재: ${selectedSize}\n• 변경: ${nextSize}\n\n확인하면 새로운 사이즈로 변경됩니다.`,
            confirmText: '변경합니다',
            cancelText: '유지합니다',
         });

         if (!ok) return;

         setSelectedSize(nextSize);
         toast.show('사이즈가 변경되었습니다.', { duration: 1400 });
         return;
      }

      /* ------------------------------------------------
         B) 장바구니 담기 처리이다.
         - 인증 확인 → 사이즈 확인 → 스토어 반영 → 토스트 피드백 순서로 처리한다.
      ------------------------------------------------ */
      const add = e.target.closest('[data-detail-add]');
      if (add) {
         const okAuth = ensureAuthOrRedirect();
         if (!okAuth) return;

         if (!guardSizeOrToast()) return;

         const result = await cartStore.addById(product.id, 1, {
            ...(selectedSize ? { size: selectedSize } : {}),
         });

         if (!result?.ok) {
            toast.show(result?.message || '장바구니 담기에 실패했습니다.', {
               duration: 1400,
            });
            return;
         }

         toast.show(
            selectedSize
               ? `장바구니에 담겼습니다. (사이즈: ${selectedSize})`
               : '장바구니에 담겼습니다.',
            { duration: 1400 },
         );
         return;
      }

      /* ------------------------------------------------
         C) 바로구매 처리이다.
         - 인증 확인 → 사이즈 확인 → 장바구니 담기 → 장바구니 이동 여부 확인 모달을 진행한다.
      ------------------------------------------------ */
      const buy = e.target.closest('[data-detail-buy]');
      if (buy) {
         const okAuth = ensureAuthOrRedirect();
         if (!okAuth) return;

         if (!guardSizeOrToast()) return;

         const result = await cartStore.addById(product.id, 1, {
            ...(selectedSize ? { size: selectedSize } : {}),
         });

         if (!result?.ok) {
            toast.show(result?.message || '담기에 실패했습니다.', {
               duration: 1400,
            });
            return;
         }

         const goCart = await confirmModal({
            title: '바로구매',
            message:
               '상품이 장바구니에 담겼습니다.\n\n장바구니로 이동하여 결제를 진행하시겠습니까?',
            confirmText: '장바구니로 이동합니다',
            cancelText: '계속 쇼핑합니다',
         });

         if (!goCart) return;

         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
      }
   });
}
