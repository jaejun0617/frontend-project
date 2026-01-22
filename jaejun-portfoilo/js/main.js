/* ======================================================================
 * main.js - 포트폴리오 메인 JavaScript
 * ====================================================================== */

/* ==============================
   DOM ELEMENTS
   ================================ */
const profileCardEl = document.querySelector('.profile__card');
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

/* ==============================
      DATA
      ================================ */
const profiles = [
   {
      name: {
         ko: '신재준 | 사용자 경험을 설계하는 프론트엔드',
         en: 'Jaejun Shin | Frontend Developer crafting UX',
      },

      image: {
         alt: '프론트엔드 개발자 신재준 프로필',
      },
      job: 'Front-end Developer',
      age: '1996 - 06 - 17',
      skill: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Git'],
      city: '경기도 고양시 일산서구',
      description: [
         '사용자가 느끼는 1초의 차이를 위해 최적화에 몰입합니다',
         '비즈니스 문제를 기술로 해결하는 과정에서 보람을 느낍니다',
         '코드 리뷰를 통해 배우고 성장하는 문화를 만들어갑니다',
         '접근성과 성능, 두 마리 토끼를 모두 잡기 위해 노력합니다',
         '새로운 기술을 학습하고 팀에 공유하는 것을 즐깁니다',
      ],
      quotes: [
         {
            en: 'First, solve the problem. Then, write the code.',
            ko: '먼저 문제를 해결하라. 그런 다음 코드를 작성하라.',
            author: 'John Johnson',
         },
         {
            en: `Code is like humor. When you have to explain it, it's bad.`,
            ko: '코드는 유머와 같다. 설명이 필요하면 나쁜 코드다.',
            author: 'Cory House',
         },
         {
            en: 'Make it work, make it right, make it fast.',
            ko: '작동하게, 올바르게, 빠르게 만들어라.',
            author: 'Kent Beck',
         },
         {
            en: 'Simplicity is the soul of efficiency.',
            ko: '단순함이 효율성의 핵심이다.',
            author: 'Austin Freeman',
         },
         {
            en: 'Talk is cheap. Show me the code.',
            ko: '말은 쉽다. 코드로 보여줘라.',
            author: 'Linus Torvalds',
         },
      ],
      isOnline: true,
   },
];
let state = profiles[0];

/* ==============================
      VALIDATION
      ================================ */
function validateProfile(profile) {
   const errors = [];

   if (
      typeof profile.name !== 'object' ||
      !profile.name.ko ||
      !profile.name.en
   ) {
      errors.push('name은 ko와 en 속성은 객체');
   }
   if (typeof profile.age !== 'string') errors.push('age는 string');
   if (typeof profile.job !== 'string') errors.push('job은 string');
   if (!Array.isArray(profile.skill)) errors.push('skill은 배열');
   if (typeof profile.city !== 'string') errors.push('city는 string');
   if (typeof profile.isOnline !== 'boolean') errors.push('isOnline은 boolean');

   return errors;
}

/* ==============================
      COMPONENT
      ================================ */
function ProfileCard(profile) {
   const { name, job, age, image, city, description, quotes, skill } = profile;

   return `
         <div class="profile__header">
               <h3 class="profile__name">${name.ko}</h3>
               <p class="profile__name-en">${name.en}</p>
            </div>
            <div class="profile__avatar">
          <img
              src="/frontend-project/assets/images/main/about/profile.jpeg"
               onerror="this.onerror=null; this.src='./assets/images/main/about/profile.jpeg';"
               alt="${image.alt}"
               />
            </div>
            <div class="profile__des">
               ${description
                  .map(
                     (text, index) =>
                        `<p class="${index === 0 ? 'active' : ''}">${text}</p>`,
                  )
                  .join('')}
            </div>
            <div class="profile__body">
               <p class="profile__job">${job}</p>
               <p class="profile__age">${age}</p>
               <p class="profile__city">${city}</p>
            </div>
            <ul class="profile__skills">
               ${skill.map((item) => `<li>${item}</li>`).join('')}
            </ul>
            <div class="profile__quotes">
               ${quotes
                  .map(
                     (q, index) => `
                     <blockquote class="${index === 0 ? 'active' : ''}">
                        <p class="quote__en">${q.en}</p>
                        <p class="quote__ko">${q.ko}</p>
                        <cite>- ${q.author}</cite>
                     </blockquote>
                  `,
                  )
                  .join('')}
            </div>
            <div class="profile__resume">
               <button class="resume__btn">
                  📄 이력서 다운로드
               </button>
            </div>
         `;
}

