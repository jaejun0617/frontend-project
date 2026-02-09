/**
 * =============================================
 * 📍 위치: src/utils/searchDrawer.js
 * 역할: 상단 Search Drawer 열기/닫기 + 최근/추천 검색어 UI + 검색 실행
 *
 * ✅ UX 정책 (최종)
 * - 검색 실행(Enter/칩 클릭/검색 버튼) 시 드로어는 자동으로 닫힘
 * - 닫힘 트리거: 검색 실행 / X 버튼 / 바깥 클릭(overlay) / ESC
 *
 * ✅ 외부 제어(페이지에서 닫기)
 * - window 이벤트: 'app:searchDrawerClose'
 *   → app.js가 searchDrawer.close()로 수신 처리
 * =============================================
 */

import {
   getRecentSearches,
   addRecentSearch,
   removeRecentSearch,
   clearRecentSearches,
} from './searchHistory.js';

/* =====================================================================
    0) 상수 / 셀렉터 / 기본 추천
    ===================================================================== */

const SELECTORS = {
   toggleBtn: '.search-toggle',
   drawer: '#search-drawer',
   overlay: '[data-search-overlay]',
   closeBtn: '.search-close',

   form: '[data-search-form]',
   input: '.search-input',

   recentList: '[data-search-recent]',
   suggestList: '[data-search-suggest]',
   clearBtn: '[data-search-clear]',
};

const DEFAULT_SUGGESTIONS = [
   'New Season',
   'Prada',
   'Louis Vuitton',
   'Chanel',
   'Cartier',
];

/* =====================================================================
    1) Safe utils
    ===================================================================== */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function encodeAttr(value) {
   return encodeURIComponent(String(value ?? ''));
}

function decodeAttr(value) {
   try {
      return decodeURIComponent(String(value ?? ''));
   } catch {
      return String(value ?? '');
   }
}

/* =====================================================================
    2) Module state
    ===================================================================== */

let isBound = false;

/* =====================================================================
    3) recent search change event
    ===================================================================== */

function emitRecentChanged() {
   window.dispatchEvent(new CustomEvent('recent-search:changed'));
}

/* =====================================================================
    4) Open / Close state
    ===================================================================== */

function setAria({ drawerEl, overlayEl, toggleEls, isOpen }) {
   if (drawerEl) drawerEl.setAttribute('aria-hidden', String(!isOpen));
   if (overlayEl) overlayEl.setAttribute('aria-hidden', String(!isOpen));
   toggleEls.forEach((btn) =>
      btn.setAttribute('aria-expanded', String(isOpen)),
   );
}

function setOpen(isOpen) {
   const body = document.body;
   const drawerEl = document.querySelector(SELECTORS.drawer);
   const overlayEl = document.querySelector(SELECTORS.overlay);
   const toggleEls = Array.from(document.querySelectorAll(SELECTORS.toggleBtn));

   body.classList.toggle('is-search-open', isOpen);
   setAria({ drawerEl, overlayEl, toggleEls, isOpen });

   if (isOpen) {
      const inputEl = document.querySelector(SELECTORS.input);
      if (inputEl) inputEl.focus();
   }
}

function isDrawerOpen() {
   return document.body.classList.contains('is-search-open');
}

/* =====================================================================
    5) Chips render
    ===================================================================== */

