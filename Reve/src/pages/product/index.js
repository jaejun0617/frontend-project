/**
 * =============================================
 * 📍 위치: src/pages/product/index.js
 * 역할: 상품(Product) 리스트 페이지
 * - ProductCard 렌더링
 * - 상품 리스트에서 "담김 상태" 유지(아이콘 빨강 등)
 * - 사이즈 pill 선택 상태를 카드 dataset에 저장 (기본 선택 ❌)
 *
 * ✅ 이번 작업(필터/정렬/페이지네이션)
 * - 가격대(min/max) 입력 필터
 * - 정렬(최신/가격↑/가격↓/HOT/베스트)
 * - 페이지네이션(기본 20개/페이지)
 * - URL 쿼리 동기화 (?min=&max=&sort=&page=)
 *
 * ⚠️ 절대 규칙
 * - bindSizePills()는 수정하지 않는다 (ProductCard + CSS 활성화 영향)
 * =============================================
 */

import { getProducts } from '../../api/products.js';
import { ProductCard } from '../../components/ProductCard.js';
import { cartStore } from '../../store/cartStore.js';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
   { value: 'NEW', label: '최신순' },
   { value: 'PRICE_DESC', label: '가격 높은순' },
   { value: 'PRICE_ASC', label: '가격 낮은순' },
   { value: 'HOT', label: 'HOT' },
   { value: 'BEST', label: '베스트' },
];

const SELECTORS = {
   page: '[data-product-page]',
   grid: '[data-product-grid]',
   controls: '[data-product-controls]',
   minInput: '[data-filter-min]',
   maxInput: '[data-filter-max]',
   sortSelect: '[data-filter-sort]',
   applyBtn: '[data-filter-apply]',
   resetBtn: '[data-filter-reset]',
   summary: '[data-filter-summary]',
   pager: '[data-product-pager]',
   pagerPrev: '[data-page-prev]',
   pagerNext: '[data-page-next]',
   pagerNums: '[data-page-numbers]',
};

function clampInt(n, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
   // ✅ 빈 값은 "미입력"으로 처리 (null)
   if (n == null) return null;
   const raw = String(n).trim();
   if (!raw) return null;

   const v = Number(raw);
   if (!Number.isFinite(v)) return null;

   const i = Math.floor(v);
   return Math.max(min, Math.min(max, i));
}
function getQueryState() {
   const params = new URLSearchParams(window.location.search);

   const min = clampInt(params.get('min'), { min: 0 });
   const max = clampInt(params.get('max'), { min: 0 });

   const sortRaw = String(params.get('sort') || 'NEW').toUpperCase();
   const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'NEW';

   const page = clampInt(params.get('page'), { min: 1, max: 9999 }) || 1;

   // ✅ min > max 방지
   const safeMin = min != null ? min : null;
   const safeMax = max != null ? max : null;
   if (safeMin != null && safeMax != null && safeMin > safeMax) {
      return { min: safeMax, max: safeMin, sort, page };
   }

   return { min: safeMin, max: safeMax, sort, page };
}

function setQueryState(next) {
   const params = new URLSearchParams(window.location.search);

   const min = next?.min;
   const max = next?.max;
   const sort = String(next?.sort || 'NEW').toUpperCase();
   const page = Number(next?.page || 1);

   // min/max
   if (min == null || min === '') params.delete('min');
   else params.set('min', String(min));

   if (max == null || max === '') params.delete('max');
   else params.set('max', String(max));

   // sort/page
   params.set(
      'sort',
      SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'NEW',
   );
   params.set('page', String(page >= 1 ? page : 1));

   const qs = params.toString();
   const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;

   // ✅ 라우터를 태우지 않고(재마운트 방지) URL만 갱신
   window.history.replaceState({}, '', url);
}

