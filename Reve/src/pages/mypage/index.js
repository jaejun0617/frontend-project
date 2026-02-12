/**
 * =============================================
 * 📍 위치: src/pages/mypage/index.js
 * 역할: 마이페이지(MVP) + 딥링크(탭/오픈/포커스)
 * 경로: /mypage
 *
 * 딥링크 지원
 * - /mypage?tab=address&open=add                : 배송지 추가 모달 자동 오픈(1회)
 * - /mypage?tab=orders&open=detail&orderId=...  : 주문 상세 모달 자동 오픈(1회)
 * - /mypage?tab=coupon&focus=register           : 쿠폰 입력창 자동 포커스(1회)
 *
 * UX 규칙
 * - 탭 클릭 시 URL의 tab 쿼리를 pushState로 동기화
 * - popstate(뒤로/앞으로가기)에서도 tab + (남아있다면) open/focus 복원
 * - open/focus는 "1회 실행" 후 URL에서 소비(consume)하여 반복 트리거 방지
 *
 * 설계 포인트
 * - 탭 구조 확장 가능
 * - 이벤트는 page root 내부에서 위임 처리
 * - 중복 init 방지(data-bound)
 * - 스토어 변화는 subscribe로 UI 동기화
 * - 입력 폼은 confirmModal이 아닌 별도 모달로 처리(입력 UX)
 *
 * ✅ 최종 안정화
 * - 딥링크(open/focus/orderId) URL 1회 실행 가드로 중복 모달 방지
 * - 초기 렌더는 "현재 탭만 paint"로 최적화 + 중복 트리거 감소
 * - 주문내역의 (테스트) 상태 변경 버튼 제거: 유저 영역은 조회 전용
 *
 * ✅ UI 개선(문고리닷컴 톤)
 * - 좌측: 사이드 메뉴 느낌(타이틀 + 메뉴 버튼)
 * - 우측 상단: 프로필 요약 카드(이름/등급/포인트/쿠폰/주문요약)
 * =============================================
 */

import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';
import { orderStore } from '../../store/orderStore.js';
import { addressStore } from '../../store/addressStore.js';

import { confirmModal } from '../../components/ConfirmModal.js';
import { initToast } from '../../components/Toast.js';

import {
   getMembershipSnapshot,
   formatPercent,
} from '../../utils/membership.js';
import { toStatusTimeline, statusKo } from '../../utils/orderTimeline.js';

/* ==============================
   1) Tabs
============================== */

const TABS = [
   { key: 'profile', label: '내 정보', enabled: true },
   { key: 'address', label: '배송지', enabled: true },
   { key: 'orders', label: '주문내역', enabled: true },
   { key: 'delivery', label: '주문/배송', enabled: true },
   { key: 'grade', label: '회원등급', enabled: true },
   { key: 'coupon', label: '쿠폰/혜택', enabled: true },
];

const DEFAULT_REGISTER_MSG =
   '쿠폰을 등록하면 “보유 쿠폰”에 쌓이고, 장바구니에서 적용됩니다.';

const DEFAULT_TAB = 'coupon';

/* ==============================
   2) Page Template
============================== */

export const MyPage = () => {
   return `
    <section class="page mypage" aria-label="My Page" data-mypage>
      <header class="page__header">
        <h1 class="page__title">마이페이지</h1>
        <p class="page__desc">내 정보/등급/쿠폰/주문/배송지를 관리합니다.</p>
      </header>

      <div class="page__content">
        <div class="mypage__layout">
          <!-- ✅ Left Sidebar -->
          <nav class="mypage__nav" aria-label="MyPage Tabs">
            <div class="mypage__navHead">
              <p class="mypage__navTitle">마이페이지</p>
              <p class="mypage__navSub muted">나의 쇼핑</p>
            </div>
            ${renderTabs(DEFAULT_TAB)}
          </nav>

          <!-- ✅ Right Content -->
          <div class="mypage__main">
            <!-- ✅ Top summary card (문고리닷컴 느낌) -->
            ${renderTopSummarySkeleton()}

            ${renderPanelCoupon()}
            ${renderPanelProfile()}
            ${renderPanelAddress()}
            ${renderPanelOrders()}
            ${renderPanelDelivery()}
            ${renderPanelGrade()}
          </div>
        </div>
      </div>
    </section>
  `;
};

/* ==============================
   3) Shared helpers
============================== */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function formatKRW(n) {
   const v = Number(n || 0);
   const safe = Number.isFinite(v) ? v : 0;
   return new Intl.NumberFormat('ko-KR').format(Math.max(0, safe));
}

function readQuery() {
   const params = new URLSearchParams(window.location.search);
   return {
      tab: String(params.get('tab') || '').trim(),
      open: String(params.get('open') || '').trim(),
      focus: String(params.get('focus') || '').trim(),
      orderId: String(params.get('orderId') || '').trim(),
   };
}

function normalizeTab(tabKey) {
   const allowed = new Set(TABS.filter((t) => t.enabled).map((t) => t.key));
   return allowed.has(tabKey) ? tabKey : DEFAULT_TAB;
}

function getInitialTabKey() {
   const q = readQuery();
   const tab = q.tab;
   if (!tab) return DEFAULT_TAB;
   return normalizeTab(tab);
}

function setQuery(paramsPatch, { replace = false } = {}) {
   const url = new URL(window.location.href);
   const sp = url.searchParams;

   Object.entries(paramsPatch).forEach(([k, v]) => {
      if (v === null || v === undefined || String(v).trim() === '') {
         sp.delete(k);
         return;
      }
      sp.set(k, String(v));
   });

   const next = url.pathname + (sp.toString() ? `?${sp.toString()}` : '');
   if (replace) window.history.replaceState({}, '', next);
   else window.history.pushState({}, '', next);
}

/**
 * ✅ Tabs UI: 모바일은 가로 스크롤, 데스크탑은 CSS로 세로 메뉴 느낌.
 * (버튼 구조는 동일 유지)
 */