/* ==============================
      RENDER
      ================================ */
function render() {
   const errors = validateProfile(state);

   if (errors.length > 0) {
      profileCardEl.innerHTML = '';
      console.error('Profile validation error:', errors);
      return;
   }

   profileCardEl.innerHTML = ProfileCard(state);
   initFadeInEffect();
}

/* ==============================
      FADE IN EFFECT
      ================================ */
function initFadeInEffect() {
   const descriptions = document.querySelectorAll('.profile__des p');
   const quotes = document.querySelectorAll('.profile__quotes blockquote');

   let descIndex = 0;
   let quoteIndex = 0;

   // 설명글 5초마다 교체
   setInterval(() => {
      descriptions[descIndex].classList.remove('active');
      descIndex = (descIndex + 1) % descriptions.length;
      descriptions[descIndex].classList.add('active');
   }, 5000);

   // 명언 5초마다 교체
   setInterval(() => {
      quotes[quoteIndex].classList.remove('active');
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quotes[quoteIndex].classList.add('active');
   }, 5000);
}

/* ==============================
      SCROLL ANIMATION
      ================================ */
const observerOptions = {
   threshold: 0.1,
   rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
   entries.forEach((entry) => {
      if (entry.isIntersecting) {
         entry.target.classList.add('visible');
      }
   });
}, observerOptions);

/* ======================================================================
 * DARK MODE FUNCTIONALITY
 * ====================================================================== */

const savedTheme = localStorage.getItem('theme');

/* ==============================
      INIT THEME
      ================================ */
function initTheme() {
   if (savedTheme) {
      html.setAttribute('data-theme', savedTheme);
   } else {
      const prefersDark = window.matchMedia(
         '(prefers-color-scheme: dark)',
      ).matches;
      if (prefersDark) {
         html.setAttribute('data-theme', 'dark');
      }
   }
}

/* ==============================
      TOGGLE THEME
      ================================ */
function toggleTheme() {
   const currentTheme = html.getAttribute('data-theme');

   if (currentTheme === 'dark') {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
   } else {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
   }

   // 버튼 클릭 피드백 애니메이션
   themeToggle.style.transform = 'scale(0.95)';
   setTimeout(() => {
      themeToggle.style.transform = 'scale(1)';
   }, 100);
}

/* ==============================
      EVENT LISTENERS
      ================================ */
// 다크모드 토글 버튼 클릭
themeToggle.addEventListener('click', toggleTheme);

// 키보드 접근성 (Enter/Space)
themeToggle.addEventListener('keydown', (e) => {
   if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
   }
});

// 시스템 테마 변경 감지
window
   .matchMedia('(prefers-color-scheme: dark)')
   .addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
         if (e.matches) {
            html.setAttribute('data-theme', 'dark');
         } else {
            html.removeAttribute('data-theme');
         }
      }
   });

/* ==============================
      INITIALIZATION
      ================================ */
document.addEventListener('DOMContentLoaded', () => {
   // 1. 테마 초기화
   initTheme();

   // 2. 프로필 카드 렌더링
   render();

   // 3. 스크롤 애니메이션 적용
   const journeyItems = document.querySelectorAll('.journey-item');
   journeyItems.forEach((item) => observer.observe(item));

   // 4. 페이지 로드 후 부드러운 전환 효과
   document.body.style.transition =
      'background-color 300ms ease, color 300ms ease';
});
