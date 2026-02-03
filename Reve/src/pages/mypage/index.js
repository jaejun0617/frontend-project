/**
 * =============================================
 * 📍 위치: src/pages/mypage/index.js
 * 역할: 마이페이지(MVP) - 쿠폰/내정보/회원등급
 * 경로: /mypage
 *
 * ✅ 이번 정리 포인트
 * - grade.js 의존 제거 → membership.js 단일 소스로 통일
 * - "내 정보" 패널에 멤버십(등급/적립/다음 등급) 요약 통합
 * - Grade 패널도 같은 계산 로직(getMembershipSnapshot) 재사용
 *
 * ✅ 설계 포인트
 * - 탭 구조 확장 가능
 * - 이벤트는 페이지 root 내부에서만 처리(문서 전역 오염 방지)
 * - 중복 init 방지(data-bound)
 * =============================================
 */

import { couponStore } from '../../store/couponStore.js';
import { authStore } from '../../store/authStore.js';

import { confirmModal } from '../../components/ConfirmModal.js';
import { initToast } from '../../components/Toast.js';

import {
   getMembershipSnapshot,
   formatPercent,
} from '../../utils/membership.js';

/* ==============================
   1) Tabs (확장 가능한 구조)
   ============================== */

const TABS = [
   { key: 'profile', label: '내 정보', enabled: true },
   { key: 'address', label: '배송지', enabled: false },
   { key: 'orders', label: '주문/배송', enabled: false },
   { key: 'grade', label: '회원등급', enabled: true },
   { key: 'coupon', label: '쿠폰/혜택', enabled: true },
];

const DEFAULT_REGISTER_MSG =
   '쿠폰을 등록하면 “보유 쿠폰”에 쌓이고, 장바구니에서 적용돼요.';

/* ==============================
   2) Page Template
   ============================== */

export const MyPage = () => {
   return `
    <section class="page mypage" aria-label="My Page" data-mypage>
      <header class="page__header">
        <h1 class="page__title">마이페이지</h1>
        <p class="page__desc">내 정보/등급/쿠폰을 관리합니다.</p>
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
            ${renderPanelProfile()}
            ${renderPanelGrade()}
            ${renderPanelPlaceholder(
               'address',
               '배송지 관리',
               '기본 배송지/목록 CRUD (localStorage → 서버 연동)',
            )}
            ${renderPanelPlaceholder(
               'orders',
               '주문/배송',
               '주문 내역/상태(결제 붙을 때 확장)',
            )}
          </div>
        </div>
      </div>
    </section>
  `;
};

/* ==============================
   3) Render helpers (공통)
   ============================== */

/** ✅ XSS 방지용 escape */
function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

/** ✅ KRW 숫자 포맷: 1,234,567 */
function formatKRW(n) {
   const v = Number(n || 0);
   const safe = Number.isFinite(v) ? v : 0;
   return new Intl.NumberFormat('ko-KR').format(Math.max(0, safe));
}

/** ✅ Tabs 렌더 */
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

/* ==============================
   4) Panels
   ============================== */

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
        <p class="mypage__sectionDesc">누적 구매액에 따라 등급/적립률이 달라집니다.</p>

        <div class="grade-card" data-grade-wrap>
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

/* ==============================
   5) Coupon helpers
   ============================== */

/** ✅ couponStore state를 "깨져도 안전하게" 읽기 */
function getCouponStateSafe() {
   const s = couponStore.getState?.() ?? {};
   const owned = Array.isArray(s.owned) ? s.owned : [];
   const appliedCode = String(s.appliedCode ?? '').trim();
   return { owned, appliedCode };
}

/**
 * ✅ 보유 쿠폰 영역 렌더
 * - 사용 완료 쿠폰은 기본 숨김
 * - 필요 시 토글로 펼쳐보기
 */
function renderOwned(owned, appliedCode) {
   const list = Array.isArray(owned) ? owned : [];

   const usable = list.filter((c) => !Boolean(c?.used));
   const usedList = list.filter((c) => Boolean(c?.used));

   // ✅ header는 항상 동일하게(중복 제거)
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
        <button type="button" class="btn subtle" data-go-cart>
          장바구니로
        </button>

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

   // ✅ 사용 가능한 쿠폰이 없으면 Empty 상태
   if (!usable.length) {
      return `
      ${header}

      <div class="empty">
        <p class="empty__title">사용 가능한 쿠폰이 없어요.</p>
        <p class="empty__desc">쿠폰을 등록하면 여기에서 바로 확인할 수 있어요.</p>
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

    <!-- ✅ 사용 가능한 쿠폰만 기본 표시 -->
    ${renderCouponList(usable, appliedCode, { showUsed: false })}

    ${
       usedList.length
          ? `
          <!-- ✅ 필요할 때만 펼쳐서 보는 "사용 완료" -->
          <div class="coupon-used" data-used-wrap hidden>
            ${renderCouponList(usedList, appliedCode, { showUsed: true })}
          </div>
        `
          : ''
    }
  `;
}

/** ✅ 쿠폰 리스트 렌더(usable/used 공용) */
function renderCouponList(list, appliedCode, { showUsed }) {
   return `
    <ul class="coupon-owned__list" aria-label="${
       showUsed ? 'Used Coupons' : 'Usable Coupons'
    }">
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
                  <span class="coupon-item__status ${
                     used ? 'is-used' : isApplied ? 'is-applied' : ''
                  }">
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
                        : `<button type="button" class="btn primary" data-coupon-apply="${escapeHtml(
                             code,
                          )}">적용</button>`
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
   6) Profile / Grade helpers
   ============================== */

