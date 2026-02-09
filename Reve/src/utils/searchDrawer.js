/**
 * =============================================
 * 📍 위치: src/utils/searchDrawer.js
 * 역할: 상단 Search Drawer(드롭다운 패널) 열기/닫기 + 최근/추천 검색어 UI
 * 사용처: app.js(또는 엔트리)에서 initSearchDrawer() 1회 호출
 * =============================================
 *
 * ✅ 이 파일이 담당하는 것
 * 1) 헤더의 검색 아이콘(.search-toggle) 클릭 -> 상단 드로어 열기
 * 2) X 버튼 / 바깥 클릭(오버레이) / ESC -> 닫기
 * 3) 최근 검색어(searchHistory) 저장/삭제/클릭 검색
 * 4) 추천 검색어(정적 배열) 클릭 검색
 * 5) 검색 실행 시 URL을 /search?q=... 로 변경(pushState)
 *
 * ⚠️ 중요한 UX 규칙(현재 설계)
 * - Enter/검색 버튼/칩 클릭으로 “검색 실행”을 해도 드로어는 자동으로 닫지 않음
 * - 닫힘은 오직 X / 바깥 클릭 / ESC 로만 처리
 */

import {
   getRecentSearches,
   addRecentSearch,
   removeRecentSearch,
   clearRecentSearches,
} from './searchHistory.js';

/* ==============================
   0) 상수 / 셀렉터
   ============================== */

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

/* ==============================
   0-1) 안전 유틸(escape / encode)
   - 칩 텍스트는 DOM에 그대로 들어가므로 XSS 방지
   - data-attribute에는 encodeURIComponent로 안전하게 저장
   ============================== */

function escapeHtml(value) {
   return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}

function encodeAttr(value) {
   // data-* 속성에 넣을 안전한 값
   return encodeURIComponent(String(value ?? ''));
}

function decodeAttr(value) {
   try {
      return decodeURIComponent(String(value ?? ''));
   } catch {
      return String(value ?? '');
   }
}

let isBound = false;

/* ==============================
   1) 최근 검색어 저장소(searchHistory)
   ============================== */

function readRecent() {
   return getRecentSearches();
}

function addRecent(keyword) {
   addRecentSearch(keyword);
}

function clearRecent() {
   clearRecentSearches();
}

/* ==============================
   2) 열기/닫기(상태) 제어
   ============================== */

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

/* ==============================
   3) UI 렌더(칩) + 검색 실행
   ============================== */

// ✅ 최근검색 데이터가 바뀌면 "다른 화면(SearchPage)"에도 알려주기
function emitRecentChanged() {
   window.dispatchEvent(new CustomEvent('recent-search:changed'));
}

function renderChips(listEl, items, onClick, options = {}) {
   if (!listEl) return;

   const { removable = false } = options;

   // 빈 상태
   if (!items || !items.length) {
      listEl.innerHTML = "<li><span class='chip-empty'>없음</span></li>";
      return;
   }

   listEl.innerHTML = items
      .map((text) => {
         const label = escapeHtml(text);
         const chipValue = encodeAttr(text);

         const removeBtn = removable
            ? `<button type='button' class='chip-remove' data-action='remove' data-chip='${chipValue}' aria-label='최근 검색어 삭제'>×</button>`
            : '';

         return `
      <li>
        <div class='chip-row'>
          <button type='button' class='chip-btn' data-chip='${chipValue}'>${label}</button>
          ${removeBtn}
        </div>
      </li>
    `;
      })
      .join('');

   listEl.onclick = (e) => {
      // (1) 삭제 버튼 클릭
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

      // (2) 칩(검색어) 클릭
      const btn = e.target.closest(
         "button[data-chip]:not([data-action='remove'])",
      );
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const value = decodeAttr(btn.getAttribute('data-chip'));
      onClick(value);
   };
}

function submitSearch(keyword) {
   const q = String(keyword || '').trim();
   if (!q) return;

   addRecent(q);
   emitRecentChanged();
   const inputEl = document.querySelector(SELECTORS.input);
   if (inputEl) inputEl.value = '';

   syncLists();

   const url = `/search?q=${encodeURIComponent(q)}`;
   window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { href: url } }),
   );
}

function syncLists() {
   const recentEl = document.querySelector(SELECTORS.recentList);
   const suggestEl = document.querySelector(SELECTORS.suggestList);

   renderChips(
      recentEl,
      readRecent(),
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

/* ==============================
   4) 초기화(이벤트 등록)
   ============================== */

export function initSearchDrawer() {
   if (isBound) {
      // 라우팅으로 DOM이 교체되었을 수 있으니, 최신 리스트만 동기화
      syncLists();
      return {
         open: () => setOpen(true),
         close: () => setOpen(false),
         toggle: () =>
            setOpen(!document.body.classList.contains('is-search-open')),
         refresh: () => syncLists(),
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
         // ✅ 라우팅으로 DOM이 교체된 뒤에도 최신 DOM에 칩을 다시 그려주기
         syncLists();
         setOpen(true);
         return;
      }

      if (clearBtn) {
         clearRecent();
         emitRecentChanged();
         syncLists();
         return;
      }

      if (closeBtn) {
         setOpen(false);
         return;
      }

      const isOpen = document.body.classList.contains('is-search-open');
      if (isOpen && (overlay || !clickedInsideDrawer)) {
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
      toggle: () =>
         setOpen(!document.body.classList.contains('is-search-open')),
      refresh: () => syncLists(),
   };
}