function renderChips(listEl, items, onClick, { removable = false } = {}) {
   if (!listEl) return;

   if (!items || !items.length) {
      listEl.innerHTML = "<li><span class='chip-empty'>없음</span></li>";
      return;
   }

   listEl.innerHTML = items
      .map((text) => {
         const raw = String(text ?? '').trim();
         const encoded = encodeAttr(raw);

         const removeBtn = removable
            ? `<button type='button' class='chip-remove' data-action='remove' data-chip='${encoded}' aria-label='최근 검색어 삭제'>×</button>`
            : '';

         return `
         <li>
           <div class='chip-row'>
             <button type='button' class='chip-btn' data-action='search' data-chip='${encoded}'>${escapeHtml(raw)}</button>
             ${removeBtn}
           </div>
         </li>
       `;
      })
      .join('');

   listEl.onclick = (e) => {
      const removeBtn = e.target.closest(
         "button[data-action='remove'][data-chip]",
      );
      if (removeBtn) {
         e.preventDefault();
         e.stopPropagation();

         const value = decodeAttr(removeBtn.getAttribute('data-chip'));
         removeRecentSearch(value);

         emitRecentChanged();
         syncLists();
         return;
      }

      const chipBtn = e.target.closest(
         "button[data-action='search'][data-chip]",
      );
      if (!chipBtn) return;

      e.preventDefault();
      e.stopPropagation();

      const value = decodeAttr(chipBtn.getAttribute('data-chip'));
      onClick(value);
   };
}

function syncLists() {
   const recentEl = document.querySelector(SELECTORS.recentList);
   const suggestEl = document.querySelector(SELECTORS.suggestList);

   renderChips(
      recentEl,
      getRecentSearches(),
      (value) => {
         const inputEl = document.querySelector(SELECTORS.input);
         if (inputEl) inputEl.value = value;
         submitSearch(value);
      },
      { removable: true },
   );

   renderChips(
      suggestEl,
      DEFAULT_SUGGESTIONS,
      (value) => {
         const inputEl = document.querySelector(SELECTORS.input);
         if (inputEl) inputEl.value = value;
         submitSearch(value);
      },
      { removable: false },
   );
}

/* =====================================================================
    6) Search submit (✅ 검색 실행 시 드로어 자동 닫힘)
    ===================================================================== */

function submitSearch(keyword) {
   const q = String(keyword || '').trim();
   if (!q) return;

   addRecentSearch(q);
   emitRecentChanged();

   const inputEl = document.querySelector(SELECTORS.input);
   if (inputEl) inputEl.value = '';

   syncLists();

   // ✅ UX 핵심: 이동 전에 드로어 닫기
   setOpen(false);

   const url = `/search?q=${encodeURIComponent(q)}`;
   window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { href: url } }),
   );
}

/* =====================================================================
    7) Init (events bind once)
    ===================================================================== */

export function initSearchDrawer() {
   if (isBound) {
      syncLists();
      return {
         open: () => setOpen(true),
         close: () => setOpen(false),
         toggle: () => setOpen(!isDrawerOpen()),
         refresh: () => syncLists(),
         isOpen: () => isDrawerOpen(),
      };
   }
   isBound = true;

   syncLists();

   document.addEventListener('click', (e) => {
      const toggle = e.target.closest(SELECTORS.toggleBtn);
      const closeBtn = e.target.closest(SELECTORS.closeBtn);
      const overlay = e.target.closest(SELECTORS.overlay);
      const clearBtn = e.target.closest(SELECTORS.clearBtn);

      const drawerEl = document.querySelector(SELECTORS.drawer);
      const clickedInsideDrawer = drawerEl
         ? drawerEl.contains(e.target)
         : false;

      if (toggle) {
         syncLists();
         setOpen(true);
         return;
      }

      if (clearBtn) {
         clearRecentSearches();
         emitRecentChanged();
         syncLists();
         return;
      }

      if (closeBtn) {
         setOpen(false);
         return;
      }

      if (isDrawerOpen() && (overlay || !clickedInsideDrawer)) {
         setOpen(false);
      }
   });

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
   });

   document.addEventListener('submit', (e) => {
      const form = e.target.closest(SELECTORS.form);
      if (!form) return;

      e.preventDefault();

      const inputEl = form.querySelector(SELECTORS.input);
      submitSearch(inputEl ? inputEl.value : '');
   });

   setOpen(false);

   return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!isDrawerOpen()),
      refresh: () => syncLists(),
      isOpen: () => isDrawerOpen(),
   };
}

// 4:03
