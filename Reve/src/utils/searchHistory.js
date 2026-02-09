/**
 * =============================================
 * 📍 위치: src/utils/searchHistory.js
 * 역할: 최근 검색어 저장소(localStorage) 단일 모듈
 *
 * ✅ 책임
 * - 최근 검색어 CRUD (추가/삭제/전체삭제)
 * - 데이터 정규화(trim) + 중복 제거 + 최대 개수 제한
 * - (하위호환) 구 키에서 신 키로 마이그레이션
 *
 * ✅ 사용처
 * - src/utils/searchDrawer.js
 * - src/pages/search/index.js
 * =============================================
 */

const STORAGE_KEY = 'reve_recent_searches_v1';
const LEGACY_STORAGE_KEY = 'eclat_recent_searches'; // ✅ 과거 키 하위호환
const MAX_ITEMS = 20;

/* =============================================
 * 0) Utils
 * ============================================= */

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
   const seen = new Set();
   const out = [];
   for (const v of items) {
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
   }
   return out;
}

/**
 * ✅ 마이그레이션(1회)
 * - 새 키가 비어있고, 구 키가 존재하면 새 키로 옮긴다.
 */
function migrateIfNeeded() {
   const hasNew = localStorage.getItem(STORAGE_KEY);
   if (hasNew) return;

   const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
   if (!legacyRaw) return;

   const parsed = safeParse(legacyRaw);
   const items = Array.isArray(parsed) ? parsed : [];
   const cleaned = items.map((v) => normalize(v)).filter(Boolean);

   const unique = uniquePreserveOrder(cleaned).slice(0, MAX_ITEMS);
   localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
   localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/* =============================================
 * 1) Read
 * ============================================= */

/**
 * 최근 검색어 목록 가져오기
 * @returns {string[]}
 */
export function getRecentSearches() {
   migrateIfNeeded();

   const raw = localStorage.getItem(STORAGE_KEY);
   const parsed = raw ? safeParse(raw) : [];

   const items = Array.isArray(parsed) ? parsed : [];
   const cleaned = items.map((v) => normalize(v)).filter(Boolean);

   return cleaned.slice(0, MAX_ITEMS);
}

/* =============================================
 * 2) Write (internal)
 * ============================================= */

function setRecentSearches(items) {
   const cleaned = items.map((v) => normalize(v)).filter(Boolean);
   const unique = uniquePreserveOrder(cleaned).slice(0, MAX_ITEMS);
   localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

/* =============================================
 * 3) Create/Update
 * ============================================= */

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

/* =============================================
 * 4) Delete
 * ============================================= */

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

/* =============================================
 * 5) Meta
 * ============================================= */

export const RECENT_SEARCH_MAX = MAX_ITEMS;
export const RECENT_SEARCH_STORAGE_KEY = STORAGE_KEY;
