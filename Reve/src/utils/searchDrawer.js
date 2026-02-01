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
 * 3) 최근 검색어(localStorage) 저장/삭제/클릭 검색
 * 4) 추천 검색어(정적 배열) 클릭 검색
 * 5) 검색 실행 시 URL을 /search?q=... 로 변경(pushState)
 *
 * ⚠️ 중요한 UX 규칙(현재 설계)
 * - Enter/검색 버튼/칩 클릭으로 “검색 실행”을 해도 드로어는 자동으로 닫지 않음
 * - 닫힘은 오직 X / 바깥 클릭 / ESC 로만 처리
 */

/* ==============================
   0) 상수 / 셀렉터
   ============================== */

// 최근 검색어를 저장할 localStorage 키
const STORAGE_KEY = 'eclat_recent_searches';

// HTML에서 찾을 요소 셀렉터들(유지보수 포인트)
const SELECTORS = {
   // 헤더/모바일에 둘 다 있을 수 있는 토글 버튼
   toggleBtn: '.search-toggle',

   // 드로어(패널) 자체
   drawer: '#search-drawer',

   // 바깥(어두운) 오버레이
   overlay: '[data-search-overlay]',

   // 닫기(X) 버튼
   closeBtn: '.search-close',

   // 검색 폼 / input
   form: '[data-search-form]',
   input: '.search-input',

   // 최근/추천 리스트 컨테이너
   recentList: '[data-search-recent]',
   suggestList: '[data-search-suggest]',

   // 최근 검색어 전체 삭제 버튼
   clearBtn: '[data-search-clear]',
};

// 추천 검색어는 MVP라서 일단 정적 데이터로 시작(나중에 API/DB로 교체 가능)
const DEFAULT_SUGGESTIONS = [
   'New Season',
   'Prada',
   'Louis Vuitton',
   'Chanel',
   'Cartier',
];

/* ==============================
   1) localStorage 유틸
   ============================== */

// 최근 검색어 읽기
function readRecent() {
   try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      // localStorage는 문자열이라 파싱 실패/형태 오류 대비
      return Array.isArray(parsed) ? parsed : [];
   } catch {
      return [];
   }
}

// 최근 검색어 저장(배열 형태)
function writeRecent(items) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 최근 검색어 추가
// - 공백 제거(trim)
// - 중복 제거
// - 최대 20개 유지
function addRecent(keyword) {
   const trimmed = String(keyword || '').trim();
   if (!trimmed) return;

   const items = readRecent();
   const next = [trimmed, ...items.filter((v) => v !== trimmed)].slice(0, 20);
   writeRecent(next);
}

// 최근 검색어 전체 삭제
function clearRecent() {
   writeRecent([]);
}

/* ==============================
   2) 열기/닫기(상태) 제어
   ============================== */

/**
 * 접근성(aria) 상태 동기화
 * - aria-hidden: 패널/오버레이가 보이는지 여부
 * - aria-expanded: 토글 버튼이 열림 상태인지 여부
 */
function setAria({ drawerEl, overlayEl, toggleEls, isOpen }) {
   if (drawerEl) drawerEl.setAttribute('aria-hidden', String(!isOpen));
   if (overlayEl) overlayEl.setAttribute('aria-hidden', String(!isOpen));

   // 토글 버튼은 헤더/모바일 등 여러 개일 수 있음
   toggleEls.forEach((btn) =>
      btn.setAttribute('aria-expanded', String(isOpen)),
   );
}

/**
 * 실제로 열고 닫는 함수
 * - body에 is-search-open 클래스를 붙이거나 제거해서 CSS 애니메이션 트리거
 */
function setOpen(isOpen) {
   const body = document.body;
   const drawerEl = document.querySelector(SELECTORS.drawer);
   const overlayEl = document.querySelector(SELECTORS.overlay);
   const toggleEls = Array.from(document.querySelectorAll(SELECTORS.toggleBtn));

   // 1) CSS 상태 토글
   body.classList.toggle('is-search-open', isOpen);

   // 2) aria 상태 토글
   setAria({ drawerEl, overlayEl, toggleEls, isOpen });

   // 3) 열릴 때 입력창 포커스(UX)
   if (isOpen) {
      const inputEl = document.querySelector(SELECTORS.input);
      if (inputEl) inputEl.focus();
   }
}

/* ==============================
   3) UI 렌더(칩) + 검색 실행
   ============================== */

/**
 * 칩(chip) 리스트 렌더
 * - items 배열을 버튼 리스트로 만들고
 * - 클릭 시 onClick(text)를 호출
 */