function renderTabs(activeKey = DEFAULT_TAB) {
   return `
    <ul class="mypage__tabs" role="tablist" aria-label="MyPage Menu">
      ${TABS.map((t) => {
         const isActive = t.key === activeKey;
         const disabled = !t.enabled;

         return `
          <li class="mypage__tabitem" role="presentation">
            <button
              type="button"
              class="mypage__tab ${isActive ? 'is-active' : ''}"
              role="tab"
              aria-selected="${isActive ? 'true' : 'false'}"
              aria-controls="panel-${t.key}"
              data-tab="${t.key}"
              ${disabled ? 'disabled aria-disabled="true"' : ''}
            >
              <span class="mypage__tabLabel">${escapeHtml(t.label)}</span>
              ${disabled ? `<span class="mypage__soon">SOON</span>` : ''}
            </button>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

/* ==============================
   3-1) Top Summary (문고리닷컴 스타일용)
============================== */

function renderTopSummarySkeleton() {
   return `
     <section class="mypage__summary" aria-label="MyPage Summary" data-summary-wrap>
       <div class="mypage__section">
         <p class="loading">불러오는 중...</p>
       </div>
     </section>
   `;
}

function getUserSafe() {
   const user = authStore.getUser?.() ?? null;
   if (!user || typeof user !== 'object') return null;
   return user;
}

function getCouponStateSafe() {
   const s = couponStore.getState?.() ?? {};
   const owned = Array.isArray(s.owned) ? s.owned : [];
   const appliedCode = String(s.appliedCode ?? '').trim();
   return { owned, appliedCode };
}

function getOrdersSafe() {
   const orders = orderStore.getOrders?.() ?? [];
   return Array.isArray(orders) ? orders : [];
}

function countOrdersByStatus(orders) {
   const safe = Array.isArray(orders) ? orders : [];
   const map = { PAID: 0, SHIPPING: 0, DELIVERED: 0, CANCELED: 0 };

   safe.forEach((o) => {
      const s = String(o?.status || '').toUpperCase();
      if (map[s] !== undefined) map[s] += 1;
      else map.PAID += 0;
   });

   return map;
}

function renderTopSummaryCard() {
   const user = getUserSafe();
   const { owned } = getCouponStateSafe();
   const orders = getOrdersSafe();

   if (!user) {
      return `
        <div class="mypage__section">
          <p class="empty__title">로그인이 필요합니다.</p>
          <p class="empty__desc">로그인 후 마이페이지를 이용할 수 있어요.</p>
        </div>
      `;
   }

   const name = escapeHtml(user?.name || '회원');
   const totalSpent = Number(user?.totalSpent || 0);
   const points = Number(user?.points || 0);

   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });
   const current = snap?.current || snap?.tierInfo?.current || { name: '실버' };
   const tierName = escapeHtml(current?.name || '실버');

   const usableCoupons = owned.filter((c) => !Boolean(c?.used)).length;
   const usedCoupons = owned.filter((c) => Boolean(c?.used)).length;

   const statusCounts = countOrdersByStatus(orders);

   return `
     <div class="mypage__section mypage__summaryCard">
       <div class="mypage__summaryTop">
         <div class="mypage__avatar" aria-hidden="true"></div>
         <div class="mypage__who">
           <p class="mypage__whoName"><strong>${name}</strong></p>
           <p class="mypage__whoMeta">
             <span class="grade-pill">${tierName}</span>
             <span class="dot" aria-hidden="true"></span>
             <span class="muted">누적 ₩ ${formatKRW(totalSpent)}</span>
           </p>
         </div>

         <div class="mypage__summaryActions">
           <button type="button" class="btn subtle" data-tab="profile">내 정보</button>
           <button type="button" class="btn subtle" data-tab="grade">등급</button>
         </div>
       </div>

       <div class="mypage__sectionDivider" aria-hidden="true"></div>

       <div class="mypage__summaryGrid" aria-label="Summary Quick Stats">
         <div class="mypage__summaryItem">
           <p class="k muted">포인트</p>
           <p class="v"><strong>${formatKRW(points)}P</strong></p>
         </div>

         <div class="mypage__summaryItem">
           <p class="k muted">쿠폰</p>
           <p class="v"><strong>${usableCoupons}</strong><span class="muted"> / 사용 ${usedCoupons}</span></p>
         </div>

         <div class="mypage__summaryItem">
           <p class="k muted">주문</p>
           <p class="v"><strong>${orders.length}</strong></p>
         </div>
       </div>

       <div class="mypage__sectionDivider" aria-hidden="true"></div>

       <div class="mypage__summaryOrderMini" aria-label="Order Status Mini">
         <button type="button" class="pill" data-tab="delivery">결제완료 ${statusCounts.PAID}</button>
         <button type="button" class="pill" data-tab="delivery">배송중 ${statusCounts.SHIPPING}</button>
         <button type="button" class="pill" data-tab="delivery">배송완료 ${statusCounts.DELIVERED}</button>
         <button type="button" class="pill" data-tab="delivery">취소 ${statusCounts.CANCELED}</button>
       </div>
     </div>
   `;
}

/* ==============================
   4) Panels (Template)
============================== */

function renderPanelCoupon() {
   return `
    <section class="mypage__panel" id="panel-coupon" role="tabpanel" data-panel="coupon" aria-hidden="true">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">쿠폰 등록</h2>
        <p class="mypage__sectionDesc">코드를 등록해서 보유 쿠폰으로 추가합니다.</p>

        <div class="coupon-box">
          <div class="coupon-box__row">
            <input
              class="coupon-box__input"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="쿠폰 코드 입력 (예: HELLOWORLD)"
              data-coupon-register-input
            />
            <button type="button" class="coupon-box__btn" data-coupon-register>
              등록
            </button>
          </div>

          <p class="coupon-box__msg" data-coupon-register-msg>${DEFAULT_REGISTER_MSG}</p>
        </div>
      </div>

      <div class="mypage__section">
        <div class="coupon-owned" data-owned-wrap>
          <p class="loading">불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
}

function renderPanelProfile() {
   return `
    <section class="mypage__panel" id="panel-profile" role="tabpanel" data-panel="profile" aria-hidden="true">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">내 정보</h2>
        <p class="mypage__sectionDesc">로그인한 계정 정보를 확인합니다.</p>

        <div class="profile-card" data-profile-wrap>
          <p class="loading">불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
}

