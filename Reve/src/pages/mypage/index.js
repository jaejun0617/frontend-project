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
   - 패널 is-active 고정하지 않는다.
   - 초기 탭은 initMyPage에서 URL 기반으로 결정한다.
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
          <nav class="mypage__nav" aria-label="MyPage Tabs">
            ${renderTabs(DEFAULT_TAB)}
          </nav>

          <div class="mypage__main">
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

/**
 * ✅ 현재 URL 쿼리 읽기
 * - tab/open/focus/orderId는 딥링크 트리거로 사용
 */
function readQuery() {
   const params = new URLSearchParams(window.location.search);
   return {
      tab: String(params.get('tab') || '').trim(),
      open: String(params.get('open') || '').trim(),
      focus: String(params.get('focus') || '').trim(),
      orderId: String(params.get('orderId') || '').trim(),
   };
}

/**
 * ✅ 유효한 탭인지 검증 후 반환
 */
function normalizeTab(tabKey) {
   const allowed = new Set(TABS.filter((t) => t.enabled).map((t) => t.key));
   return allowed.has(tabKey) ? tabKey : DEFAULT_TAB;
}

/**
 * ✅ 초기 탭 결정 (URL tab 기반)
 */
function getInitialTabKey() {
   const q = readQuery();
   const tab = q.tab;
   if (!tab) return DEFAULT_TAB;
   return normalizeTab(tab);
}

/**
 * ✅ URL 쿼리 업데이트 (pushState / replaceState)
 * - 탭 클릭 시: pushState 권장
 * - open/focus 소비 시: replaceState 권장(히스토리 오염 방지)
 */
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
 * ✅ open/focus 파라미터 소비(consume)
 * - 1회 실행 후 URL에서 제거
 * - 새로고침/뒤로가기에서 반복 트리거를 줄임
 */
function consumeDeepLinkParams({
   consumeOpen = false,
   consumeFocus = false,
} = {}) {
   const q = readQuery();
   const patch = {};

   if (consumeOpen && q.open) patch.open = '';
   if (consumeOpen && q.orderId) patch.orderId = '';
   if (consumeFocus && q.focus) patch.focus = '';

   // 아무것도 소비할 게 없으면 noop
   if (!Object.keys(patch).length) return;

   setQuery(patch, { replace: true });
}

/**
 * ✅ 탭 렌더
 * - 실제 활성탭은 initMyPage의 setActiveTab에서 반영
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
              ${escapeHtml(t.label)}
              ${disabled ? `<span class="mypage__soon">SOON</span>` : ''}
            </button>
          </li>
        `;
      }).join('')}
    </ul>
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
        <p class="mypage__sectionDesc">배송 상태를 확인합니다.</p>

        <div class="delivery" data-delivery-wrap>
          <div class="empty">
            <p class="empty__title">배송 추적 UI는 확장 예정입니다.</p>
            <p class="empty__desc">주문내역에서 상태 변경(PAID/SHIPPING/DELIVERED)을 테스트할 수 있습니다.</p>
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

function getCouponStateSafe() {
   const s = couponStore.getState?.() ?? {};
   const owned = Array.isArray(s.owned) ? s.owned : [];
   const appliedCode = String(s.appliedCode ?? '').trim();
   return { owned, appliedCode };
}

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
   return [
      `주문번호: ${order.orderId}`,
      `상태: ${formatStatusLabel(order.status)}`,
      `결제: ₩ ${formatKRW(order?.pricing?.total || 0)}`,
      `배송비: ₩ ${formatKRW(order?.pricing?.shipping || 0)}`,
      `쿠폰: ${order?.coupon?.code ? order.coupon.code : '없음'}`,
   ].join('\n');
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
            const status = String(o?.status || '').toUpperCase();

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

              ${
                 status === 'PAID'
                    ? `<button type="button" class="btn" data-order-status="${escapeHtml(orderId)}" data-next-status="SHIPPING">배송 시작(테스트)</button>`
                    : status === 'SHIPPING'
                      ? `<button type="button" class="btn" data-order-status="${escapeHtml(orderId)}" data-next-status="DELIVERED">배송 완료(테스트)</button>`
                      : `<button type="button" class="btn" disabled>상태 변경</button>`
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
   7) Profile / Grade helpers
============================== */

function getUserSafe() {
   const user = authStore.getUser?.() ?? null;
   if (!user || typeof user !== 'object') return null;
   return user;
}

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
   DeepLink: consume helpers
   - open/focus/orderId 같은 "1회성 트리거"를 실행 후 URL에서 제거한다.
   - tab은 유지해서 현재 탭 상태는 그대로 남긴다.
============================== */

