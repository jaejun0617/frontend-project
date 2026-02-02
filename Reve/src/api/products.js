/**
 * =============================================
 * 📍 위치: src/api/products.js
 * 역할: 상품 데이터를 가져오는 "데이터 레이어"
 * =============================================
 */

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

   for (let i = copy.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
   }
   return copy.slice(0, count);
}

function formatId(n) {
   return String(n).padStart(3, '0');
}

function toSearchToken(value) {
   return String(value ?? '')
      .trim()
      .toLowerCase();
}

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
   { en: 'Off-White', ko: '오프화이트', aliases: ['off-white', '오프화이트'] },
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

const APPAREL_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = Array.from({ length: 13 }, (_, i) => 220 + i * 5);

function buildImageUrl({ id, category }) {
   const text = encodeURIComponent(`${category}\n${id}`);
   return `https://placehold.co/800x800?text=${text}`;
}

function buildBasePrice(category) {
   const [min, max] = PRICE_RANGE_BY_CATEGORY[category] ?? [300000, 2000000];
   const raw = randInt(min, max);
   return Math.round(raw / 10000) * 10000;
}

function buildPromotion(category) {
   const hasPromo = rand() < 0.35;

   const couponEligible = rand() < 0.6;
   const couponRateCap = couponEligible ? randInt(5, 15) / 100 : 0;

   const discountRatePool =
      category === 'watch' || category === 'jewelry'
         ? [0.05, 0.08, 0.1]
         : [0.05, 0.1, 0.12, 0.15, 0.2];

   const discountRate = hasPromo ? pickOne(discountRatePool) : 0;

   const couponTags = couponEligible
      ? pickSubset(['WELCOME', 'SEASON', 'VIP', 'APP_ONLY', 'BUNDLE'], 1, 2)
      : [];

   return { discountRate, couponEligible, couponRateCap, couponTags };
}

function applyDiscount(basePrice, discountRate = 0) {
   if (!discountRate) return basePrice;
   const discounted =
      Math.round((basePrice * (1 - discountRate)) / 10000) * 10000;
   return Math.max(discounted, 10000);
}

function buildColorOptions() {
   // 1~3개 컬러 옵션 제공
   const count = randInt(1, 3);
   const picked = pickSubset(COLORS, count, count);
   return picked.map((c) => ({ en: c.en, ko: c.ko }));
}

function buildKoreanName({ category }) {
   const item = pickOne(ITEM_BY_CATEGORY[category] ?? ['아이템']);
   const style = pickOne(STYLE_KR);
   const material = pickOne(MATERIAL_KR);
   return `${style} ${material} ${item}`;
}

function buildTags({ brand, category, name, color }) {
   const categoryLabel = (
      CATEGORIES.find((c) => c.key === category)?.label ?? ''
   ).trim();

   // 카드 표시용: 브랜드(영문) + 랜덤 뱃지 1개
   const badges = [];
   if (rand() < 0.45) badges.push('신상');
   if (rand() < 0.3) badges.push('베스트');
   if (rand() < 0.18) badges.push('HOT');
   if (!badges.length) badges.push(pickOne(['신상', '베스트', 'HOT']));
   const displayTags = [brand.en, pickOne(badges)].filter(Boolean);

   // 검색용 토큰(영문/한글/별칭/소문자)
   const brandTokens = [
      brand.en,
      toSearchToken(brand.en),
      brand.ko,
      toSearchToken(brand.ko),
      ...(brand.aliases ?? []),
      ...(brand.aliases ?? []).map(toSearchToken),
   ].filter(Boolean);

   const colorTokens = [
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
      ...brandTokens,
      ...colorTokens,
      ...nameTokens,
   ].filter(Boolean);

   const normalized = searchTokens.flatMap((t) => {
      const raw = String(t ?? '').trim();
      if (!raw) return [];
      const lower = raw.toLowerCase();
      return raw === lower ? [raw] : [raw, lower];
   });

   return Array.from(new Set([...displayTags, ...normalized])).slice(0, 40);
}

function buildSizes(category) {
   // ✅ 의류 사이즈 정렬 우선순위
   const APPAREL_ORDER = { S: 1, M: 2, L: 3, XL: 4 };
   const sortApparel = (arr) =>
      [...arr].sort(
         (a, b) => (APPAREL_ORDER[a] || 99) - (APPAREL_ORDER[b] || 99),
      );

   // ✅ 신발은 숫자 오름차순
   const sortShoes = (arr) => [...arr].sort((a, b) => Number(a) - Number(b));

   if (category === 'shoes') {
      return {
         apparelSizes: [],
         shoeSizes: sortShoes(pickSubset(SHOE_SIZES, 2, 6)),
      };
   }

   if (category === 'outer' || category === 'top') {
      return {
         apparelSizes: sortApparel(pickSubset(APPAREL_SIZES, 2, 4)),
         shoeSizes: [],
      };
   }

   const hasApparel = rand() < 0.25;
   return {
      apparelSizes: hasApparel
         ? sortApparel(pickSubset(APPAREL_SIZES, 1, 3))
         : [],
      shoeSizes: [],
   };
}
function createMockProducts(count = 100) {
   const products = [];

   for (let i = 1; i <= count; i++) {
      const id = `p-${formatId(i)}`;

      const { key: category } = pickOne(CATEGORIES);
      const brand = pickOne(BRANDS);
      const color = pickOne(COLORS);

      const name = buildKoreanName({ category });

      const basePrice = buildBasePrice(category);
      const promo = buildPromotion(category);
      const price = applyDiscount(basePrice, promo.discountRate);

      const sizes = buildSizes(category);
      const colors = buildColorOptions();
      const tags = buildTags({ brand, category, name, color });
      const image = buildImageUrl({ id, category });
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
         colors, // ✅ 상세 옵션용
         ...sizes,
      });
   }

   return products;
}

const MOCK_PRODUCTS = createMockProducts(100);

export async function getProducts() {
   await new Promise((r) => setTimeout(r, 250));
   return MOCK_PRODUCTS;
}

export async function getProductById(productId) {
   const id = String(productId || '').trim();
   if (!id) return null;

   await new Promise((r) => setTimeout(r, 120));
   return MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
}
