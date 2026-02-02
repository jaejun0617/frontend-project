/**
 * =============================================
 * 📍 위치: src/api/products.js
 * 역할: 상품 데이터를 가져오는 "데이터 레이어"
 *
 * ✅ MVP: API/DB 없이 목업(mock) 데이터를 반환
 *
 * ✅ 데이터 스펙(자동 생성 100개)
 * - id, name(한글), brand(영문), price, tags, category, image
 * - apparelSizes: ['S','M','L','XL'] 중 랜덤
 * - shoeSizes: 220~280 / 5단위 중 랜덤
 *
 * ✅ 할인/쿠폰 확장 대비
 * - basePrice(정가), discountRate(세일), price(최종가)
 * - couponEligible, couponRateCap, couponTags
 *
 * ✅ 검색 대응
 * - tags에 브랜드/컬러를 영문+한글+별칭으로 함께 넣어
 *   "chanel" / "샤넬" 같이 어떤 입력에도 검색되게 구성
 *
 * ✅ UI(카드) 표시용 태그 정책
 * - 카드에 보여줄 태그는 "브랜드(영문) + 랜덤 뱃지(신상/베스트/HOT)"
 * - 검색용 토큰은 tags에 계속 포함(검색 정확도 유지)
 * =============================================
 */

/* =========================================================
   0) 유틸: 시드 랜덤(새로고침해도 같은 데이터 세트 유지)
   - mulberry32: 빠르고 간단한 pseudo random
   - rand(): 0~1 실수 반환
   ========================================================= */

function mulberry32(seed) {
   let t = seed >>> 0;
   return function () {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
   };
}

// ✅ 시드 고정(원하면 숫자만 바꿔서 “다른 랜덤 세트” 생성 가능)
const rand = mulberry32(617);

function randInt(min, max) {
   return Math.floor(rand() * (max - min + 1)) + min;
}

function pickOne(arr) {
   return arr[randInt(0, arr.length - 1)];
}

function pickSubset(arr, minCount = 1, maxCount = 3) {
   const count = randInt(minCount, Math.min(maxCount, arr.length));
   const copy = [...arr];

   // Fisher-Yates 기반 간단 셔플
   for (let i = copy.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
   }
   return copy.slice(0, count);
}

function formatId(n) {
   return String(n).padStart(3, '0');
}

// ✅ 검색 편의용(소문자 토큰)
function toSearchToken(value) {
   return String(value ?? '')
      .trim()
      .toLowerCase();
}

/* =========================================================
      1) 도메인 데이터: 카테고리 / 브랜드 / 컬러 / 네이밍 재료
      ========================================================= */

const CATEGORIES = [
   { key: 'bag', label: '가방' },
   { key: 'wallet', label: '지갑' },
   { key: 'watch', label: '시계' },
   { key: 'shoes', label: '신발' },
   { key: 'accessory', label: '액세서리' },
   { key: 'outer', label: '아우터' },
   { key: 'top', label: '상의' },
   { key: 'jewelry', label: '주얼리' },
];