function consumeQuery({ remove = ['open', 'focus', 'orderId'] } = {}) {
   const url = new URL(window.location.href);
   const params = url.searchParams;

   // ✅ 제거 대상만 삭제
   remove.forEach((k) => params.delete(k));

   // ✅ URL 반영 (라우터 렌더 재호출 없이, 히스토리 스택 오염 없이)
   const next =
      url.pathname + (params.toString() ? `?${params.toString()}` : '');
   window.history.replaceState({}, '', next);
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

   // ✅ 중복 바인딩 방지
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const toast = initToast();

   // ✅ 패널별 DOM 핸들
   const ownedWrap = root.querySelector('[data-owned-wrap]');
   const msgEl = root.querySelector('[data-coupon-register-msg]');
   const inputEl = root.querySelector('[data-coupon-register-input]');

   const profileWrap = root.querySelector('[data-profile-wrap]');
   const gradeWrap = root.querySelector('[data-grade-wrap]');
   const ordersWrap = root.querySelector('[data-orders-wrap]');
   const addressWrap = root.querySelector('[data-address-wrap]');

   /* ------------------------------
      A) Tab control
      - UI 반영만 담당(데이터 로딩은 paint에서)
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
      - 스토어 상태를 읽어 패널 내부를 갱신
   ------------------------------ */

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

   const paintAddress = () => {
      if (!addressWrap) return;
      addressWrap.innerHTML = renderAddressPanelInner();
   };

   /**
    * ✅ 탭별 최소 paint만 수행
    * - 과한 렌더를 줄이고, UX 반응성을 올림
    */
   const paintByTab = (tabKey) => {
      if (tabKey === 'coupon') paintOwned();
      if (tabKey === 'profile') paintProfile();
      if (tabKey === 'grade') paintGrade();
      if (tabKey === 'orders') paintOrders();
      if (tabKey === 'address') paintAddress();
   };

   /* ------------------------------
      C) Deep link actions
      - tab/open/focus/orderId에 따라 1회성 액션 실행
      - 실행 후 open/focus를 consume하여 반복 방지
   ------------------------------ */

   const runDeepLink = async () => {
      const q = readQuery();
      const tab = getInitialTabKey();

      setActiveTab(tab);

      // ✅ 1회성 트리거가 실행됐는지 추적
      let didConsume = false;

      if (tab === 'coupon') {
         paintOwned();

         if (q.focus === 'register') {
            didConsume = true;
            setTimeout(() => {
               root.querySelector('[data-coupon-register-input]')?.focus?.();
            }, 0);
         }
      }

      if (tab === 'profile') paintProfile();
      if (tab === 'grade') paintGrade();

      if (tab === 'orders') {
         paintOrders();

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

      if (tab === 'address') {
         paintAddress();

         if (q.open === 'add') {
            didConsume = true;
            setTimeout(() => {
               root.querySelector('[data-address-add]')?.click?.();
            }, 0);
         }
      }

      // ✅ 트리거 실행 후 URL 파라미터 소비(1회성)
      if (didConsume) {
         consumeQuery({ remove: ['open', 'focus', 'orderId'] });
      }
   };

   /* ------------------------------
      D) Initial render
      - 전체 paint 1회(초기 로딩)
      - 이후 딥링크 액션 실행
   ------------------------------ */

   paintOwned();
   paintProfile();
   paintGrade();
   paintOrders();
   paintAddress();

   runDeepLink();

   /* ------------------------------
      E) Store subscriptions
      - 데이터 변경 시 UI 갱신
   ------------------------------ */

   couponStore.subscribe?.(() => paintOwned());

   authStore.subscribe?.(() => {
      paintProfile();
      paintGrade();
   });

   orderStore.subscribe?.(() => paintOrders());
   addressStore.subscribe?.(() => paintAddress());

   /* ------------------------------
      F) popstate
      - 뒤로/앞으로가기 시 URL 상태를 탭/UI에 반영
      - 딥링크 트리거(open/focus)가 남아있다면 재실행 가능
   ------------------------------ */

   const onPopState = () => {
      const tab = setActiveTab(getInitialTabKey());
      paintByTab(tab);
      runDeepLink();
   };

   window.addEventListener('popstate', onPopState);

   /* ------------------------------
      G) Events (root delegation)
   ------------------------------ */

   root.addEventListener('click', async (e) => {
      /* ==============================
         1) Tab change
         - 탭 클릭 시 URL의 tab을 pushState로 동기화
         ============================== */
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
         const tabKey = normalizeTab(
            String(tabBtn.getAttribute('data-tab') || '').trim(),
         );

         // ✅ UI 반영
         setActiveTab(tabKey);
         paintByTab(tabKey);

         // ✅ URL 동기화(tab)
         // - open/focus는 탭 이동 시 제거(의도치 않은 반복 트리거 방지)
         setQuery(
            {
               tab: tabKey,
               open: '',
               focus: '',
               orderId: '',
            },
            { replace: false },
         );

         return;
      }

      /* ==============================
         2) Coupon register
         ============================== */
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

      /* ==============================
         3) Coupon apply
         ============================== */
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

      /* ==============================
         4) Coupon clear
         ============================== */
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

      /* ==============================
         5) Used coupons toggle
         ============================== */
      const toggleUsedBtn = e.target.closest('[data-toggle-used]');
      if (toggleUsedBtn) {
         const wrap = root.querySelector('[data-used-wrap]');
         if (!wrap) return;

         const isOpen = toggleUsedBtn.getAttribute('aria-expanded') === 'true';
         toggleUsedBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
         wrap.hidden = isOpen;
         return;
      }

      /* ==============================
         6) Navigate
         ============================== */
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
         7) Address CRUD
         ============================== */

      // (A) Add
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

      // (B) Card actions
      const card = e.target.closest('[data-address-id]');
      const id = String(card?.getAttribute('data-address-id') || '').trim();

      if (id) {
         // Default
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

         // Edit
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

         // Delete
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
         8) Order detail / status update
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

      const statusBtn = e.target.closest('[data-order-status]');
      if (statusBtn) {
         const orderId = String(
            statusBtn.getAttribute('data-order-status') || '',
         ).trim();
         const next = String(
            statusBtn.getAttribute('data-next-status') || '',
         ).trim();

         const ok = await confirmModal({
            title: '주문 상태 변경',
            message: `상태를 ${formatStatusLabel(next)}(으)로 변경할까요?`,
            confirmText: '변경',
            cancelText: '취소',
         });

         if (!ok) return;

         const r = orderStore.updateOrderStatus?.(orderId, next);

         if (r?.ok)
            toast.show('주문 상태가 변경되었습니다.', { duration: 1200 });
         else
            toast.show(r?.message || '변경에 실패했습니다.', {
               duration: 1200,
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
