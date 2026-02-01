/**
 * =============================================
 * 📍 위치: src/utils/searchHistory.js
 * 역할: 최근 검색어 저장소(localStorage) 단일 모듈
 *
 * ✅ 이 파일만의 책임
 * - 최근 검색어 CRUD
 * - 데이터 정규화(trim/중복 제거/최대 개수 제한)
 *
 * ✅ 사용처
 * - src/utils/searchDrawer.js (드로어 칩 렌더)
 * - src/pages/search/index.js (페이지 내 최근 검색어 UI)
 *
 * ⚠️ 왜 분리했나?
 * - 페이지 이동(라우팅)으로 DOM이 갈아끼워져도
 *   데이터는 여기(localStorage)에서 일관되게 가져오기 위함
 * =============================================
 */

const STORAGE_KEY = 'eclat_recent_searches';
const MAX_ITEMS = 20;

/* ==============================
   0) 공통 유틸
   ============================== */

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function normalize(keyword) {
   return String(keyword ?? '').trim();
}

function uniquePreserveOrder(items) {
   // Set은 삽입 순서를 유지하므로 중복 제거에 적합
   return Array.from(new Set(items));
}

/* ==============================
   1) Read
   ============================== */

/**
 * 최근 검색어 목록 가져오기
 * @returns {string[]}
 */
export function getRecentSearches() {
   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : [];

   // 형태 방어: 배열이 아니면 빈 배열
   const items = Array.isArray(parsed) ? parsed : [];

   // 문자열로만 정리 + 공백 제거
   const cleaned = items.map((v) => normalize(v)).filter(Boolean);

   return cleaned.slice(0, MAX_ITEMS);
}

/* ==============================
   2) Write helpers
   ============================== */

function setRecentSearches(items) {
   const cleaned = items.map((v) => normalize(v)).filter(Boolean);

   const unique = uniquePreserveOrder(cleaned);
   localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(unique.slice(0, MAX_ITEMS)),
   );
}

/* ==============================
   3) Create/Update
   ============================== */

/**
 * 최근 검색어 추가
 * - 같은 키워드는 가장 앞으로 이동
 * @param {string} keyword
 */
export function addRecentSearch(keyword) {
   const q = normalize(keyword);
   if (!q) return;

   const current = getRecentSearches();
   const next = [q, ...current.filter((v) => v !== q)];
   setRecentSearches(next);
}

/* ==============================
   4) Delete
   ============================== */

/**
 * 최근 검색어 개별 삭제
 * @param {string} keyword
 */
export function removeRecentSearch(keyword) {
   const q = normalize(keyword);
   if (!q) return;

   const current = getRecentSearches();
   const next = current.filter((v) => v !== q);
   setRecentSearches(next);
}

/**
 * 최근 검색어 전체 삭제
 */
export function clearRecentSearches() {
   localStorage.removeItem(STORAGE_KEY);
}

/* ==============================
   5) 메타 정보(선택)
   ============================== */

export const RECENT_SEARCH_MAX = MAX_ITEMS;
export const RECENT_SEARCH_STORAGE_KEY = STORAGE_KEY;
