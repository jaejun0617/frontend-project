/**
 * =============================================
 * 📍 위치: src/pages/mypage/index.js
 * 역할: 마이페이지(MVP) - 쿠폰 등록/보유/적용
 * 경로: /mypage
 *
 * ✅ 설계 포인트
 * - 탭 구조 확장 가능(프로필/주소지/주문/등급 등)
 * - 이벤트는 페이지 root 내부에서만 처리(문서 전역 오염 방지)
 * - 중복 init 방지(data-bound)
 * - couponStore shape 변화에도 최대한 안전하게 대응
 * =============================================
 */

import { couponStore } from '../../store/couponStore.js';

/** 탭 정의: 나중에 여기만 늘리면 UI가 같이 확장됨 */
const TABS = [
   { key: 'profile', label: '내 정보', enabled: false },
   { key: 'address', label: '배송지', enabled: false },
   { key: 'orders', label: '주문/배송', enabled: false },
   { key: 'grade', label: '회원등급', enabled: false },
   { key: 'coupon', label: '쿠폰/혜택', enabled: true },
];

/** 쿠폰 등록 UX 메시지 */
const DEFAULT_REGISTER_MSG =
   '쿠폰을 등록하면 “보유 쿠폰”에 쌓이고, 장바구니에서 적용돼요.';

/**
 * Page template (sync)
 * - 실제 데이터/이벤트 바인딩은 initMyPage에서
 */
export const MyPage = () => {
   return `
    <section class="page mypage" aria-label="My Page" data-mypage>
      <header class="page__header">
        <h1 class="page__title">마이페이지</h1>
        <p class="page__desc">쿠폰 등록/보유/적용을 관리합니다.</p>
      </header>

      <div class="page__content">
        <div class="mypage__layout">
          <!-- 좌측 탭 -->
          <nav class="mypage__nav" aria-label="MyPage Tabs">
            ${renderTabs('coupon')}
          </nav>

          <!-- 우측 패널 -->
          <div class="mypage__main">
            ${renderPanelCoupon()}
            ${renderPanelPlaceholder('profile', '내 정보', '로그인/회원가입 이후 연결할 영역')}
            ${renderPanelPlaceholder('address', '배송지 관리', '기본 배송지/목록 CRUD (localStorage → 서버 연동)')}
            ${renderPanelPlaceholder('orders', '주문/배송', '주문 내역/상태(결제 붙을 때 확장)')}
            ${renderPanelPlaceholder('grade', '회원등급', '등급/혜택/다음 등급까지 금액 등')}
          </div>
        </div>
      </div>
    </section>
  `;
};

