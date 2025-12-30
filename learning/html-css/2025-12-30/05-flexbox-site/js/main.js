// ========================
// Mobile Menu
// ========================
const menuBtn = document.querySelector('#menuBtn');
const closeMenuBtn = document.querySelector('#closeMenuBtn');
const mobileMenu = document.querySelector('#mobileMenu');

function openMenu() {
   mobileMenu.classList.add('is-open');
   menuBtn.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
   mobileMenu.classList.remove('is-open');
   menuBtn.setAttribute('aria-expanded', 'false');
}

menuBtn?.addEventListener('click', openMenu);
closeMenuBtn?.addEventListener('click', closeMenu);

mobileMenu?.addEventListener('click', (e) => {
   // 오버레이 바깥 클릭 시 닫기
   if (e.target === mobileMenu) closeMenu();
});

// 메뉴 링크 클릭 시 닫기
document.querySelectorAll('.mobile-link').forEach((a) => {
   a.addEventListener('click', closeMenu);
});

// ========================
// Swiper: Community Slider
// ========================
const communitySwiper = new Swiper('.community-swiper', {
   loop: true,
   slidesPerView: 1.1,
   spaceBetween: 14,
   breakpoints: {
      720: { slidesPerView: 2.2 },
      1024: { slidesPerView: 3.2 },
   },
});

document.querySelector('#communityPrev')?.addEventListener('click', () => {
   communitySwiper.slidePrev();
});
document.querySelector('#communityNext')?.addEventListener('click', () => {
   communitySwiper.slideNext();
});

// ========================
// (선택) Hero Arrow는 데모 UI (실제 슬라이드 연결은 다음 단계)
// ========================
document.querySelectorAll('.hero-arrow').forEach((btn) => {
   btn.addEventListener('click', () => {
      // 나중에 Hero 슬라이더 붙이면 여기에 연결
      console.log('Hero arrow clicked');
   });
});