function renderPanelGrade() {
   return `
    <section class="mypage__panel" id="panel-grade" role="tabpanel" data-panel="grade" aria-hidden="true">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">회원등급</h2>
        <p class="mypage__sectionDesc">누적 구매액에 따라 등급과 적립률이 달라집니다.</p>

        <div class="grade-card" data-grade-wrap>
          <p class="loading">불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
}

function renderPanelOrders() {
   return `
    <section class="mypage__panel" id="panel-orders" role="tabpanel" data-panel="orders" aria-hidden="true">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">주문내역</h2>
        <p class="mypage__sectionDesc">결제 완료된 주문이 저장됩니다.</p>

        <div class="orders" data-orders-wrap>
          <p class="loading">불러오는 중...</p>
        </div>
      </div>
    </section>
  `;
}

function renderPanelDelivery() {
   return `
    <section class="mypage__panel" id="panel-delivery" role="tabpanel" data-panel="delivery" aria-hidden="true">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">주문/배송</h2>
        <p class="mypage__sectionDesc">배송 상태 타임라인과 배송지 정보를 확인합니다.</p>

        <div class="delivery" data-delivery-wrap>
          <div class="delivery__toolbar" aria-label="Delivery Filters">
            <button type="button" class="chip is-active" data-delivery-filter="ALL" aria-pressed="true">전체</button>
            <button type="button" class="chip" data-delivery-filter="PAID" aria-pressed="false">결제완료</button>
            <button type="button" class="chip" data-delivery-filter="SHIPPING" aria-pressed="false">배송중</button>
            <button type="button" class="chip" data-delivery-filter="DELIVERED" aria-pressed="false">배송완료</button>
            <button type="button" class="chip" data-delivery-filter="CANCELED" aria-pressed="false">취소</button>
          </div>

          <div class="delivery__list" data-delivery-list>
            <p class="loading">불러오는 중...</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPanelAddress() {
   return `
    <section class="mypage__panel" id="panel-address" role="tabpanel" data-panel="address" aria-hidden="true">
      <div class="mypage__section" data-address-wrap>
        <p class="loading">불러오는 중...</p>
      </div>
    </section>
  `;
}

/* ==============================
   4-1) Address panel content
============================== */

function renderAddressEmpty() {
   return `
    <div class="address-empty">
      <p class="empty__title">등록된 배송지가 없습니다.</p>
      <p class="empty__desc">자주 쓰는 배송지를 추가해 두면 결제가 더 빠릅니다.</p>
      <button type="button" class="btn primary" data-address-add>배송지 추가</button>
    </div>
  `;
}

function renderAddressList(addresses) {
   return `
    <div class="address-top">
      <div class="address-head">
        <div>
          <h3 class="mypage__sectionTitle">배송지</h3>
          <p class="mypage__sectionDesc">배송지를 추가/수정/삭제하고 기본 배송지를 설정할 수 있습니다.</p>
        </div>
        <button type="button" class="btn" data-address-add>+ 배송지 추가</button>
      </div>

      <ul class="address-list" aria-label="Address List">
        ${addresses
           .map((a) => {
              const label = a.label ? `(${escapeHtml(a.label)})` : '';
              const isDefault = Boolean(a.isDefault);

              return `
            <li class="address-card ${isDefault ? 'is-default' : ''}" data-address-id="${escapeHtml(a.id)}">
              <div class="address-card__top">
                <div class="address-card__title">
                  <strong>${escapeHtml(a.receiver)}</strong>
                  <span class="muted">${label}</span>
                  ${isDefault ? `<span class="pill">기본</span>` : ''}
                </div>

                <div class="address-card__actions">
                  ${
                     isDefault
                        ? `<button type="button" class="btn small" disabled title="이미 기본 배송지입니다.">기본</button>`
                        : `<button type="button" class="btn small" data-address-set-default>기본으로</button>`
                  }
                  <button type="button" class="btn small" data-address-edit>수정</button>
                  <button type="button" class="btn small danger" data-address-delete>삭제</button>
                </div>
              </div>

              <div class="address-card__body">
                <p class="muted">${escapeHtml(a.phone)}</p>
                <p>
                  <span class="muted">(${escapeHtml(a.zip)})</span>
                  ${escapeHtml(a.address1)}
                  ${a.address2 ? `<span class="muted"> ${escapeHtml(a.address2)}</span>` : ''}
                </p>
              </div>
            </li>
          `;
           })
           .join('')}
      </ul>
    </div>
  `;
}

function renderAddressPanelInner() {
   const list = addressStore.getAddresses?.() ?? [];
   const safeList = Array.isArray(list) ? list : [];
   return safeList.length ? renderAddressList(safeList) : renderAddressEmpty();
}

/* ==============================
   5) Coupon helpers
============================== */

function renderOwned(owned, appliedCode) {
   const list = Array.isArray(owned) ? owned : [];

   const usable = list.filter((c) => !Boolean(c?.used));
   const usedList = list.filter((c) => Boolean(c?.used));

   const header = `
    <div class="coupon-owned__header">
      <div>
        <h2 class="mypage__sectionTitle">보유 쿠폰</h2>
        <p class="mypage__sectionDesc">
          현재 적용 중:
          <strong class="pill">${escapeHtml(appliedCode || '없음')}</strong>
        </p>
      </div>

      <div class="coupon-owned__headerActions">
        <button type="button" class="btn subtle" data-go-cart>장바구니로</button>
        ${
           usedList.length
              ? `
              <button
                type="button"
                class="btn subtle"
                data-toggle-used
                aria-expanded="false"
              >
                사용 완료 쿠폰 보기 (${usedList.length})
              </button>
            `
              : ''
        }
      </div>
    </div>
  `;

   if (!usable.length) {
      return `
      ${header}
      <div class="empty">
        <p class="empty__title">사용 가능한 쿠폰이 없습니다.</p>
        <p class="empty__desc">쿠폰을 등록하면 여기에서 바로 확인할 수 있습니다.</p>
      </div>

      ${
         usedList.length
            ? `
            <div class="coupon-used" data-used-wrap hidden>
              ${renderCouponList(usedList, appliedCode, { showUsed: true })}
            </div>
          `
            : ''
      }
    `;
   }

   return `
    ${header}
    ${renderCouponList(usable, appliedCode, { showUsed: false })}

    ${
       usedList.length
          ? `
          <div class="coupon-used" data-used-wrap hidden>
            ${renderCouponList(usedList, appliedCode, { showUsed: true })}
          </div>
        `
          : ''
    }
  `;
}

function renderCouponList(list, appliedCode, { showUsed }) {
   return `
    <ul class="coupon-owned__list" aria-label="${showUsed ? 'Used Coupons' : 'Usable Coupons'}">
      ${list
         .map((c) => {
            const code = String(c?.code ?? '').trim();
            const title = String(c?.title ?? '쿠폰').trim();
            const pct = Math.round(Number(c?.rate || 0) * 100 || 0);

            const used = Boolean(c?.used);
            const isApplied = appliedCode === code && Boolean(code);

            const status = used
               ? '사용됨'
               : isApplied
                 ? '적용 중'
                 : '사용 가능';

            return `
          <li class="coupon-item ${used ? 'is-used' : ''}">
            <div class="coupon-item__info">
              <p class="coupon-item__title">${escapeHtml(title)}</p>
              <p class="coupon-item__meta">
                <strong>${escapeHtml(code)}</strong>
                ${
                   code.startsWith('UPGRADE_')
                      ? `<span class="pill pill--upgrade" aria-label="승급 쿠폰">승급</span>`
                      : ''
                }
                <span class="dot">•</span>
                ${pct}%
                <span class="dot">•</span>
                <span class="coupon-item__status ${used ? 'is-used' : isApplied ? 'is-applied' : ''}">
                  ${escapeHtml(status)}
                </span>
              </p>
            </div>

            <div class="coupon-item__actions">
              ${
                 used
                    ? `<button type="button" class="btn" disabled>사용 완료</button>`
                    : isApplied
                      ? `<button type="button" class="btn subtle" data-coupon-clear>해제</button>`
                      : `<button type="button" class="btn primary" data-coupon-apply="${escapeHtml(code)}">적용</button>`
              }
            </div>
          </li>
        `;
         })
         .join('')}
    </ul>
  `;
}

/* ==============================
   6) Orders helpers
============================== */

function formatDateTime(ts) {
   const d = new Date(Number(ts || 0));
   if (Number.isNaN(d.getTime())) return '-';
   return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
   }).format(d);
}