function getUserSafe() {
   const user = authStore.getUser?.() ?? null;
   if (!user || typeof user !== 'object') return null;
   return user;
}

/** ✅ 내 정보: 프로필 + 멤버십 요약(단일 소스) */
function renderProfile(user) {
   const name = escapeHtml(user?.name || '회원');
   const role = escapeHtml(String(user?.role || 'MEMBER'));

   const totalSpent = Number(user?.totalSpent || 0);
   const points = Number(user?.points || 0);

   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const tierName = escapeHtml(
      snap?.current?.name || snap?.tierInfo?.current?.name || '실버',
   );
   const earnRate = Number(snap?.earnRate || 0);

   const nextTier = snap?.next || snap?.tierInfo?.next || null;
   const nextName = nextTier?.name ? escapeHtml(nextTier.name) : '';
   const remain = Number(
      snap?.remainToNext ?? snap?.tierInfo?.remainToNext ?? 0,
   );

   return `
    <div class="kv" aria-label="My Profile Summary">
      <div class="kv__row">
        <span class="kv__key">이름</span>
        <span class="kv__val"><strong>${name}</strong></span>
      </div>

      <div class="kv__row">
        <span class="kv__key">권한</span>
        <span class="kv__val"><span class="pill">${role}</span></span>
      </div>

      <div class="kv__row">
        <span class="kv__key">누적 구매</span>
        <span class="kv__val"><strong>₩ ${formatKRW(totalSpent)}</strong></span>
      </div>

      <div class="kv__row">
        <span class="kv__key">보유 포인트</span>
        <span class="kv__val"><strong>${formatKRW(points)}P</strong></span>
      </div>
    </div>

    <div class="mypage__sectionDivider" aria-hidden="true"></div>

    <div class="kv" aria-label="Membership Summary">
      <div class="kv__row">
        <span class="kv__key">현재 등급</span>
        <span class="kv__val"><strong class="grade-pill">${tierName}</strong></span>
      </div>

      <div class="kv__row">
        <span class="kv__key">적립률</span>
        <span class="kv__val"><strong>${formatPercent(earnRate)}</strong></span>
      </div>

      <div class="kv__row">
        <span class="kv__key">다음 등급</span>
        <span class="kv__val">
          <strong>
            ${nextName ? `${nextName}까지 ₩ ${formatKRW(remain)}` : '최고 등급 유지 중'}
          </strong>
        </span>
      </div>
    </div>

    <p class="hint">
      결제 완료 후 누적 구매액(totalSpent)이 반영되면 등급/적립률이 자동 갱신됩니다.
    </p>
  `;
}

/** ✅ 회원등급 패널: getMembershipSnapshot 재사용 */
function renderGrade(user) {
   const totalSpent = Number(user?.totalSpent || 0);
   const snap = getMembershipSnapshot({ totalSpent, checkoutTotal: 0 });

   const tierName = escapeHtml(
      snap?.current?.name || snap?.tierInfo?.current?.name || '실버',
   );
   const earnRate = Number(snap?.earnRate || 0);

   const nextTier = snap?.next || snap?.tierInfo?.next || null;
   const nextName = nextTier?.name ? escapeHtml(nextTier.name) : '';
   const remain = Number(
      snap?.remainToNext ?? snap?.tierInfo?.remainToNext ?? 0,
   );

   // ✅ 여기(치명 버그 수정): progressRatio가 아니라 progressToNextPct(0~100) 기반
   const pct = Number(
      snap?.progressToNextPct ?? snap?.tierInfo?.progressToNextPct ?? 0,
   );
   const safePct = Math.max(0, Math.min(100, Math.round(pct)));

   return `
    <div class="grade-top">
      <div class="grade-current">
        <p class="label">현재 등급</p>
        <p class="value"><strong class="grade-pill">${tierName}</strong></p>
      </div>

      <div class="grade-current">
        <p class="label">적립률</p>
        <p class="value"><strong>${formatPercent(earnRate)}</strong></p>
      </div>

      <div class="grade-current">
        <p class="label">누적 구매액</p>
        <p class="value"><strong>₩ ${formatKRW(totalSpent)}</strong></p>
      </div>
    </div>

    <div class="grade-progress">
      ${
         nextName
            ? `
            <div class="grade-progress__head">
              <p class="title">다음 등급: <strong>${nextName}</strong></p>
              <p class="meta">₩ ${formatKRW(remain)} 남음</p>
            </div>
          `
            : `
            <div class="grade-progress__head">
              <p class="title">최고 등급 달성 🎖️</p>
              <p class="meta">현재 등급 유지 중</p>
            </div>
          `
      }

      <div class="bar" aria-label="Grade progress bar">
        <div class="fill" style="width:${nextName ? safePct : 100}%"></div>
      </div>

      <p class="hint">${nextName ? `${safePct}% 달성` : `100%`}</p>
    </div>
  `;
}