function renderChips(listEl, items, onClick) {
   if (!listEl) return;

   // 빈 상태
   if (!items.length) {
      listEl.innerHTML = "<li><span class='chip-empty'>없음</span></li>";
      return;
   }

   // 버튼 리스트 만들기
   listEl.innerHTML = items
      .map(
         (text) => `
      <li>
        <button type='button' data-chip='${text}'>${text}</button>
      </li>
    `,
      )
      .join('');

   // 리스트 안의 버튼 클릭은 위임으로 처리
   listEl.onclick = (e) => {
      const btn = e.target.closest('button[data-chip]');
      if (!btn) return;

      const value = btn.getAttribute('data-chip');
      onClick(value);
   };
}

/**
 * 검색 실행
 * - 최근 검색어 저장
 * - input 비우기
 * - URL을 /search?q= 로 변경(pushState)
 */
function submitSearch(keyword) {
   const q = String(keyword || '').trim();
   if (!q) return;

   // 1) 최근 검색어 저장
   addRecent(q);

   // 2) 검색 직후 input을 비워서 다음 검색이 편하게
   const inputEl = document.querySelector(SELECTORS.input);
   if (inputEl) inputEl.value = '';

   // 3) 최근/추천 리스트 즉시 갱신(칩 클릭 검색도 바로 반영)
   syncLists();

   // 4) (중요) 검색 실행 시에는 드로어를 자동으로 닫지 않음
   // 닫힘은 오직 X 버튼 / 바깥 클릭 / ESC 로만 처리

   // 5) /search?q= 로 이동
   // - 라우터가 붙어 있다면 popstate 리스너가 페이지 렌더를 실행함
   const url = `/search?q=${encodeURIComponent(q)}`;
   window.history.pushState({}, '', url);
   window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * 최근/추천 리스트를 화면에 동기화
 */
function syncLists() {
   const recentEl = document.querySelector(SELECTORS.recentList);
   const suggestEl = document.querySelector(SELECTORS.suggestList);

   // 최근 검색어 칩
   renderChips(recentEl, readRecent(), (value) => {
      const inputEl = document.querySelector(SELECTORS.input);
      if (inputEl) inputEl.value = value;
      submitSearch(value);
   });

   // 추천 검색어 칩
   renderChips(suggestEl, DEFAULT_SUGGESTIONS, (value) => {
      const inputEl = document.querySelector(SELECTORS.input);
      if (inputEl) inputEl.value = value;
      submitSearch(value);
   });
}

/* ==============================
   4) 초기화(이벤트 등록)
   ============================== */

/**
 * initSearchDrawer
 * - 앱 시작 시 1회만 호출
 * - 이벤트 위임으로 처리해서 헤더가 재렌더돼도 안정적
 */
export function initSearchDrawer() {
   // 1) 초기 렌더
   syncLists();

   // 2) 클릭: 열기/닫기/전체삭제
   document.addEventListener('click', (e) => {
      const toggle = e.target.closest(SELECTORS.toggleBtn);
      const closeBtn = e.target.closest(SELECTORS.closeBtn);
      const overlay = e.target.closest(SELECTORS.overlay);
      const clearBtn = e.target.closest(SELECTORS.clearBtn);

      // 드로어 내부 클릭인지 판단(바깥 클릭 닫기용)
      const drawerEl = document.querySelector(SELECTORS.drawer);
      const clickedInsideDrawer = drawerEl
         ? drawerEl.contains(e.target)
         : false;

      // (1) 토글 버튼 클릭 -> 열기
      if (toggle) {
         setOpen(true);
         return;
      }

      // (2) 전체 삭제
      if (clearBtn) {
         clearRecent();
         syncLists();
         return;
      }

      // (3) 닫기 버튼 클릭 -> 닫기
      if (closeBtn) {
         setOpen(false);
         return;
      }

      // (4) 바깥(오버레이/드로어 외부) 클릭 -> 닫기
      // - 오버레이 div를 정확히 클릭하지 못해도
      //   “드로어 바깥 클릭”이면 닫히도록 안전장치
      const isOpen = document.body.classList.contains('is-search-open');
      if (isOpen && (overlay || !clickedInsideDrawer)) {
         setOpen(false);
      }
   });

   // 3) ESC 닫기
   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
   });

   // 4) 폼 제출: 검색 실행(Enter/검색 버튼)
   document.addEventListener('submit', (e) => {
      const form = e.target.closest(SELECTORS.form);
      if (!form) return;

      e.preventDefault();

      const inputEl = form.querySelector(SELECTORS.input);
      submitSearch(inputEl ? inputEl.value : '');

      // submitSearch 내부에서 syncLists()를 호출하지만,
      // 혹시 구조 변경 시를 대비해 여기서 다시 호출해도 안전
      syncLists();
   });

   // 5) 초기 상태: 닫힘
   setOpen(false);

   // 필요하면 외부에서 제어할 수 있는 최소 API 반환
   return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () =>
         setOpen(!document.body.classList.contains('is-search-open')),
      refresh: () => syncLists(),
   };
}
