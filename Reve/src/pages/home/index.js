/**
 * =============================================
 * 📍 위치: src/pages/home/index.js
 * 역할: 홈(Home) - Hero Swiper(Fade) 랜딩
 * - 5초마다 자동 페이드 무한루프
 * - header 높이(6vh) 고려한 높이 계산
 * =============================================
 */

export const HERO_SLIDES = [
   {
      key: 'max mara',
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
   <section class="hero" aria-label="Hero" data-hero>
     <div class="hero__viewport" aria-label="Hero Swiper(Fade)" data-hero-viewport>
       ${HERO_SLIDES.map(
          (s, idx) => `
           <article
             class="hero__slide ${idx === 0 ? 'is-active' : ''}"
             data-hero-slide
             data-hero-key="${s.key}"
            style="--hero-bg: url('${s.bg}');""
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
 `;
};