function formatKRW(value) {
   return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

function getDisplayBadge(product, type) {
   const tags = Array.isArray(product?.tags) ? product.tags : [];
   if (type === 'HOT') return tags.includes('HOT');
   if (type === 'BEST') return tags.includes('베스트');
   return false;
}

function applyFilterSort(products, { min, max, sort }) {
   const list = Array.isArray(products) ? products : [];

   // 1) filter
   const filtered = list.filter((p) => {
      const price = Number(p?.price ?? 0);
      if (!Number.isFinite(price)) return false;

      if (min != null && price < Number(min)) return false;
      if (max != null && price > Number(max)) return false;
      return true;
   });

   // 2) sort
   const sorted = [...filtered].sort((a, b) => {
      const ap = Number(a?.price ?? 0);
      const bp = Number(b?.price ?? 0);

      if (sort === 'PRICE_ASC') return ap - bp;
      if (sort === 'PRICE_DESC') return bp - ap;

      if (sort === 'HOT') {
         const ah = getDisplayBadge(a, 'HOT') ? 1 : 0;
         const bh = getDisplayBadge(b, 'HOT') ? 1 : 0;
         if (bh !== ah) return bh - ah;
         // HOT 동률이면 최신(목업 기준: id 내 숫자 큰 게 최신처럼 보이게)
         return String(b?.id || '').localeCompare(String(a?.id || ''));
      }

      if (sort === 'BEST') {
         const ab = getDisplayBadge(a, 'BEST') ? 1 : 0;
         const bb = getDisplayBadge(b, 'BEST') ? 1 : 0;
         if (bb !== ab) return bb - ab;
         return String(b?.id || '').localeCompare(String(a?.id || ''));
      }

      // NEW: 최신(목업에서는 id로)
      return String(b?.id || '').localeCompare(String(a?.id || ''));
   });

   return sorted;
}

function paginate(items, page, pageSize) {
   const total = items.length;
   const totalPages = Math.max(1, Math.ceil(total / pageSize));
   const safePage = Math.min(Math.max(1, page), totalPages);

   const start = (safePage - 1) * pageSize;
   const end = start + pageSize;

   return {
      page: safePage,
      total,
      totalPages,
      pageSize,
      slice: items.slice(start, end),
   };
}

function renderControls(state) {
   const { min, max, sort } = state;

   return `
    <section class="product-toolbar" data-product-controls aria-label="상품 필터">
      <div class="product-toolbar__row">
        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-min">가격(최소)</label>
          <input
            id="filter-min"
            class="product-toolbar__input"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="예: 300000"
            data-filter-min
            value="${min != null ? String(min) : ''}"
          />
        </div>

        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-max">가격(최대)</label>
          <input
            id="filter-max"
            class="product-toolbar__input"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="예: 2000000"
            data-filter-max
            value="${max != null ? String(max) : ''}"
          />
        </div>

        <div class="product-toolbar__field">
          <label class="product-toolbar__label" for="filter-sort">정렬</label>
          <select id="filter-sort" class="product-toolbar__select" data-filter-sort>
            ${SORT_OPTIONS.map(
               (o) =>
                  `<option value="${o.value}" ${o.value === sort ? 'selected' : ''}>${o.label}</option>`,
            ).join('')}
          </select>
        </div>

        <div class="product-toolbar__actions">
          <button type="button" class="btn" data-filter-apply>적용</button>
          <button type="button" class="btn subtle" data-filter-reset>초기화</button>
        </div>
      </div>

      <div class="product-toolbar__meta">
        <p class="product-toolbar__summary muted" data-filter-summary></p>
      </div>
    </section>
  `;
}

function renderPager({ page, totalPages }) {
   return `
    <nav class="product-pager" data-product-pager aria-label="상품 페이지네이션">
      <button type="button" class="btn subtle" data-page-prev ${page <= 1 ? 'disabled' : ''}>
        이전
      </button>

      <div class="product-pager__numbers" data-page-numbers></div>

      <button type="button" class="btn subtle" data-page-next ${page >= totalPages ? 'disabled' : ''}>
        다음
      </button>
    </nav>
  `;
}

function buildPageNumbers({ page, totalPages }) {
   // ✅ 너무 길어지지 않게: 현재 기준 ±2 + 처음/끝
   const windowSize = 2;
   const set = new Set([1, totalPages]);

   for (let i = page - windowSize; i <= page + windowSize; i++) {
      if (i >= 1 && i <= totalPages) set.add(i);
   }

   const nums = Array.from(set).sort((a, b) => a - b);

   // gap 처리(…)
   const out = [];
   for (let i = 0; i < nums.length; i++) {
      const cur = nums[i];
      const prev = nums[i - 1];
      if (i > 0 && cur - prev > 1) out.push('…');
      out.push(cur);
   }

   return out;
}

export const ProductPage = () => {
   return `
    <section class='page product-page' aria-label='Product Page' data-product-page>
      <header class='page__header'>
        <h1 class='page__title'>상품</h1>
        <p class='page__desc'>목업 데이터 기반 상품 리스트 (MVP)</p>
      </header>

      <div class='page__content'>
        <!-- ✅ 필터/정렬/요약 -->
        <div data-product-controls-slot>
          ${renderControls(getQueryState())}
        </div>

        <!-- ✅ 리스트 -->
        <div class='product-grid' data-product-grid>
          <p class='loading'>불러오는 중...</p>
        </div>

        <!-- ✅ 페이지네이션 -->
        <div data-product-pager-slot></div>
      </div>
    </section>
  `;
};

export async function initProductPage() {
   const root = document.querySelector('[data-product-page]');
   const gridEl = document.querySelector('[data-product-grid]');
   if (!root || !gridEl) return;

   // ✅ 라우팅 재진입 시 이벤트/구독 중복 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const controlsSlot = root.querySelector('[data-product-controls-slot]');
   const pagerSlot = root.querySelector('[data-product-pager-slot]');

   /**
    * ✅ 카드 UI를 "현재 cartStore 상태"에 맞춰 동기화
    * - 담긴 상품이면: card에 is-in-cart 클래스/데이터 부여
    * - 나중에 CSS에서 아이콘 배경 빨강 처리하기 쉬움
    */
   const syncCartUi = () => {
      const cards = gridEl.querySelectorAll('[data-product-id]');
      cards.forEach((card) => {
         const productId = card.getAttribute('data-product-id');
         if (!productId) return;

         // 이 상품이 장바구니에 1개라도 담겼는지
         const inCart = cartStore.hasLine(productId);

         card.classList.toggle('is-in-cart', inCart);
         card.dataset.inCart = inCart ? '1' : '0';

         // (선택) 담김 수량/라인 수 표시하고 싶으면 여기서 가능
         // const lines = cartStore.getItemsByProductId(productId);
         // card.dataset.inCartLines = String(lines.length);
      });
   };

   /**
    * ✅ 사이즈 pill UI 상태 처리
    * - ProductCard에서 아래 훅을 제공한다고 가정:
    *   - card: data-product-id + data-selected-size(초기값은 빈 문자열 권장)
    *   - pill: [data-size-pill] + data-size="S|M|..."
    *
    * - 클릭하면:
    *   - 같은 카드 내 pill만 토글
    *   - 선택값을 card.dataset.selectedSize에 저장
    *   - 다시 클릭하면 선택 해제도 가능(사용자 실수 방지)
    */
   const bindSizePills = () => {
      gridEl.addEventListener('click', (e) => {
         const pill = e.target.closest('[data-size-pill]');
         if (!pill) return;

         const card = pill.closest('[data-product-id]');
         if (!card) return;

         const picked = String(pill.getAttribute('data-size') || '').trim();
         if (!picked) return;

         const prev = String(card.getAttribute('data-selected-size') || '');

         // 같은 사이즈를 다시 누르면 해제(토글)
         const next = prev === picked ? '' : picked;

         // 카드 dataset 업데이트
         card.setAttribute('data-selected-size', next);

         // 같은 카드 안의 pill 상태 갱신
         card.querySelectorAll('[data-size-pill]').forEach((el) => {
            const v = String(el.getAttribute('data-size') || '').trim();
            const active = next && v === next;

            el.classList.toggle('is-active', active);

            // 접근성: 버튼이면 aria-pressed, 그 외는 aria-selected
            if (el.tagName === 'BUTTON') {
               el.setAttribute('aria-pressed', active ? 'true' : 'false');
            } else {
               el.setAttribute('aria-selected', active ? 'true' : 'false');
            }
         });
      });
   };

   // ✅ 이벤트 위임(1회)
   bindSizePills();

   // ✅ 원본 상품 캐시(페이지 내부에서 필터/정렬/페이지네이션은 in-memory 처리)
   let allProducts = [];

   function readControlsState() {
      const minEl = root.querySelector(SELECTORS.minInput);
      const maxEl = root.querySelector(SELECTORS.maxInput);
      const sortEl = root.querySelector(SELECTORS.sortSelect);

      const min = clampInt(minEl?.value, { min: 0 });
      const max = clampInt(maxEl?.value, { min: 0 });
      const sortRaw = String(sortEl?.value || 'NEW').toUpperCase();
      const sort = SORT_OPTIONS.some((o) => o.value === sortRaw)
         ? sortRaw
         : 'NEW';

      // ✅ min/max 역전 방지
      if (min != null && max != null && min > max) {
         return { min: max, max: min, sort };
      }

      return { min: min ?? null, max: max ?? null, sort };
   }

   function paint({ page } = {}) {
      const qs = getQueryState();
      const controls = readControlsState();

      const nextState = {
         min: controls.min,
         max: controls.max,
         sort: controls.sort,
         page: page ?? qs.page ?? 1,
      };

      // ✅ URL 동기화
      setQueryState(nextState);

      // ✅ 필터 + 정렬
      const processed = applyFilterSort(allProducts, nextState);

      // ✅ 페이징
      const paged = paginate(processed, nextState.page, PAGE_SIZE);

      // ✅ 그리드 렌더
      if (!paged.slice.length) {
         gridEl.innerHTML = `
           <div class="empty">
             <p class="empty__title">조건에 맞는 상품이 없습니다.</p>
             <p class="empty__desc">가격 범위를 조정하거나 초기화해 보세요.</p>
           </div>
         `;
      } else {
         gridEl.innerHTML = paged.slice.map(ProductCard).join('');
      }

      // ✅ 장바구니 상태 반영
      syncCartUi();

      // ✅ 요약 문구
      const summaryEl = root.querySelector(SELECTORS.summary);
      if (summaryEl) {
         const parts = [];
         if (nextState.min != null)
            parts.push(`₩${formatKRW(nextState.min)} 이상`);
         if (nextState.max != null)
            parts.push(`₩${formatKRW(nextState.max)} 이하`);
         parts.push(
            `정렬: ${SORT_OPTIONS.find((o) => o.value === nextState.sort)?.label || '최신순'}`,
         );

         summaryEl.textContent = `총 ${paged.total}개 · ${parts.join(' / ')} · ${paged.page}/${paged.totalPages} 페이지`;
      }

      // ✅ 페이지네이션 렌더
      if (pagerSlot) {
         pagerSlot.innerHTML = renderPager({
            page: paged.page,
            totalPages: paged.totalPages,
         });

         const numsEl = root.querySelector(SELECTORS.pagerNums);
         if (numsEl) {
            const nums = buildPageNumbers({
               page: paged.page,
               totalPages: paged.totalPages,
            });
            numsEl.innerHTML = nums
               .map((n) => {
                  if (n === '…')
                     return `<span class="pager-ellipsis" aria-hidden="true">…</span>`;
                  const active = Number(n) === paged.page;
                  return `
                    <button
                      type="button"
                      class="pager-num ${active ? 'is-active' : ''}"
                      data-page-num="${n}"
                      aria-current="${active ? 'page' : 'false'}"
                    >
                      ${n}
                    </button>
                  `;
               })
               .join('');
         }
      }
   }

   // ✅ 컨트롤/페이지네이션 이벤트(페이지 루트 1회 위임)
   root.addEventListener('click', (e) => {
      const applyBtn = e.target.closest(SELECTORS.applyBtn);
      if (applyBtn) {
         paint({ page: 1 });
         return;
      }

      const resetBtn = e.target.closest(SELECTORS.resetBtn);
      if (resetBtn) {
         const minEl = root.querySelector(SELECTORS.minInput);
         const maxEl = root.querySelector(SELECTORS.maxInput);
         const sortEl = root.querySelector(SELECTORS.sortSelect);

         if (minEl) minEl.value = '';
         if (maxEl) maxEl.value = '';
         if (sortEl) sortEl.value = 'NEW';

         paint({ page: 1 });
         return;
      }

      const prevBtn = e.target.closest(SELECTORS.pagerPrev);
      if (prevBtn && !prevBtn.disabled) {
         const qs = getQueryState();
         paint({ page: Math.max(1, qs.page - 1) });
         return;
      }

      const nextBtn = e.target.closest(SELECTORS.pagerNext);
      if (nextBtn && !nextBtn.disabled) {
         const qs = getQueryState();
         paint({ page: qs.page + 1 });
         return;
      }

      const numBtn = e.target.closest('[data-page-num]');
      if (numBtn) {
         const p = clampInt(numBtn.getAttribute('data-page-num'), {
            min: 1,
            max: 9999,
         });
         if (!p) return;
         paint({ page: p });
      }
   });

   // ✅ Enter로도 적용되게 (input에서 Enter 누르면)
   root.addEventListener('keydown', (e) => {
      const isInControls = Boolean(e.target?.closest?.(SELECTORS.controls));
      if (!isInControls) return;
      if (e.key !== 'Enter') return;

      const tag = String(e.target?.tagName || '').toUpperCase();
      // select에서 Enter는 기본 동작이 애매해서 제외
      if (tag === 'SELECT') return;

      e.preventDefault();
      paint({ page: 1 });
   });

   try {
      const products = await getProducts();
      allProducts = Array.isArray(products) ? products : [];

      // ✅ 첫 진입 시 URL 쿼리 기준으로 컨트롤 UI를 다시 그려도 좋지만,
      // 여기서는 템플릿에서 이미 반영했으므로 그대로 사용.
      // (혹시 라우팅 렌더 타이밍 이슈가 있으면 아래 1줄로 강제 재렌더 가능)
      if (controlsSlot)
         controlsSlot.innerHTML = renderControls(getQueryState());

      // ✅ 최초 페인트
      paint({ page: getQueryState().page });
   } catch (err) {
      gridEl.innerHTML = `
        <p class='error'>상품을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>
      `;
      console.error('[product] load failed:', err);
      return;
   }

   /**
    * ✅ cartStore가 바뀔 때마다(담기/삭제/옵션변경/로그인 스위칭)
    * 상품 리스트의 “담김 상태”도 자동으로 업데이트
    *
    * ⚠️ 여기서 unsubscribe를 저장해두고 싶다면,
    * 라우터에 페이지 unmount 훅이 있을 때 해제하는 구조로 확장 가능.
    * (지금은 sync 함수가 DOM 없으면 자연스럽게 영향이 적어서 MVP로 OK)
    */
   cartStore.subscribe(() => {
      // grid가 이미 다른 페이지로 바뀌었으면 안전하게 스킵
      const stillHere = document.querySelector('[data-product-grid]');
      if (!stillHere) return;
      syncCartUi();
   });
}
