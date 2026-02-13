/**
 * =============================================
 * 📍 위치: src/pages/home/index.js
 * 역할: 홈(Home) - Hero Swiper(Fade) + Category + Featured Products + Welcome Coupon
 * - header 높이(6vh) 고려한 높이 계산
 * =============================================
 */

export const HERO_SLIDES = [
   {
      key: 'max-mara',
      brand: 'MAX MARA',
      titleKo: '절제의 우아함, 막스마라',
      titleEn: 'Quiet Elegance, MAX MARA',
      subKo: '베이직에 힘을 더해, 매일을 클래식으로.',
      subEn: 'Elevate the everyday with timeless essentials.',
      bg: '/src/images/main/banner/bg__1.png',
   },
   {
      key: 'prada',
      brand: 'PRADA',
      titleKo: '미니멀의 정점, 프라다',
      titleEn: 'The Peak of Minimal, PRADA',
      subKo: '절제된 라인으로 존재감을 말해요.',
      subEn: 'Refined lines, unmistakable presence.',
      bg: '/src/images/main/banner/prada__bg.png',
   },
   {
      key: 'balenciaga',
      brand: 'BALENCIAGA',
      titleKo: '대담함의 실루엣, 발렌시아가',
      titleEn: 'Bold Silhouettes, BALENCIAGA',
      subKo: '스트리트를 하이엔드로 번역합니다.',
      subEn: 'Street energy, translated into high-end.',
      bg: '/src/images/main/banner/balenciaga__bg.png',
   },
   {
      key: 'chanel',
      brand: 'CHANEL',
      titleKo: '클래식의 정수, 샤넬',
      titleEn: 'Eternal Classic, CHANEL',
      subKo: '시간이 지나도 흔들리지 않는 우아함.',
      subEn: 'Elegance that never goes out of time.',
      bg: '/src/images/main/banner/chanel__bg.png',
   },
];

export const HomePage = () => {
   return `
    <!-- =========================================================
      1) HERO SECTION
    ========================================================= -->
    <section class="hero" aria-label="Hero" data-hero>
      <div class="hero__viewport" aria-label="Hero Swiper(Fade)" data-hero-viewport>
        ${HERO_SLIDES.map(
           (s, idx) => `
            <article
              class="hero__slide ${idx === 0 ? 'is-active' : ''}"
              data-hero-slide
              data-hero-key="${s.key}"
              style="--hero-bg: url('${s.bg}');"
              aria-hidden="${idx === 0 ? 'false' : 'true'}"
            >
              <div class="hero__overlay"></div>

              <div class="hero__container">
                <div class="hero__content">
                  <p class="hero__brand" aria-label="Brand">${s.brand}</p>

                  <h1 class="hero__title">
                    <span class="ko">${s.titleKo}</span>
                    <span class="en">${s.titleEn}</span>
                  </h1>

                  <p class="hero__sub">
                    <span class="ko">${s.subKo}</span>
                    <span class="en">${s.subEn}</span>
                  </p>

                  <div class="hero__actions">
                    <button type="button" class="hero__btn" data-hero-cta>
                      쇼핑 시작하기 / Start Shopping
                    </button>
                    <button type="button" class="hero__btn" data-hero-cta-secondary>
                      컬렉션 보기 / View Collection
                    </button>
                  </div>
                </div>
              </div>
            </article>
          `,
        ).join('')}
      </div>

      <div class="hero__dots" aria-label="Hero Pagination" data-hero-dots>
        ${HERO_SLIDES.map(
           (_, idx) => `
            <button
              type="button"
              class="hero__dot ${idx === 0 ? 'is-active' : ''}"
              aria-label="Go to slide ${idx + 1}"
              aria-pressed="${idx === 0 ? 'true' : 'false'}"
              data-hero-dot="${idx}"
            ></button>
          `,
        ).join('')}
      </div>
    </section>

    <!-- =========================================================
      2) CATEGORY SECTION
    ========================================================= -->
    <section class="category" aria-label="Category">
      <div class="container">
        <div class="section-head">
          <h2 class="section-title">Browse by Category</h2>
          <p class="section-sub">명품 편집샵의 핵심 카테고리를 빠르게 탐색하세요.</p>
        </div>

          <div class="category__grid">
            <div class="category__item" role="button" tabindex="0" data-search-q="clothing" data-category='clothing'>
              <span class="category__tag">01</span>
              <p class="category__itemTitle">Clothing</p>
              <p class="category__itemSub">의류</p>
            </div>

            <div class="category__item" role="button" tabindex="0" data-search-q="bag" data-category='bag'>
              <span class="category__tag">02</span>
              <p class="category__itemTitle">Bags</p>
              <p class="category__itemSub">가방</p>
            </div>

            <div class="category__item" role="button" tabindex="0" data-search-q="신발" data-category='shoes'>
              <span class="category__tag">03</span>
              <p class="category__itemTitle">Shoes</p>
              <p class="category__itemSub">신발</p>
            </div>

            <div class="category__item" role="button" tabindex="0" data-search-q="acc" data-category='acc'>
              <span class="category__tag">04</span>
              <p class="category__itemTitle">Accessories</p>
              <p class="category__itemSub">액세서리</p>
            </div>
          </div>
      </div>
    </section>

    <!-- =========================================================
      3) FEATURED PRODUCTS SECTION
    ========================================================= -->
    <section class="home-products" aria-label="Featured Products">
      <div class="container">
        <div class="section-head">
          <h2 class="section-title">Featured Picks</h2>
          <p class="section-sub">지금 가장 반응 좋은 아이템을 먼저 만나보세요.</p>
        </div>

        <div class="home-products__grid" data-home-product-grid>
          <p class="loading">불러오는 중...</p>
        </div>

        <div class="home-products__action">
          <a class="home-products__more" href="/product" data-link>전체 상품 보기</a>
        </div>
      </div>
    </section>

    <!-- =========================================================
      4) WELCOME / EVENT / COUPON SECTION
    ========================================================= -->
    <section class="home-welcome__event__coupon" aria-label="Welcome Coupon">
      <div class="coupon-banner">
        <div class="coupon-banner__content">
          <p class="coupon-banner__eyebrow">REVE GRAND OPEN</p>

          <h2 class="coupon-banner__title">WELCOME NEW MEMBERS!</h2>

          <p class="coupon-banner__subtitle">
            <span class="coupon-banner__subtitle-line">리브에 오신 것을 환영합니다</span>
          </p>

          <p class="coupon-banner__desc">지금 가입하고 몽환한 혜택을 만나보세요!</p>

          <div class="coupon-banner__actions">
<a
  class="coupon-banner__btn coupon-banner__btn--primary"
  href="/auth"
  data-link
  data-coupon-cta
>
  신규회원 쿠폰 받기
</a>

            <a class="coupon-banner__btn coupon-banner__btn--ghost" href="/product" data-link>
              쇼핑하러 가기
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
};