/* ==============================
   7) Init
   ============================== */

export function initMyPage() {
   const root = document.querySelector('[data-mypage]');
   if (!root) return;

   // ✅ 중복 바인딩 방지 (가장 먼저)
   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   // ✅ bound 체크 후 생성(중복 방지)
   const toast = initToast();

   const ownedWrap = root.querySelector('[data-owned-wrap]');
   const msgEl = root.querySelector('[data-coupon-register-msg]');
   const inputEl = root.querySelector('[data-coupon-register-input]');

   const profileWrap = root.querySelector('[data-profile-wrap]');
   const gradeWrap = root.querySelector('[data-grade-wrap]');

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
         : `<p class="empty__desc">유저 정보를 찾지 못했어요.</p>`;
   };

   const paintGrade = () => {
      if (!gradeWrap) return;
      const user = getUserSafe();
      gradeWrap.innerHTML = user
         ? renderGrade(user)
         : `<p class="empty__desc">유저 정보를 찾지 못했어요.</p>`;
   };

   const setActiveTab = (tabKey) => {
      root.querySelectorAll('[data-tab]').forEach((btn) => {
         const key = btn.getAttribute('data-tab');
         btn.classList.toggle('is-active', key === tabKey);
         btn.setAttribute('aria-selected', key === tabKey ? 'true' : 'false');
      });

      root.querySelectorAll('[data-panel]').forEach((panel) => {
         const key = panel.getAttribute('data-panel');
         const isOn = key === tabKey;
         panel.classList.toggle('is-active', isOn);
         panel.setAttribute('aria-hidden', isOn ? 'false' : 'true');
      });
   };

   // ✅ 최초 렌더
   setActiveTab('coupon');
   paintOwned();
   paintProfile();
   paintGrade();

   // ✅ store 변화 반영
   couponStore.subscribe?.(() => paintOwned());
   authStore.subscribe?.(() => {
      paintProfile();
      paintGrade();
   });

   root.addEventListener('click', async (e) => {
      /* ------------------------------
       A) 탭 변경
    ------------------------------ */
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
         const tabKey = tabBtn.getAttribute('data-tab');
         if (!tabKey) return;
         setActiveTab(tabKey);
         return;
      }

      /* ------------------------------
       B) 쿠폰 등록
    ------------------------------ */
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

         if (result.ok) toast.show('쿠폰이 등록됐어요 🎫', { duration: 1200 });
         return;
      }

      /* ------------------------------
       C) 쿠폰 적용 (모달로 실수 방지)
    ------------------------------ */
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
         if (result?.ok) toast.show('쿠폰이 적용됐어요 ✅', { duration: 1200 });
         else
            toast.show(result?.message || '쿠폰 적용에 실패했어요.', {
               duration: 1400,
            });
         return;
      }

      /* ------------------------------
       D) 쿠폰 해제 (모달)
    ------------------------------ */
      if (e.target.closest('[data-coupon-clear]')) {
         const applied = couponStore.getState?.()?.appliedCode || '';
         const ok = await confirmModal({
            title: '쿠폰 해제',
            message: applied
               ? `쿠폰(${applied})을 해제할까요?`
               : '쿠폰을 해제할까요?',
            confirmText: '해제',
            cancelText: '유지',
         });
         if (!ok) return;

         if (couponStore.clearApplied) couponStore.clearApplied();
         else if (couponStore.clear) couponStore.clear();

         toast.show('쿠폰이 해제됐어요.', { duration: 1200 });
         return;
      }

      /* ------------------------------
       E) 장바구니 이동
    ------------------------------ */
      if (e.target.closest('[data-go-cart]')) {
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: '/cart' } }),
         );
         return;
      }

      /* ------------------------------
       F) 사용 완료 쿠폰 토글
    ------------------------------ */
      const toggleUsedBtn = e.target.closest('[data-toggle-used]');
      if (toggleUsedBtn) {
         const wrap = root.querySelector('[data-used-wrap]');
         if (!wrap) return;

         const isOpen = toggleUsedBtn.getAttribute('aria-expanded') === 'true';
         toggleUsedBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
         wrap.hidden = isOpen; // true면 닫기, false면 열기
         return;
      }
   });

   // ✅ 엔터로 등록
   inputEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      root.querySelector('[data-coupon-register]')?.click();
   });
}
