/**
 * =============================================
 * 📍 위치 예시: src/pages/home/init.js (또는 home/index.js 하단)
 * 역할: Hero Fade Swiper - 5초 자동 루프 + dot 클릭
 * =============================================
 */
export function initHomeHero() {
   const root = document.querySelector('[data-hero]');
   if (!root) return;

   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
   const dots = Array.from(root.querySelectorAll('[data-hero-dot]'));

   if (!slides.length) return;

   const INTERVAL_MS = 5000;
   let active = slides.findIndex((el) => el.classList.contains('is-active'));
   if (active < 0) active = 0;

   let timer = null;
   let locked = false;

   const setActive = (nextIdx) => {
      if (locked) return;
      locked = true;

      const next = (nextIdx + slides.length) % slides.length;

      slides.forEach((el, i) => {
         const on = i === next;
         el.classList.toggle('is-active', on);
         el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });

      dots.forEach((d, i) => {
         const on = i === next;
         d.classList.toggle('is-active', on);
         d.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      active = next;

      // 페이드 트랜지션 시간과 맞춤( CSS에서 700ms )
      window.setTimeout(() => {
         locked = false;
      }, 7000);
   };

   const next = () => setActive(active + 1);

   const start = () => {
      stop();
      timer = window.setInterval(next, INTERVAL_MS);
   };

   const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
   };

   // dot 클릭 이동
   root.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-hero-dot]');
      if (!dot) return;

      const idx = Number(dot.getAttribute('data-hero-dot'));
      if (!Number.isFinite(idx)) return;

      setActive(idx);
      start(); // 클릭 후 자동 재시작
   });

   // 접근성/배터리: 탭 비활성 시 멈춤
   document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
   });

   // 시작
   setActive(active);
   start();
}