// ✅ brand 필드는 "영문"을 저장
// ✅ tags에는 ko + aliases도 함께 주입해서 검색 범위 확장
const BRANDS = [
   { en: 'Chanel', ko: '샤넬', aliases: ['chanel', '샤넬'] },
   {
      en: 'Louis Vuitton',
      ko: '루이비통',
      aliases: ['louis vuitton', 'lv', '루이비통', '루비통'],
   },
   { en: 'Hermes', ko: '에르메스', aliases: ['hermes', '에르메스'] },
   { en: 'Gucci', ko: '구찌', aliases: ['gucci', '구찌'] },
   { en: 'Prada', ko: '프라다', aliases: ['prada', '프라다'] },
   { en: 'Dior', ko: '디올', aliases: ['dior', '디올'] },
   {
      en: 'Saint Laurent',
      ko: '생로랑',
      aliases: ['saint laurent', 'ysl', '생로랑'],
   },
   {
      en: 'Balenciaga',
      ko: '발렌시아가',
      aliases: ['balenciaga', '발렌시아가'],
   },
   {
      en: 'Bottega Veneta',
      ko: '보테가베네타',
      aliases: ['bottega veneta', 'bv', '보테가베네타'],
   },
   { en: 'Burberry', ko: '버버리', aliases: ['burberry', '버버리'] },
   { en: 'Fendi', ko: '펜디', aliases: ['fendi', '펜디'] },
   { en: 'Celine', ko: '셀린느', aliases: ['celine', '셀린느'] },
   { en: 'Loewe', ko: '로에베', aliases: ['loewe', '로에베'] },
   { en: 'Moncler', ko: '몽클레르', aliases: ['moncler', '몽클레르'] },
   {
      en: 'Off-White',
      ko: '오프화이트',
      aliases: ['off-white', '오프화이트', '오프화이트'],
   },
   {
      en: 'Maison Margiela',
      ko: '메종 마르지엘라',
      aliases: ['maison margiela', 'margiela', '메종 마르지엘라', '마르지엘라'],
   },
   {
      en: 'Thom Browne',
      ko: '톰 브라운',
      aliases: ['thom browne', '톰 브라운'],
   },
   { en: 'Valentino', ko: '발렌티노', aliases: ['valentino', '발렌티노'] },
   { en: 'Givenchy', ko: '지방시', aliases: ['givenchy', '지방시'] },
   { en: 'Rolex', ko: '롤렉스', aliases: ['rolex', '롤렉스'] },
   { en: 'Omega', ko: '오메가', aliases: ['omega', '오메가'] },
   { en: 'Cartier', ko: '까르띠에', aliases: ['cartier', '까르띠에'] },
   { en: 'Bvlgari', ko: '불가리', aliases: ['bvlgari', 'bulgari', '불가리'] },
];

// ✅ color는 영문을 기준으로 쓰되 ko/aliases도 tags에 포함
const COLORS = [
   { en: 'Black', ko: '블랙', aliases: ['black', '블랙'] },
   {
      en: 'Off-White',
      ko: '오프화이트',
      aliases: ['offwhite', 'off-white', '오프화이트'],
   },
   { en: 'Beige', ko: '베이지', aliases: ['beige', '베이지'] },
   { en: 'Navy', ko: '네이비', aliases: ['navy', '네이비'] },
   { en: 'Khaki', ko: '카키', aliases: ['khaki', '카키'] },
   { en: 'Burgundy', ko: '버건디', aliases: ['burgundy', '버건디', '와인'] },
   { en: 'Gray', ko: '그레이', aliases: ['gray', 'grey', '그레이'] },
];

const MATERIAL_KR = [
   '가죽',
   '스웨이드',
   '캔버스',
   '실크',
   '캐시미어',
   '울',
   '데님',
   '코튼',
   '나일론',
];

const STYLE_KR = [
   '시그니처',
   '클래식',
   '미니멀',
   '아이코닉',
   '뉴 시즌',
   '모노그램',
   '테일러드',
   '하이엔드',
   '프리미엄',
   '스페셜',
];

const ITEM_BY_CATEGORY = {
   bag: ['숄더백', '토트백', '크로스백', '미니백', '버킷백', '백팩'],
   wallet: ['반지갑', '장지갑', '카드지갑', '지퍼월렛'],
   watch: ['클래식 워치', '드레스 워치', '메탈 워치', '가죽 워치'],
   shoes: ['스니커즈', '로퍼', '부츠', '더비 슈즈', '플랫'],
   accessory: ['스카프', '벨트', '선글라스', '캡', '글러브'],
   outer: ['캐시미어 코트', '울 코트', '다운 재킷', '레더 재킷', '트렌치코트'],
   top: ['셔츠', '니트', '후디', '티셔츠', '자켓'],
   jewelry: ['브레이슬릿', '링', '네크리스', '이어링'],
};

// ✅ 카테고리별 정가 범위(원) - 대략적인 명품 가격대
const PRICE_RANGE_BY_CATEGORY = {
   bag: [1200000, 6500000],
   wallet: [450000, 2200000],
   watch: [2500000, 18000000],
   shoes: [650000, 2800000],
   accessory: [250000, 1600000],
   outer: [1400000, 9000000],
   top: [350000, 3200000],
   jewelry: [900000, 15000000],
};

