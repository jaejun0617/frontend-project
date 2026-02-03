/**
 * =============================================
 * 📍 위치: src/pages/checkoutSuccess/index.js
 * 역할: 결제 완료 페이지 (주문 요약/등급/쿠폰 보상 안내)
 * 경로: /checkout/success?orderId=...
 * =============================================
 */

import { orderStore } from '../../store/orderStore.js';
import { authStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/format.js';
import {
   getMembershipSnapshot,
   formatPercent,
} from '../../utils/membership.js';

function escapeHtml(v) {
   return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function getQueryParam(name) {
   const url = new URL(window.location.href);
   return url.searchParams.get(name);
}

/**
 * ✅ timestamp 파싱 방어
 * - 숫자(ms) / ISO 문자열 / Date 모두 대응
 */
function parseTime(input) {
   if (!input) return null;

   if (typeof input === 'number' && Number.isFinite(input)) return input;

   if (typeof input === 'string') {
      const n = Number(input);
      if (Number.isFinite(n)) return n;

      const t = Date.parse(input);
      if (!Number.isNaN(t)) return t;
      return null;
   }

   if (input instanceof Date) {
      const t = input.getTime();
      return Number.isNaN(t) ? null : t;
   }

   return null;
}

function formatDate(ts) {
   const t = parseTime(ts);
   if (!t) return '-';

   return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
   }).format(new Date(t));
}

function renderEmpty() {
   return `
    <header class="page__header">
      <h1 class="page__title">결제 완료</h1>
      <p class="page__desc">주문 정보를 찾지 못했어요.</p>
    </header>

    <div class="page__content">
      <div class="empty">
        <p class="empty__title">주문을 확인할 수 없어요.</p>
        <p class="empty__desc">주문내역에서 다시 확인해 주세요.</p>

        <div class="actions">
          <a class="btn primary" href="/mypage" data-link>마이페이지</a>
          <a class="btn" href="/product" data-link>쇼핑 계속하기</a>
        </div>
      </div>
    </div>
  `;
}

function renderSuccess({ order, user }) {
   const pricing = order?.pricing ?? {};
   const coupon = order?.coupon ?? null;

   // ✅ paidAt: receipt 없을 가능성이 높으니 createdAt 기반으로 표시
   const paidAt =
      parseTime(order?.receipt?.paidAt) ??
      parseTime(order?.paidAt) ?? // 혹시 나중에 저장하면 대응
      parseTime(order?.createdAt) ??
      Date.now();

   const items = Array.isArray(order?.items) ? order.items : [];

   // ✅ 결제 후 최신 유저 기준 멤버십 안내(등급/적립률/다음 등급)
   const totalSpent = Number(user?.totalSpent ?? 0);
   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const tierName = String(snap?.current?.name || '실버');
   const earnRate = Number(snap?.earnRate || 0);

   const nextLine = snap?.next
      ? `다음 등급(${snap.next.name})까지 ₩ ${formatPrice(
           Number(snap.remainToNext || 0),
        )}`
      : '최고 등급 유지 중 👑';

   // ✅ 포인트(이미 authStore에 points 유지 중이면 그대로)
   const points = Number(user?.points ?? 0);

   return `
    <header class="page__header">
      <h1 class="page__title">결제 완료 ✅</h1>
      <p class="page__desc">주문이 정상적으로 접수되었습니다.</p>
    </header>

    <div class="page__content">
      <div class="success-card">
        <div class="success-top">
          <div class="success-row">
            <span class="k">주문번호</span>
            <strong class="v">${escapeHtml(order?.orderId || '-')}</strong>
          </div>
          <div class="success-row">
            <span class="k">결제일시</span>
            <strong class="v">${escapeHtml(formatDate(paidAt))}</strong>
          </div>
          <div class="success-row">
            <span class="k">상태</span>
            <strong class="v pill">${escapeHtml(order?.status || 'PAID')}</strong>
          </div>
        </div>

        <div class="divider"></div>

        <div class="summary">
          <h2 class="title">결제 요약</h2>

          <div class="success-row">
            <span class="k">쿠폰</span>
            <strong class="v">${coupon?.code ? escapeHtml(coupon.code) : '없음'}</strong>
          </div>

          <div class="success-row">
            <span class="k">배송비</span>
            <strong class="v">₩ ${formatPrice(pricing?.shipping ?? 0)}</strong>
          </div>

          <div class="success-row total">
            <span class="k">최종 결제</span>
            <strong class="v">₩ ${formatPrice(pricing?.total ?? 0)}</strong>
          </div>
        </div>

        <div class="divider"></div>

        <div class="summary">
          <h2 class="title">주문 상품</h2>
          <ul class="items" aria-label="Order Items">
            ${items
               .slice(0, 5)
               .map((it) => {
                  const optSize = it?.options?.size
                     ? ` · 사이즈 ${escapeHtml(it.options.size)}`
                     : '';
                  return `
                    <li class="item">
                      <div class="item__name">
                        <strong>${escapeHtml(it?.name || '상품')}</strong>
                        <span class="muted">x${Number(it?.qty || 1)}${optSize}</span>
                      </div>
                      <div class="item__price">₩ ${formatPrice(it?.lineTotal ?? 0)}</div>
                    </li>
                  `;
               })
               .join('')}
          </ul>
          ${
             items.length > 5
                ? `<p class="muted">외 ${
                     items.length - 5
                  }개 상품은 주문내역에서 확인할 수 있어요.</p>`
                : ''
          }
        </div>

        <div class="divider"></div>

        <div class="summary">
          <h2 class="title">멤버십</h2>
          <div class="success-row">
            <span class="k">현재 등급</span>
            <strong class="v">${escapeHtml(tierName)} · 적립 ${escapeHtml(
               formatPercent(earnRate),
            )}</strong>
          </div>
          <div class="success-row">
            <span class="k">보유 포인트</span>
            <strong class="v">${formatPrice(points)}P</strong>
          </div>
          <p class="muted">${escapeHtml(nextLine)}</p>
        </div>

        <div class="actions">
          <button type="button" class="btn primary" data-go-orders>주문내역 보기</button>
          <a class="btn" href="/product" data-link>쇼핑 계속하기</a>
        </div>
      </div>
    </div>
  `;
}

export const CheckoutSuccessPage = () => {
   return `
    <section class="page checkout-success" aria-label="Checkout Success" data-checkout-success>
      <div class="page__content">
        <p class="loading">불러오는 중...</p>
      </div>
    </section>
  `;
};

export function initCheckoutSuccessPage() {
   const root = document.querySelector('[data-checkout-success]');
   if (!root) return;

   const orderId = getQueryParam('orderId');
   const user = authStore.getUser?.();

   // ✅ 유저별 분리 store라면 owner를 맞춰줘야 getOrder가 정확해짐
   // - app.js에서 이미 해도, 여기서 한 번 더 해도 문제 없음(안전)
   const owner = user?.id || 'guest';
   orderStore.setOwner?.(owner);

   const order = orderId ? orderStore.getOrder?.(orderId) : null;

   // ✅ outerHTML 교체 대신 내부만 갱신(라우터/이벤트 꼬임 방지)
   root.innerHTML = order ? renderSuccess({ order, user }) : renderEmpty();

   root.addEventListener('click', (e) => {
      if (e.target.closest('[data-go-orders]')) {
         // ✅ 탭 딥링크까지 하고 싶으면 /mypage?tab=orders 형태 추천
         // 지금은 기본 /mypage로 이동
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/mypage' } }),
         );
      }
   });
}