/* ==============================
   Render helpers
   ============================== */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function renderTabs(activeKey = 'coupon') {
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

function renderPanelCoupon() {
   return `
    <section class="mypage__panel is-active" id="panel-coupon" role="tabpanel" data-panel="coupon">
      <div class="mypage__section">
        <h2 class="mypage__sectionTitle">쿠폰 등록</h2>
        <p class="mypage__sectionDesc">코드를 등록해서 보유 쿠폰으로 추가하세요.</p>

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

function renderPanelPlaceholder(key, title, desc) {
   return `
    <section class="mypage__panel" id="panel-${key}" role="tabpanel" data-panel="${key}" aria-hidden="true">
      <div class="mypage__placeholder">
        <h2 class="mypage__sectionTitle">${escapeHtml(title)}</h2>
        <p class="mypage__sectionDesc">${escapeHtml(desc)}</p>
        <div class="mypage__todo">
          <p>여긴 나중에 붙이면 됩니다. 지금은 구조만 잡아둔 상태 ✅</p>
        </div>
      </div>
    </section>
  `;
}

function getCouponStateSafe() {
   const s = couponStore.getState?.() ?? {};
   // store 버전이 달라도 최대한 안전하게 읽기
   const owned = Array.isArray(s.owned) ? s.owned : [];
   const appliedCode =
      String(s.appliedCode ?? s.coupon?.code ?? '').trim() || '';
   return { owned, appliedCode };
}

function renderOwned(owned, appliedCode) {
   if (!owned.length) {
      return `
      <div class="empty">
        <p class="empty__title">보유 쿠폰이 없어요.</p>
        <p class="empty__desc">위에서 코드를 등록하면 여기에 쌓입니다.</p>
      </div>
    `;
   }

   return `
    <div class="coupon-owned__header">
      <div>
        <h2 class="mypage__sectionTitle">보유 쿠폰</h2>
        <p class="mypage__sectionDesc">
          현재 적용 중:
          <strong class="pill">${escapeHtml(appliedCode || '없음')}</strong>
        </p>
      </div>

      <button type="button" class="btn subtle" data-go-cart>
        장바구니로
      </button>
    </div>

    <ul class="coupon-owned__list" aria-label="Owned Coupons">
      ${owned
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
   Init
   ============================== */

export function initMyPage() {
   const root = document.querySelector('[data-mypage]');
   if (!root) return;

   // ✅ 중복 바인딩 방지: 라우팅으로 재진입해도 이벤트 1회만
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const ownedWrap = root.querySelector('[data-owned-wrap]');
   const msgEl = root.querySelector('[data-coupon-register-msg]');
   const inputEl = root.querySelector('[data-coupon-register-input]');

   const paintOwned = () => {
      if (!ownedWrap) return;
      const { owned, appliedCode } = getCouponStateSafe();
      ownedWrap.innerHTML = renderOwned(owned, appliedCode);
   };

   const setActiveTab = (tabKey) => {
      // 탭 버튼
      root.querySelectorAll('[data-tab]').forEach((btn) => {
         const key = btn.getAttribute('data-tab');
         btn.classList.toggle('is-active', key === tabKey);
         btn.setAttribute('aria-selected', key === tabKey ? 'true' : 'false');
      });

      // 패널
      root.querySelectorAll('[data-panel]').forEach((panel) => {
         const key = panel.getAttribute('data-panel');
         const isOn = key === tabKey;
         panel.classList.toggle('is-active', isOn);
         panel.setAttribute('aria-hidden', isOn ? 'false' : 'true');
      });
   };

   // 최초 렌더
   setActiveTab('coupon');
   paintOwned();

   // store 변화 반영
   couponStore.subscribe?.(() => {
      paintOwned();
   });

   // ✅ root 내부 이벤트 위임 (문서 전체에 영향 최소)
   root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
         const tabKey = tabBtn.getAttribute('data-tab');
         if (!tabKey) return;
         setActiveTab(tabKey);
         return;
      }

      // 쿠폰 등록
      if (e.target.closest('[data-coupon-register]')) {
         const raw = String(inputEl?.value || '').trim();
         if (!raw) {
            if (msgEl) msgEl.textContent = '쿠폰 코드를 입력해 주세요.';
            return;
         }

         const result = couponStore.register?.(raw);

         if (!result) {
            if (msgEl) msgEl.textContent = 'couponStore.register가 필요해요.';
            return;
         }

         if (msgEl)
            msgEl.textContent = String(result.message || DEFAULT_REGISTER_MSG);
         if (result.ok && inputEl) inputEl.value = '';
         return;
      }

      // 쿠폰 적용
      const applyBtn = e.target.closest('[data-coupon-apply]');
      if (applyBtn) {
         const code = String(
            applyBtn.getAttribute('data-coupon-apply') || '',
         ).trim();
         if (!code) return;
         couponStore.apply?.(code);
         return;
      }

      // 쿠폰 해제
      if (e.target.closest('[data-coupon-clear]')) {
         // store 버전 차이 대응
         if (couponStore.clearApplied) couponStore.clearApplied();
         else if (couponStore.clear) couponStore.clear();
         return;
      }

      // 장바구니 이동
      if (e.target.closest('[data-go-cart]')) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
      }
   });

   // 엔터로 등록 UX
   inputEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      root.querySelector('[data-coupon-register]')?.click();
   });
}