function formatStatusLabel(status) {
   const s = String(status || '').toUpperCase();
   if (s === 'PAID') return '결제완료';
   if (s === 'SHIPPING') return '배송중';
   if (s === 'DELIVERED') return '배송완료';
   if (s === 'CANCELED') return '취소';
   return '결제완료';
}

function buildOrderDetailLines(order) {
   if (!order) return '';

   const pointsUsed = Math.max(
      0,
      Math.floor(Number(order?.pointsUsed ?? order?.pricing?.pointsUsed ?? 0)),
   );

   const lines = [
      `주문번호: ${order.orderId}`,
      `상태: ${formatStatusLabel(order.status)}`,
      `결제: ₩ ${formatKRW(order?.pricing?.total || 0)}`,
      pointsUsed > 0 ? `포인트 사용: -${formatKRW(pointsUsed)}P` : null,
      `배송비: ₩ ${formatKRW(order?.pricing?.shipping || 0)}`,
      `쿠폰: ${order?.coupon?.code ? order.coupon.code : '없음'}`,
   ].filter(Boolean);

   const rows = toStatusTimeline(order?.statusHistory);
   if (rows.length) {
      lines.push('');
      lines.push('상태 이력:');
      rows.forEach((r, i) => {
         lines.push(
            `${i + 1}. ${statusKo(r.status)} (${formatDateTime(r.at)})`,
         );
      });
   } else {
      lines.push('');
      lines.push('상태 이력: 없음');
   }

   return lines.join('\n');
}

function renderOrdersList(orders = []) {
   const list = Array.isArray(orders) ? orders : [];

   if (!list.length) {
      return `
      <div class="empty">
        <p class="empty__title">주문내역이 없습니다.</p>
        <p class="empty__desc">상품을 결제하면 주문이 생성됩니다.</p>
        <button type="button" class="btn subtle" data-go-product>상품 보러가기</button>
      </div>
    `;
   }

   return `
    <ul class="order-list" aria-label="Order List">
      ${list
         .map((o) => {
            const orderId = String(o?.orderId || '').trim();
            const createdAt = formatDateTime(o?.createdAt);
            const statusLabel = formatStatusLabel(o?.status);

            const itemCount = Array.isArray(o?.items) ? o.items.length : 0;
            const total = Number(o?.pricing?.total || 0);
            const couponCode = String(o?.coupon?.code || '').trim();

            return `
          <li class="order-card">
            <div class="order-card__top">
              <div class="order-card__meta">
                <p class="order-card__id"><strong>${escapeHtml(orderId)}</strong></p>
                <p class="order-card__time">${escapeHtml(createdAt)}</p>
              </div>
              <span class="pill">${escapeHtml(statusLabel)}</span>
            </div>

            <div class="order-card__body">
              <p class="order-card__line"><span>상품</span><strong>${itemCount}개</strong></p>
              <p class="order-card__line"><span>총 결제</span><strong>₩ ${formatKRW(total)}</strong></p>
              <p class="order-card__line"><span>쿠폰</span><strong>${couponCode ? escapeHtml(couponCode) : '없음'}</strong></p>
            </div>

            <div class="order-card__actions">
              <button type="button" class="btn subtle" data-order-detail="${escapeHtml(orderId)}">상세 보기</button>
            </div>
          </li>
        `;
         })
         .join('')}
    </ul>
  `;
}

/* ==============================
   6-1) Delivery helpers
============================== */

function normalizeOrderStatus(status) {
   const s = String(status || '').toUpperCase();
   if (
      s === 'PAID' ||
      s === 'SHIPPING' ||
      s === 'DELIVERED' ||
      s === 'CANCELED'
   )
      return s;
   return 'PAID';
}

function getTrackingCode(order) {
   const id = String(order?.orderId || '').trim();
   const tail = id ? id.slice(-6) : String(Date.now()).slice(-6);
   return `REVE-${tail.toUpperCase()}`;
}

function renderShippingSnapshot(order) {
   const a = order?.shippingAddress;
   if (!a) return `<p class="muted">배송지 정보 없음</p>`;

   const label = a.label ? `(${escapeHtml(a.label)})` : '';
   const line = `(${escapeHtml(a.zip)}) ${escapeHtml(a.address1)}${
      a.address2 ? ` ${escapeHtml(a.address2)}` : ''
   }`;

   return `
    <div class="ship">
      <p class="ship__to"><strong>${escapeHtml(a.receiver)}</strong> ${label} · ${escapeHtml(a.phone)}</p>
      <p class="ship__addr muted">${line}</p>

      <p class="ship__policy muted">
        ※ 주문 생성 이후 배송지 변경은 불가합니다. (취소 후 재주문해 주세요.)
      </p>
    </div>
  `;
}

function renderDeliveryTimeline(order) {
   const s = normalizeOrderStatus(order?.status);
   const h = order?.statusHistory || {};

   const steps = [
      { key: 'PAID', label: '결제완료' },
      { key: 'SHIPPING', label: '배송중' },
      { key: 'DELIVERED', label: '배송완료' },
   ];

   const idx = steps.findIndex((x) => x.key === s);
   const activeIndex = idx >= 0 ? idx : 0;

   const isCanceled = s === 'CANCELED';
   const canceledAt = h?.CANCELED ? formatDateTime(h.CANCELED) : '-';

   const renderTime = (ms) => (ms ? formatDateTime(ms) : '-');

   return `
     <div class="timeline ${isCanceled ? 'is-canceled' : ''}" aria-label="Delivery Timeline">
       ${steps
          .map((step, i) => {
             const done = !isCanceled && i < activeIndex;
             const on = !isCanceled && i === activeIndex;
             const ts = h?.[step.key];

             return `
             <div class="timeline__step ${done ? 'is-done' : ''} ${on ? 'is-active' : ''}">
               <span class="timeline__dot" aria-hidden="true"></span>
               <span class="timeline__label">${escapeHtml(step.label)}</span>
               <span class="timeline__time muted">${escapeHtml(renderTime(ts))}</span>
             </div>
           `;
          })
          .join('')}
       ${
          isCanceled
             ? `<p class="timeline__canceled pill">취소됨 · ${escapeHtml(canceledAt)}</p>`
             : ''
       }
     </div>
   `;
}

function filterOrdersByStatus(orders, filterKey) {
   const key = String(filterKey || 'ALL').toUpperCase();
   if (key === 'ALL') return orders;
   return orders.filter((o) => normalizeOrderStatus(o?.status) === key);
}

