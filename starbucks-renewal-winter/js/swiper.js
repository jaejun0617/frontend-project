const swiper = new Swiper('.hero-swiper', {
   effect: 'fade',
   fadeEffect: {
      crossFade: true,
   },
   loop: true,
   speed: 1000,
   autoplay: {
      delay: 6000,
      disableOnInteraction: false,
   },
   pagination: {
      el: '.swiper-pagination',
      clickable: true,
   },
});
