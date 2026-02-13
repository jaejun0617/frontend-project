/**
 * =============================================
 * 📍 위치: src/utils/sidebar.js
 * 역할: 모바일 사이드바(오프캔버스) 열기/닫기 제어
 * 사용처: app.js(또는 엔트리)에서 initSidebar() 1회 호출
 * =============================================
 *
 * ✅ 동작 요약
 * 1) 모바일/태블릿(< 768px)에서만 햄버거 버튼 클릭 시 사이드바 오픈
 * 2) 오버레이/닫기 버튼/메뉴 링크 클릭 or ESC → 닫힘
 * 3) 화면이 PC(>=768px)로 전환되면 열려있어도 강제 닫기(스크롤 락 방지)
 *
 * ✅ 핵심 설계
 * - body에 `is-sidebar-open` 클래스를 붙였다/떼면서 상태 제어
 * - CSS는 body.is-sidebar-open 상태를 보고 translateX 애니메이션 실행
 * - PC에서는 "열기 시도" 자체를 막아서 상태 꼬임을 원천 차단
 */

// ==============================
// 0) Config
// ==============================
const BREAKPOINT_PX = 768; // ✅ PC 기준(768 이상이면 사이드바 기능 OFF)

// ==============================
// 1) Selectors
// ==============================
const SELECTORS = {
   // 햄버거 버튼
   openBtn: '.site-menu-bar',

   // Header.js에서 만든 사이드바 id
   sidebar: '#mobile-sidebar',

   // Header.js에서 만든 오버레이
   overlay: '[data-sidebar-overlay]',

   // 닫기 버튼(X)
   closeBtn: '.sidebar-close',

   // 사이드바 안의 라우팅 링크들(클릭하면 닫히게)
   navLink: '#mobile-sidebar a[data-link]',
};

// ==============================
// 2) Helpers
// ==============================

/**
 * ✅ 현재 화면이 모바일 모드인지 판별
 * - matchMedia는 resize에도 즉시 반응하고, CSS breakpoint와 맞추기 쉽다.
 */
function isMobileViewport() {
   return window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`).matches;
}

/**
 * 접근성(aria) 상태 업데이트
 * - aria-hidden   : 화면에 보이는지 여부 (보이면 false, 숨기면 true)
 * - aria-expanded : 버튼이 열림 상태인지 여부 (true/false)
 */
function setAria({ sidebarEl, overlayEl, openBtnEl, isOpen }) {
   if (sidebarEl) sidebarEl.setAttribute('aria-hidden', String(!isOpen));
   if (overlayEl) overlayEl.setAttribute('aria-hidden', String(!isOpen));
   if (openBtnEl) openBtnEl.setAttribute('aria-expanded', String(isOpen));
}

/**
 * ✅ 사이드바 열기/닫기
 * - PC에서는 무조건 닫힌 상태 유지
 */
function setOpen(isOpen) {
   const body = document.body;
   const sidebarEl = document.querySelector(SELECTORS.sidebar);
   const overlayEl = document.querySelector(SELECTORS.overlay);
   const openBtnEl = document.querySelector(SELECTORS.openBtn);

   // ✅ PC에서는 열기 금지: "열어!"가 와도 닫힘으로 강제
   const canOpen = isMobileViewport();
   const nextOpen = canOpen ? Boolean(isOpen) : false;

   // body class 토글 → CSS 애니메이션 트리거
   body.classList.toggle('is-sidebar-open', nextOpen);

   // aria 상태 동기화
   setAria({ sidebarEl, overlayEl, openBtnEl, isOpen: nextOpen });
}

/**
 * 현재 열림 상태인지 확인
 */
function isOpenNow() {
   return document.body.classList.contains('is-sidebar-open');
}

// ==============================
// 3) initSidebar
// ==============================
export function initSidebar() {
   // ✅ 중복 init 방지(실수로 app.js에서 두 번 호출해도 안전)
   if (window.__reveSidebarBound === true) {
      return {
         open: () => setOpen(true),
         close: () => setOpen(false),
         toggle: () => setOpen(!isOpenNow()),
      };
   }
   window.__reveSidebarBound = true;

   // ------------------------------
   // A) Click handlers
   // ------------------------------
   document.addEventListener('click', (e) => {
      const openBtn = e.target.closest(SELECTORS.openBtn);
      const closeBtn = e.target.closest(SELECTORS.closeBtn);
      const overlay = e.target.closest(SELECTORS.overlay);
      const navLink = e.target.closest(SELECTORS.navLink);

      // 1) 햄버거 버튼 클릭 → 모바일에서만 열기
      if (openBtn) {
         // ✅ PC면 아무 일도 안 함 (상태 꼬임 방지)
         if (!isMobileViewport()) return;

         setOpen(true);
         return;
      }

      // 2) 닫기 트리거: X / overlay / nav link
      if (closeBtn || overlay || navLink) {
         setOpen(false);
      }
   });

   // ------------------------------
   // B) Keyboard handlers (ESC)
   // ------------------------------
   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
         setOpen(false);
      }
   });

   // ------------------------------
   // C) Resize safe-guard
   // - 모바일에서 열어둔 상태로 PC로 넘어가면 body overflow lock이 남을 수 있음
   // - 그래서 PC 구간 진입 시 무조건 닫아준다.
   // ------------------------------
   window.addEventListener('resize', () => {
      if (!isMobileViewport() && isOpenNow()) {
         setOpen(false);
      }
   });

   // ✅ 앱 시작 시 기본은 닫힘
   setOpen(false);

   // 외부 제어 API
   return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!isOpenNow()),
   };
}