function renderDeliveryList(orders, { filterKey = 'ALL' } = {}) {
   const list = Array.isArray(orders) ? orders : [];
   const filtered = filterOrdersByStatus(list, filterKey);

   if (!filtered.length) {
      return `
        <div class="empty">
          <p class="empty__title">해당 상태의 주문이 없습니다.</p>
          <p class="empty__desc">주문내역 탭에서 주문을 확인할 수 있습니다.</p>
          <button type="button" class="btn subtle" data-go-orders-tab>주문내역으로</button>
        </div>
      `;
   }

   return `
     <ul class="delivery-cards" aria-label="Delivery Orders">
       ${filtered
          .map((o) => {
             const orderId = String(o?.orderId || '').trim();
             const status = normalizeOrderStatus(o?.status);
             const statusLabel = formatStatusLabel(status);
             const createdAt = formatDateTime(o?.createdAt);
             const total = Number(o?.pricing?.total || 0);
             const track = getTrackingCode(o);

             return `
               <li class="delivery-card">
                 <div class="delivery-card__top">
                   <div>
                     <p class="delivery-card__id"><strong>${escapeHtml(orderId)}</strong></p>
                     <p class="muted">${escapeHtml(createdAt)} · <span class="pill">${escapeHtml(statusLabel)}</span></p>
                   </div>
                   <div class="delivery-card__sum">
                     <span class="muted">총 결제</span>
                     <strong>₩ ${formatKRW(total)}</strong>
                   </div>
                 </div>

                 ${renderDeliveryTimeline(o)}

                 <div class="delivery-card__mid">
                   <div class="delivery-card__track">
                     <span class="muted">운송장</span>
                     <strong>${escapeHtml(track)}</strong>
                   </div>

                   <div class="delivery-card__actions">
                     <button type="button" class="btn subtle" data-delivery-detail="${escapeHtml(orderId)}">상세</button>
                     <button type="button" class="btn" data-delivery-track="${escapeHtml(orderId)}">배송조회</button>
                   </div>
                 </div>

                 <div class="delivery-card__bottom">
                   ${renderShippingSnapshot(o)}
                 </div>
               </li>
             `;
          })
          .join('')}
     </ul>
   `;
}

/* ==============================
   7) Profile / Grade helpers
============================== */

function renderProfile(user) {
   const name = escapeHtml(user?.name || '회원');
   const role = escapeHtml(String(user?.role || 'MEMBER'));

   const totalSpent = Number(user?.totalSpent || 0);
   const points = Number(user?.points || 0);

   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const current = snap?.current || snap?.tierInfo?.current || { name: '실버' };
   const next = snap?.next || snap?.tierInfo?.next || null;

   const tierName = escapeHtml(current?.name || '실버');
   const earnRate = Number(snap?.earnRate || 0);
   const remain = Number(
      snap?.remainToNext ?? snap?.tierInfo?.remainToNext ?? 0,
   );

   return `
    <div class="kv" aria-label="My Profile Summary">
      <div class="kv__row"><span class="kv__key">이름</span><span class="kv__val"><strong>${name}</strong></span></div>
      <div class="kv__row"><span class="kv__key">권한</span><span class="kv__val"><span class="pill">${role}</span></span></div>
      <div class="kv__row"><span class="kv__key">누적 구매</span><span class="kv__val"><strong>₩ ${formatKRW(totalSpent)}</strong></span></div>
      <div class="kv__row"><span class="kv__key">보유 포인트</span><span class="kv__val"><strong>${formatKRW(points)}P</strong></span></div>
    </div>

    <div class="mypage__sectionDivider" aria-hidden="true"></div>

    <div class="kv" aria-label="Membership Summary">
      <div class="kv__row"><span class="kv__key">현재 등급</span><span class="kv__val"><strong class="grade-pill">${tierName}</strong></span></div>
      <div class="kv__row"><span class="kv__key">적립률</span><span class="kv__val"><strong>${formatPercent(earnRate)}</strong></span></div>
      <div class="kv__row">
        <span class="kv__key">다음 등급</span>
        <span class="kv__val">
          <strong>${next?.name ? `${escapeHtml(next.name)}까지 ₩ ${formatKRW(remain)}` : '최고 등급 유지 중'}</strong>
        </span>
      </div>
    </div>

    <p class="hint">결제 완료 후 누적 구매액이 반영되면 등급과 적립률이 자동으로 갱신됩니다.</p>
  `;
}

function renderGrade(user) {
   const totalSpent = Number(user?.totalSpent || 0);
   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const current = snap?.current || snap?.tierInfo?.current || { name: '실버' };
   const next = snap?.next || snap?.tierInfo?.next || null;

   const tierName = escapeHtml(current?.name || '실버');
   const earnRate = Number(snap?.earnRate || 0);
   const remain = Number(
      snap?.remainToNext ?? snap?.tierInfo?.remainToNext ?? 0,
   );

   const pct = Number(
      snap?.progressToNextPct ?? snap?.tierInfo?.progressToNextPct ?? 0,
   );
   const safePct = Math.max(0, Math.min(100, Math.round(pct)));

   return `
    <div class="grade-top">
      <div class="grade-current"><p class="label">현재 등급</p><p class="value"><strong class="grade-pill">${tierName}</strong></p></div>
      <div class="grade-current"><p class="label">적립률</p><p class="value"><strong>${formatPercent(earnRate)}</strong></p></div>
      <div class="grade-current"><p class="label">누적 구매액</p><p class="value"><strong>₩ ${formatKRW(totalSpent)}</strong></p></div>
    </div>

    <div class="grade-progress">
      ${
         next?.name
            ? `
            <div class="grade-progress__head">
              <p class="title">다음 등급: <strong>${escapeHtml(next.name)}</strong></p>
              <p class="meta">₩ ${formatKRW(remain)} 남음</p>
            </div>
          `
            : `
            <div class="grade-progress__head">
              <p class="title">최고 등급 달성</p>
              <p class="meta">현재 등급 유지 중</p>
            </div>
          `
      }

      <div class="bar" aria-label="Grade progress bar">
        <div class="fill" style="width:${next?.name ? safePct : 100}%"></div>
      </div>

      <p class="hint">${next?.name ? `${safePct}% 달성` : `100%`}</p>
    </div>
  `;
}

/* ==============================
   8) Address Form Modal
============================== */