/* =========================================================
      2) 사이즈 풀
      ========================================================= */

const APPAREL_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = Array.from({ length: 13 }, (_, i) => 220 + i * 5); // 220~280(5단위)

/* =========================================================
      3) 가격 / 할인 / 쿠폰(확장 대비 필드)
      ========================================================= */

function buildBasePrice(category) {
   const [min, max] = PRICE_RANGE_BY_CATEGORY[category] ?? [300000, 2000000];
   const raw = randInt(min, max);

   // ✅ 1만원 단위로 정리(가격이 보기 좋게 떨어지도록)
   return Math.round(raw / 10000) * 10000;
}

function buildPromotion(category) {
   // ✅ 일부 상품만 세일 적용
   const hasPromo = rand() < 0.35;

   // ✅ 쿠폰 사용 가능 여부/최대 할인율(캡)
   const couponEligible = rand() < 0.6;
   const couponRateCap = couponEligible ? randInt(5, 15) / 100 : 0;

   // ✅ 시계/주얼리는 할인 폭을 보수적으로
   const discountRatePool =
      category === 'watch' || category === 'jewelry'
         ? [0.05, 0.08, 0.1]
         : [0.05, 0.1, 0.12, 0.15, 0.2];

   const discountRate = hasPromo ? pickOne(discountRatePool) : 0;

   // ✅ 쿠폰 분류 태그(향후 조건 필터/프로모션 로직용)
   const couponTags = couponEligible
      ? pickSubset(['WELCOME', 'SEASON', 'VIP', 'APP_ONLY', 'BUNDLE'], 1, 2)
      : [];

   return { discountRate, couponEligible, couponRateCap, couponTags };
}

function applyDiscount(basePrice, discountRate = 0) {
   if (!discountRate) return basePrice;

   // ✅ 세일 적용 후 1만원 단위로 정리
   const discounted =
      Math.round((basePrice * (1 - discountRate)) / 10000) * 10000;

   return Math.max(discounted, 10000);
}

/* =========================================================
      4) 네임 / 태그 생성
      ========================================================= */

/**
 * name 정책
 * - 상품명에는 브랜드를 넣지 않음(요구사항)
 * - 색상은 (영문)으로만 표시
 */
function buildKoreanName({ category, colorEn }) {
   const item = pickOne(ITEM_BY_CATEGORY[category] ?? ['아이템']);
   const style = pickOne(STYLE_KR);
   const material = pickOne(MATERIAL_KR);

   // ⚠️ colorText는 정책상 필요하지만, 현재 name 조합에는 포함하지 않음(현 코드 유지)
   const colorText = colorEn ? ` (${colorEn})` : '';

   return `${style} ${material} ${item}`;
}

/**
 * tags 정책
 * - displayTags: 카드에서 보여줄 태그(브랜드(영문) + 랜덤 뱃지)
 * - searchTokens: 검색을 위한 토큰(브랜드/컬러 ko+en+aliases, 카테고리, name 키워드)
 */
