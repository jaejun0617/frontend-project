/**
 * =============================================
 * 📍 위치: src/pages/productDetail/index.js
 * 역할: 상품 상세 페이지
 * 경로: /product/:id
 * =============================================
 */

import { getProductById } from '../../api/products.js';
import { cartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/format.js';

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

function renderDetail(product) {
   const hasSale = Number(product.discountRate ?? 0) > 0;
   const basePrice = Number(product.basePrice ?? product.price ?? 0);
   const price = Number(product.price ?? 0);

   const apparelSizes = Array.isArray(product.apparelSizes)
      ? product.apparelSizes
      : [];
   const shoeSizes = Array.isArray(product.shoeSizes) ? product.shoeSizes : [];
   const colors = Array.isArray(product.colors) ? product.colors : [];

   return `
    <div class='product-detail__layout' data-product-id='${product.id}'>
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
           colors.length
              ? `
          <div class='product-detail__option'>
            <p class='pd-label'>컬러</p>
            <div class='pd-chips' data-opt-color>
              ${colors
                 .map(
                    (c) =>
                       `<button type="button" class="pd-chip" data-color="${c.en}">${c.en}</button>`,
                 )
                 .join('')}
            </div>
          </div>
        `
              : ''
        }

        ${
           apparelSizes.length
              ? `
          <div class='product-detail__option'>
            <p class='pd-label'>사이즈</p>
            <div class='pd-chips' data-opt-size>
              ${apparelSizes.map((s) => `<button type="button" class="pd-chip" data-size="${s}">${s}</button>`).join('')}
            </div>
          </div>
        `
              : ''
        }

        ${
           shoeSizes.length
              ? `
          <div class='product-detail__option'>
            <p class='pd-label'>사이즈</p>
            <div class='pd-chips' data-opt-size>
              ${shoeSizes.map((s) => `<button type="button" class="pd-chip" data-size="${s}">${s}</button>`).join('')}
            </div>
          </div>
        `
              : ''
        }

        <div class='product-detail__actions'>
          <button type='button' class='btn' data-detail-add disabled>장바구니</button>
          <button type='button' class='btn primary' data-detail-buy disabled>바로구매</button>
        </div>

        <p class='pd-hint'>옵션이 있는 상품은 선택 시 버튼이 활성화됩니다.</p>
      </div>
    </div>
  `;
}

export async function initProductDetailPage(params) {
   const id = params?.id;
   const wrap = document.querySelector('[data-detail]');
   if (!wrap) return;

   const product = await getProductById(id);
   if (!product) {
      wrap.innerHTML = renderNotFound();
      return;
   }

   wrap.innerHTML = renderDetail(product);

   let selectedColor = '';
   let selectedSize = '';

   const colorWrap = wrap.querySelector('[data-opt-color]');
   const sizeWrap = wrap.querySelector('[data-opt-size]');

   const needsColor = Boolean(colorWrap?.querySelector('[data-color]'));
   const needsSize = Boolean(sizeWrap?.querySelector('[data-size]'));

   const addBtn = wrap.querySelector('[data-detail-add]');
   const buyBtn = wrap.querySelector('[data-detail-buy]');

   function canPurchase() {
      const okColor = !needsColor || Boolean(selectedColor);
      const okSize = !needsSize || Boolean(selectedSize);
      return okColor && okSize;
   }

   function syncButtons() {
      const can = canPurchase();
      addBtn.disabled = !can;
      buyBtn.disabled = !can;
   }

   function toggleActive(container, selectorAttr, value) {
      if (!container) return;
      container
         .querySelectorAll('.pd-chip')
         .forEach((b) => b.classList.remove('is-active'));
      const target = container.querySelector(`[${selectorAttr}="${value}"]`);
      if (target) target.classList.add('is-active');
   }

   wrap.addEventListener('click', async (e) => {
      const colorBtn = e.target.closest('[data-color]');
      if (colorBtn) {
         selectedColor = colorBtn.getAttribute('data-color') || '';
         toggleActive(colorWrap, 'data-color', selectedColor);
         syncButtons();
         return;
      }

      const sizeBtn = e.target.closest('[data-size]');
      if (sizeBtn) {
         selectedSize = sizeBtn.getAttribute('data-size') || '';
         toggleActive(sizeWrap, 'data-size', selectedSize);
         syncButtons();
         return;
      }

      const add = e.target.closest('[data-detail-add]');
      if (add && !addBtn.disabled) {
         await cartStore.addById(product.id, 1, {
            color: selectedColor,
            size: selectedSize,
         });
         return;
      }

      const buy = e.target.closest('[data-detail-buy]');
      if (buy && !buyBtn.disabled) {
         await cartStore.addById(product.id, 1, {
            color: selectedColor,
            size: selectedSize,
         });

         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
      }
   });

   syncButtons();
}