function openAddressFormModal({ title, initial = {} }) {
   return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'reve-modal-overlay address-form-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      overlay.innerHTML = `
      <div class="reve-modal address-form-modal">
        <div class="reve-modal__header">
          <h3 class="reve-modal__title">${escapeHtml(title)}</h3>
          <button type="button" class="reve-modal__close" data-close aria-label="닫기">×</button>
        </div>

        <div class="reve-modal__body">
          <div class="form-grid">
            <label class="form-field">
              <span class="k">라벨(선택)</span>
              <input type="text" data-f="label" value="${escapeHtml(initial.label || '')}" placeholder="집/회사 등" />
            </label>

            <label class="form-field">
              <span class="k">받는 분</span>
              <input type="text" data-f="receiver" value="${escapeHtml(initial.receiver || '')}" placeholder="이름" />
            </label>

            <label class="form-field">
              <span class="k">휴대폰</span>
              <input type="text" data-f="phone" value="${escapeHtml(initial.phone || '')}" placeholder="010-1234-5678" />
            </label>

            <label class="form-field">
              <span class="k">우편번호</span>
              <input type="text" data-f="zip" value="${escapeHtml(initial.zip || '')}" placeholder="12345" />
            </label>

            <label class="form-field">
              <span class="k">기본 주소</span>
              <input type="text" data-f="address1" value="${escapeHtml(initial.address1 || '')}" placeholder="서울시 ..." />
            </label>

            <label class="form-field">
              <span class="k">상세 주소(선택)</span>
              <input type="text" data-f="address2" value="${escapeHtml(initial.address2 || '')}" placeholder="101동 1001호" />
            </label>

            <label class="form-field checkbox">
              <input type="checkbox" data-f="isDefault" ${initial.isDefault ? 'checked' : ''} />
              <span class="k">기본 배송지로 설정</span>
            </label>
          </div>

          <p class="muted">필수 항목은 받는 분, 휴대폰, 우편번호, 기본 주소입니다.</p>
        </div>

        <div class="reve-modal__footer">
          <button type="button" class="btn" data-cancel>취소</button>
          <button type="button" class="btn primary" data-submit>저장</button>
        </div>
      </div>
    `;

      const getValue = (key) =>
         String(overlay.querySelector(`[data-f="${key}"]`)?.value || '').trim();

      const getChecked = (key) =>
         Boolean(overlay.querySelector(`[data-f="${key}"]`)?.checked);

      const close = (result) => {
         document.body.classList.remove('is-modal-open');
         overlay.remove();
         resolve(result);
      };

      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) close(null);
         if (e.target.closest('[data-close]')) close(null);
         if (e.target.closest('[data-cancel]')) close(null);

         if (e.target.closest('[data-submit]')) {
            const payload = {
               label: getValue('label'),
               receiver: getValue('receiver'),
               phone: getValue('phone'),
               zip: getValue('zip'),
               address1: getValue('address1'),
               address2: getValue('address2'),
               isDefault: getChecked('isDefault'),
            };
            close(payload);
         }
      });

      overlay.addEventListener('keydown', (e) => {
         if (e.key === 'Escape') close(null);
      });

      document.body.appendChild(overlay);
      document.body.classList.add('is-modal-open');

      setTimeout(() => {
         overlay.querySelector('[data-f="receiver"]')?.focus();
      }, 0);
   });
}

function validateAddressForm(form) {
   const receiver = String(form?.receiver || '').trim();
   const phone = String(form?.phone || '').trim();
   const zip = String(form?.zip || '').trim();
   const address1 = String(form?.address1 || '').trim();

   if (!receiver) return { ok: false, message: '받는 분을 입력해 주세요.' };
   if (!phone) return { ok: false, message: '휴대폰 번호를 입력해 주세요.' };
   if (!zip) return { ok: false, message: '우편번호를 입력해 주세요.' };
   if (!address1) return { ok: false, message: '기본 주소를 입력해 주세요.' };

   return { ok: true };
}

/* ==============================
   9) Init
============================== */

export function initMyPage() {
   const root = document.querySelector('[data-mypage]');
   if (!root) return;

   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const toast = initToast();

   const ownedWrap = root.querySelector('[data-owned-wrap]');
   const msgEl = root.querySelector('[data-coupon-register-msg]');
   const inputEl = root.querySelector('[data-coupon-register-input]');

   const profileWrap = root.querySelector('[data-profile-wrap]');
   const gradeWrap = root.querySelector('[data-grade-wrap]');
   const ordersWrap = root.querySelector('[data-orders-wrap]');
   const addressWrap = root.querySelector('[data-address-wrap]');
   const deliveryListEl = root.querySelector('[data-delivery-list]');

   const summaryWrap = root.querySelector('[data-summary-wrap]');

   /* ------------------------------
      A) Tab control
  ------------------------------ */

   const setActiveTab = (tabKey) => {
      const next = normalizeTab(String(tabKey || '').trim());

      root.querySelectorAll('[data-tab]').forEach((btn) => {
         const key = btn.getAttribute('data-tab');
         const isOn = key === next;
         btn.classList.toggle('is-active', isOn);
         btn.setAttribute('aria-selected', isOn ? 'true' : 'false');
      });

      root.querySelectorAll('[data-panel]').forEach((panel) => {
         const key = panel.getAttribute('data-panel');
         const isOn = key === next;
         panel.classList.toggle('is-active', isOn);
         panel.setAttribute('aria-hidden', isOn ? 'false' : 'true');
      });

      return next;
   };

   /* ------------------------------
      B) Paint functions
  ------------------------------ */

   const paintSummary = () => {
      if (!summaryWrap) return;
      summaryWrap.innerHTML = renderTopSummaryCard();
   };

   const paintOwned = () => {
      if (!ownedWrap) return;
      const { owned, appliedCode } = getCouponStateSafe();
      ownedWrap.innerHTML = renderOwned(owned, appliedCode);
   };

   const paintProfile = () => {
      if (!profileWrap) return;
      const user = getUserSafe();
      profileWrap.innerHTML = user
         ? renderProfile(user)
         : `<p class="empty__desc">유저 정보를 찾지 못했습니다.</p>`;
   };

   const paintGrade = () => {
      if (!gradeWrap) return;
      const user = getUserSafe();
      gradeWrap.innerHTML = user
         ? renderGrade(user)
         : `<p class="empty__desc">유저 정보를 찾지 못했습니다.</p>`;
   };

   const paintOrders = () => {
      if (!ordersWrap) return;
      const orders = orderStore.getOrders?.() ?? [];
      ordersWrap.innerHTML = renderOrdersList(orders);
   };

   const deliveryState = { filterKey: 'ALL' };

   const paintDelivery = () => {
      if (!deliveryListEl) return;
      const orders = orderStore.getOrders?.() ?? [];
      deliveryListEl.innerHTML = renderDeliveryList(orders, {
         filterKey: deliveryState.filterKey,
      });
   };

   const paintAddress = () => {
      if (!addressWrap) return;
      addressWrap.innerHTML = renderAddressPanelInner();
   };

   const paintByTab = (tabKey) => {
      if (tabKey === 'coupon') paintOwned();
      if (tabKey === 'profile') paintProfile();
      if (tabKey === 'grade') paintGrade();
      if (tabKey === 'orders') paintOrders();
      if (tabKey === 'delivery') paintDelivery();
      if (tabKey === 'address') paintAddress();
   };

   /* ------------------------------
      C) Deep link (FINAL)
  ------------------------------ */

   const consumeQuery = ({ remove = ['open', 'focus', 'orderId'] } = {}) => {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      remove.forEach((k) => params.delete(k));
      const next =
         url.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', next);
   };

   let lastDeepLinkKey = '';

   const buildDeepLinkKey = (q, activeTab) => {
      return [
         window.location.pathname,
         activeTab,
         q.open || '',
         q.focus || '',
         q.orderId || '',
         window.location.search,
      ].join('|');
   };

   const runDeepLinkOnce = async () => {
      const q = readQuery();
      const tab = normalizeTab(q.tab || getInitialTabKey());

      const active = setActiveTab(tab);
      paintByTab(active);

      const key = buildDeepLinkKey(q, active);
      if (key === lastDeepLinkKey) return;
      lastDeepLinkKey = key;

      let didConsume = false;

      if (active === 'coupon') {
         if (q.focus === 'register') {
            didConsume = true;
            setTimeout(() => {
               root.querySelector('[data-coupon-register-input]')?.focus?.();
            }, 0);
         }
      }

      if (active === 'orders') {
         if (q.open === 'detail' && q.orderId) {
            didConsume = true;
            setTimeout(async () => {
               const order = orderStore.getOrder?.(q.orderId);
               if (!order) {
                  toast.show('주문을 찾을 수 없습니다.', { duration: 1300 });
                  return;
               }

               await confirmModal({
                  title: '주문 상세',
                  message: buildOrderDetailLines(order),
                  confirmText: '확인',
                  cancelText: '닫기',
               });
            }, 0);
         }
      }

      if (active === 'address') {
         if (q.open === 'add') {
            didConsume = true;
            setTimeout(() => {
               root.querySelector('[data-address-add]')?.click?.();
            }, 0);
         }
      }

      if (didConsume) {
         consumeQuery({ remove: ['open', 'focus', 'orderId'] });
      }
   };

   /* ------------------------------
      D) Initial render (FINAL)
  ------------------------------ */

   paintSummary();

   const initialTab = setActiveTab(getInitialTabKey());
   paintByTab(initialTab);
   runDeepLinkOnce();

   /* ------------------------------
      E) Store subscriptions (탭 최적화)
  ------------------------------ */

   couponStore.subscribe?.(() => {
      paintSummary();
      const tab = normalizeTab(readQuery().tab || getInitialTabKey());
      if (tab === 'coupon') paintOwned();
   });

   authStore.subscribe?.(() => {
      paintSummary();
      const tab = normalizeTab(readQuery().tab || getInitialTabKey());
      if (tab === 'profile') paintProfile();
      if (tab === 'grade') paintGrade();
   });

   orderStore.subscribe?.(() => {
      paintSummary();
      const tab = normalizeTab(readQuery().tab || getInitialTabKey());
      if (tab === 'orders') paintOrders();
      if (tab === 'delivery') paintDelivery();
   });

   addressStore.subscribe?.(() => {
      paintSummary();
      const tab = normalizeTab(readQuery().tab || getInitialTabKey());
      if (tab === 'address') paintAddress();
   });

   /* ------------------------------
      F) popstate (FINAL)
  ------------------------------ */

   const onPopState = () => {
      paintSummary();
      const tab = setActiveTab(getInitialTabKey());
      paintByTab(tab);
      runDeepLinkOnce(); // 가드로 중복 모달 방지
   };

   window.addEventListener('popstate', onPopState);

   /* ------------------------------
      G) Events (root delegation)
  ------------------------------ */

   root.addEventListener('click', async (e) => {
      // ✅ data-tab이 붙은 모든 버튼(사이드탭/요약카드 버튼 포함)을 탭으로 처리
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn && tabBtn.tagName === 'BUTTON') {
         const tabKey = normalizeTab(
            String(tabBtn.getAttribute('data-tab') || '').trim(),
         );

         setActiveTab(tabKey);
         paintByTab(tabKey);

         lastDeepLinkKey = '';
         setQuery(
            { tab: tabKey, open: '', focus: '', orderId: '' },
            { replace: false },
         );
         return;
      }

      // 2) Coupon register
      if (e.target.closest('[data-coupon-register]')) {
         const raw = String(inputEl?.value || '').trim();

         if (!raw) {
            if (msgEl) msgEl.textContent = '쿠폰 코드를 입력해 주세요.';
            return;
         }

         const result = couponStore.register?.(raw);

         if (!result) {
            if (msgEl) msgEl.textContent = 'couponStore.register가 필요합니다.';
            return;
         }

         if (msgEl)
            msgEl.textContent = String(result.message || DEFAULT_REGISTER_MSG);
         if (result.ok && inputEl) inputEl.value = '';

         if (result.ok)
            toast.show('쿠폰이 등록되었습니다.', { duration: 1200 });
         return;
      }

      // 3) Coupon apply
      const applyBtn = e.target.closest('[data-coupon-apply]');
      if (applyBtn) {
         const code = String(applyBtn.getAttribute('data-coupon-apply') || '')
            .trim()
            .toUpperCase();
         if (!code) return;

         const owned = couponStore.getState?.()?.owned ?? [];
         const picked = owned.find((c) => c.code === code);

         const title = String(picked?.title || code);
         const pct = Math.round(Number(picked?.rate || 0) * 100);

         const ok = await confirmModal({
            title: '쿠폰 적용',
            message: `쿠폰 "${title}" (${pct}%)을 적용할까요?`,
            confirmText: '적용',
            cancelText: '취소',
         });

         if (!ok) return;

         const result = couponStore.apply?.(code);

         if (result?.ok) {
            toast.show('쿠폰이 적용되었습니다.', { duration: 1200 });
         } else {
            toast.show(result?.message || '쿠폰 적용에 실패했습니다.', {
               duration: 1400,
            });
         }
         return;
      }

      // 4) Coupon clear
      if (e.target.closest('[data-coupon-clear]')) {
         const applied = String(couponStore.getState?.()?.appliedCode || '');
         const ok = await confirmModal({
            title: '쿠폰 해제',
            message: applied
               ? `쿠폰(${applied})을 해제할까요?`
               : '쿠폰을 해제할까요?',
            confirmText: '해제',
            cancelText: '유지',
         });

         if (!ok) return;

         couponStore.clearApplied?.();
         toast.show('쿠폰이 해제되었습니다.', { duration: 1200 });
         return;
      }

      // 5) Used coupons toggle
      const toggleUsedBtn = e.target.closest('[data-toggle-used]');
      if (toggleUsedBtn) {
         const wrap = root.querySelector('[data-used-wrap]');
         if (!wrap) return;

         const isOpen = toggleUsedBtn.getAttribute('aria-expanded') === 'true';
         toggleUsedBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
         wrap.hidden = isOpen;
         return;
      }

      // 6) Navigate
      if (e.target.closest('[data-go-cart]')) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
         return;
      }

      if (e.target.closest('[data-go-product]')) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/product' } }),
         );
         return;
      }

      /* ==============================
       X) Delivery: filter / actions
      ============================== */

      const filterBtn = e.target.closest('[data-delivery-filter]');
      if (filterBtn) {
         const next = String(
            filterBtn.getAttribute('data-delivery-filter') || 'ALL',
         ).toUpperCase();
         deliveryState.filterKey = next;

         root.querySelectorAll('[data-delivery-filter]').forEach((btn) => {
            const k = String(
               btn.getAttribute('data-delivery-filter') || 'ALL',
            ).toUpperCase();
            const on = k === next;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
         });

         paintDelivery();
         return;
      }

      if (e.target.closest('[data-go-orders-tab]')) {
         const tabKey = 'orders';
         setActiveTab(tabKey);
         paintByTab(tabKey);
         lastDeepLinkKey = '';
         setQuery(
            { tab: tabKey, open: '', focus: '', orderId: '' },
            { replace: false },
         );
         return;
      }

      const dDetail = e.target.closest('[data-delivery-detail]');
      if (dDetail) {
         const orderId = String(
            dDetail.getAttribute('data-delivery-detail') || '',
         ).trim();
         if (!orderId) return;

         const order = orderStore.getOrder?.(orderId);
         if (!order) {
            toast.show('주문을 찾을 수 없습니다.', { duration: 1200 });
            return;
         }

         await confirmModal({
            title: '배송 상세',
            message: buildOrderDetailLines(order),
            confirmText: '확인',
            cancelText: '닫기',
         });
         return;
      }

      const dTrack = e.target.closest('[data-delivery-track]');
      if (dTrack) {
         const orderId = String(
            dTrack.getAttribute('data-delivery-track') || '',
         ).trim();
         if (!orderId) return;

         const order = orderStore.getOrder?.(orderId);
         if (!order) {
            toast.show('주문을 찾을 수 없습니다.', { duration: 1200 });
            return;
         }

         const track = getTrackingCode(order);
         const statusLabel = formatStatusLabel(order.status);

         await confirmModal({
            title: '배송 조회',
            message: [
               `운송장: ${track}`,
               `현재 상태: ${statusLabel}`,
               '',
               '※ MVP에서는 실제 택배사 연동 없이 UI만 제공합니다.',
            ].join('\n'),
            confirmText: '확인',
            cancelText: '닫기',
         });
         return;
      }

      /* ==============================
       7) Address CRUD
      ============================== */

      if (e.target.closest('[data-address-add]')) {
         const first = (addressStore.getAddresses?.() ?? []).length === 0;

         const form = await openAddressFormModal({
            title: '배송지 추가',
            initial: { isDefault: first },
         });

         if (!form) return;

         const v = validateAddressForm(form);
         if (!v.ok) {
            toast.show(v.message, { duration: 1400 });
            return;
         }

         const ok = await confirmModal({
            title: '배송지 저장',
            message: '입력한 배송지를 저장할까요?',
            confirmText: '저장',
            cancelText: '취소',
         });

         if (!ok) return;

         const r = addressStore.createAddress?.(form);
         if (!r?.ok) {
            toast.show(r?.message || '배송지 추가에 실패했습니다.', {
               duration: 1400,
            });
            return;
         }

         toast.show('배송지가 저장되었습니다.', { duration: 1200 });
         return;
      }

      const card = e.target.closest('[data-address-id]');
      const id = String(card?.getAttribute('data-address-id') || '').trim();

      if (id) {
         if (e.target.closest('[data-address-set-default]')) {
            const ok = await confirmModal({
               title: '기본 배송지 설정',
               message: '이 배송지를 기본 배송지로 설정할까요?',
               confirmText: '설정',
               cancelText: '취소',
            });

            if (!ok) return;

            const r = addressStore.setDefault?.(id);
            if (!r?.ok) {
               toast.show(r?.message || '설정에 실패했습니다.', {
                  duration: 1400,
               });
               return;
            }

            toast.show('기본 배송지로 설정되었습니다.', { duration: 1200 });
            return;
         }

         if (e.target.closest('[data-address-edit]')) {
            const current = addressStore.getAddress?.(id);

            if (!current) {
               toast.show('배송지를 찾을 수 없습니다.', { duration: 1400 });
               return;
            }

            const form = await openAddressFormModal({
               title: '배송지 수정',
               initial: current,
            });

            if (!form) return;

            const v = validateAddressForm(form);
            if (!v.ok) {
               toast.show(v.message, { duration: 1400 });
               return;
            }

            const ok = await confirmModal({
               title: '배송지 수정',
               message: '입력한 내용으로 수정할까요?',
               confirmText: '수정',
               cancelText: '취소',
            });

            if (!ok) return;

            const r = addressStore.updateAddress?.(id, form);
            if (!r?.ok) {
               toast.show(r?.message || '배송지 수정에 실패했습니다.', {
                  duration: 1400,
               });
               return;
            }

            toast.show('배송지가 수정되었습니다.', { duration: 1200 });
            return;
         }

         if (e.target.closest('[data-address-delete]')) {
            const ok = await confirmModal({
               title: '배송지 삭제',
               message: '이 배송지를 삭제할까요?\n삭제 후 복구할 수 없습니다.',
               confirmText: '삭제',
               cancelText: '취소',
            });

            if (!ok) return;

            const r = addressStore.deleteAddress?.(id);
            if (!r?.ok) {
               toast.show(r?.message || '배송지 삭제에 실패했습니다.', {
                  duration: 1400,
               });
               return;
            }

            toast.show('배송지가 삭제되었습니다.', { duration: 1200 });
            return;
         }
      }

      /* ==============================
       8) Order detail
      ============================== */

      const detailBtn = e.target.closest('[data-order-detail]');
      if (detailBtn) {
         const orderId = String(
            detailBtn.getAttribute('data-order-detail') || '',
         ).trim();
         if (!orderId) return;

         const order = orderStore.getOrder?.(orderId);
         if (!order) {
            toast.show('주문을 찾을 수 없습니다.', { duration: 1200 });
            return;
         }

         await confirmModal({
            title: '주문 상세',
            message: buildOrderDetailLines(order),
            confirmText: '확인',
            cancelText: '닫기',
         });

         return;
      }
   });

   /* ------------------------------
      H) Coupon: Enter to register
  ------------------------------ */

   inputEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      root.querySelector('[data-coupon-register]')?.click();
   });
}