function buildTags({ brand, category, name, color }) {
   const categoryLabel = (
      CATEGORIES.find((c) => c.key === category)?.label ?? ''
   ).trim();

   /* --------------------------------
         0) 카드 표시용 뱃지(랜덤)
         - 브랜드는 항상 노출
         - 신상/베스트/HOT는 확률로 노출
         - 최소 1개는 보이게(카드가 심심하지 않게)
         -------------------------------- */
   const badges = [];

   // 신상: 45%
   if (rand() < 0.45) badges.push('신상');

   // 베스트: 30%
   if (rand() < 0.3) badges.push('베스트');

   // HOT: 18%
   if (rand() < 0.18) badges.push('HOT');

   // 최소 1개 보장
   if (!badges.length) badges.push(pickOne(['신상', '베스트', 'HOT']));

   // 최대 1개만 노출(현재 정책 유지)
   const pickedBadges = badges.slice(0, 1);

   // ✅ 카드에 보여줄 태그
   const displayTags = [brand.en, ...pickedBadges].filter(Boolean);

   /* --------------------------------
         1) 검색용 토큰
         - 브랜드: en/ko/별칭 + 소문자
         - 컬러: en/ko/별칭 + 소문자
         - 카테고리: key + label
         - 상품명 키워드
         -------------------------------- */
   const brandSearchTokens = [
      brand.en,
      toSearchToken(brand.en),
      brand.ko,
      toSearchToken(brand.ko),
      ...(brand.aliases ?? []),
      ...(brand.aliases ?? []).map(toSearchToken),
   ].filter(Boolean);

   const colorSearchTokens = [
      color?.en,
      toSearchToken(color?.en),
      color?.ko,
      toSearchToken(color?.ko),
      ...(color?.aliases ?? []),
      ...(color?.aliases ?? []).map(toSearchToken),
   ].filter(Boolean);

   const nameTokens = String(name ?? '')
      .replace(/[()]/g, '')
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean);

   const searchTokens = [
      category,
      categoryLabel,
      ...brandSearchTokens,
      ...colorSearchTokens,
      ...nameTokens,
   ].filter(Boolean);

   // ✅ "원본 + 소문자"를 함께 보관(검색 정확도 ↑)
   const normalizedSearchTokens = searchTokens.flatMap((t) => {
      const raw = String(t ?? '').trim();
      if (!raw) return [];
      const lower = raw.toLowerCase();
      return raw === lower ? [raw] : [raw, lower];
   });

   // ✅ 최종 tags = 표시용 + 검색용(중복 제거)
   return Array.from(
      new Set([...displayTags, ...normalizedSearchTokens]),
   ).slice(0, 40);
}

/* =========================================================
      5) 목업 생성(100개)
      ========================================================= */

function buildSizes(category) {
   // 신발 카테고리: shoeSizes만 부여
   if (category === 'shoes') {
      return {
         apparelSizes: [],
         shoeSizes: pickSubset(SHOE_SIZES, 2, 6).sort((a, b) => a - b),
      };
   }

   // 의류 카테고리: apparelSizes를 더 자주 부여
   if (category === 'outer' || category === 'top') {
      return {
         apparelSizes: pickSubset(APPAREL_SIZES, 2, 4),
         shoeSizes: [],
      };
   }

   // 그 외: 사이즈 없음도 가능
   const hasApparel = rand() < 0.25;
   return {
      apparelSizes: hasApparel ? pickSubset(APPAREL_SIZES, 1, 3) : [],
      shoeSizes: [],
   };
}

function createMockProducts(count = 100) {
   const products = [];

   for (let i = 1; i <= count; i++) {
      const id = `p-${formatId(i)}`;

      const { key: category } = pickOne(CATEGORIES);
      const brand = pickOne(BRANDS); // {en, ko, aliases}
      const color = pickOne(COLORS); // {en, ko, aliases}

      const name = buildKoreanName({
         brandEn: brand.en,
         category,
         colorEn: color.en,
      });

      const basePrice = buildBasePrice(category);
      const promo = buildPromotion(category);
      const price = applyDiscount(basePrice, promo.discountRate);

      const sizes = buildSizes(category);
      const tags = buildTags({ brand, category, name, color });

      // ✅ 이미지 리소스는 추후 연결(현재는 빈 문자열 유지)
      const image = '';

      products.push({
         id,
         name,
         brand: brand.en,
         price,
         basePrice,
         discountRate: promo.discountRate,
         couponEligible: promo.couponEligible,
         couponRateCap: promo.couponRateCap,
         couponTags: promo.couponTags,
         tags,
         category,
         image,
         ...sizes,
      });
   }

   return products;
}

// ✅ 앱 구동 시 한 번만 생성(시드 고정이라 결과도 고정)
const MOCK_PRODUCTS = createMockProducts(100);

/* =========================================================
      6) API 함수
      ========================================================= */

/**
 * 상품 목록 조회
 * - 실제 API 연결 시 fetch 로직만 여기로 교체하면 됨
 */
export async function getProducts() {
   // 로딩 상태 연습용 딜레이
   await new Promise((r) => setTimeout(r, 250));
   return MOCK_PRODUCTS;
}
