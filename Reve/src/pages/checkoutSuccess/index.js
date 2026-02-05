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

/* ==============================
   1) Safe Utils
============================== */

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
 * timestamp 파싱 방어
 * - 숫자(ms) / ISO 문자열 / Date 모두 대응한다.
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

/* ==============================
   2) Render: Empty
============================== */

function renderEmpty() {
   return `
    <header class="page__header">
      <h1 class="page__title">결제 완료</h1>
      <p class="page__desc">주문 정보를 찾지 못했습니다.</p>
    </header>

    <div class="page__content">
      <div class="empty">
        <p class="empty__title">주문을 확인할 수 없습니다.</p>
        <p class="empty__desc">주문내역에서 다시 확인하시기 바랍니다.</p>

        <div class="actions">
          <a class="btn primary" href="/mypage?tab=orders" data-link>주문내역으로</a>
          <a class="btn" href="/product" data-link>쇼핑 계속하기</a>
        </div>
      </div>
    </div>
  `;
}

/* ==============================
   3) Render: Success
============================== */

function renderSuccess({ order, user }) {
   const pricing = order?.pricing ?? {};
   const coupon = order?.coupon ?? null;

   /**
    * paidAt은 receipt가 없을 수 있으므로 createdAt 기반으로 표시한다.
    * - 향후 저장 구조 변경에도 대응할 수 있도록 우선순위를 둔다.
    */
   const paidAt =
      parseTime(order?.receipt?.paidAt) ??
      parseTime(order?.paidAt) ??
      parseTime(order?.createdAt) ??
      Date.now();

   const items = Array.isArray(order?.items) ? order.items : [];

   /**
    * 결제 이후 최신 유저 상태 기준으로 멤버십을 안내한다.
    * - checkoutTotal은 0으로 둔다(결제 반영이 이미 끝난 상태라는 전제).
    */
   const totalSpent = Number(user?.totalSpent ?? 0);
   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const tierName = String(snap?.current?.name || '실버');
   const earnRate = Number(snap?.earnRate || 0);

   const nextLine = snap?.next
      ? `다음 등급(${snap.next.name})까지 ₩ ${formatPrice(
           Number(snap.remainToNext || 0),
        )} 남았습니다.`
      : '최고 등급을 유지 중입니다.';

   const points = Number(user?.points ?? 0);

   return `
    <header class="page__header">
      <h1 class="page__title">결제 완료</h1>
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
                ? `<p class="muted">외 ${items.length - 5}개 상품은 주문내역에서 확인할 수 있습니다.</p>`
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

/* ==============================
   4) Page
============================== */

export const CheckoutSuccessPage = () => {
   return `
    <section class="page checkout-success" aria-label="Checkout Success" data-checkout-success>
      <div class="page__content">
        <p class="loading">불러오는 중...</p>
      </div>
    </section>
  `;
};

/* ==============================
   5) Init
============================== */

export function initCheckoutSuccessPage() {
   const root = document.querySelector('[data-checkout-success]');
   if (!root) return;

   const orderId = String(getQueryParam('orderId') || '').trim();
   const user = authStore.getUser?.();

   /**
    * 유저별 분리 스토어라면 owner를 맞춘 뒤 주문을 조회한다.
    * - app.js에서 처리해도, 여기서 재설정해도 부작용이 없다.
    */
   const owner = user?.id || 'guest';
   orderStore.setOwner?.(owner);

   const order = orderId ? orderStore.getOrder?.(orderId) : null;

   root.innerHTML = order ? renderSuccess({ order, user }) : renderEmpty();

   root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-go-orders]')) return;

      /**
       * 주문내역 딥링크
       * - /mypage?tab=orders 로 탭을 강제한다.
       * - open=detail&orderId=... 로 상세 모달을 자동 오픈한다(마이페이지 구현 전제).
       */
      const href = orderId
         ? `/mypage?tab=orders&open=detail&orderId=${encodeURIComponent(
              orderId,
           )}`
         : `/mypage?tab=orders`;

      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href } }),
      );
   });
}
