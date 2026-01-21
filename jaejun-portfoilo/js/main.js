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
      name: '신재준',
      image: {
         src: '/frontend-project/jaejun-portfoilo/assets/images/main/about/profile.jpeg',
         alt: '프론트엔드 개발자 신재준 프로필',
      },
      job: 'Front-end Developer',
      age: '1996 - 06 - 17',
      skill: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Git'],
      city: '경기도 고양시 일산서구',
      description: [
         '열심히 하겠습니다',
         '사용자 경험을 최우선으로 생각합니다',
         '꾸준한 학습과 성장을 추구합니다',
         '팀과의 협업을 중요하게 여깁니다',
         '깔끔하고 유지보수 가능한 코드를 작성합니다',
      ],
      quotes: [
         '일찍 일어나는 새가 벌레를 잡는다',
         '오늘 할 수 있는 일을 내일로 미루지 말자',
         '작은 실행이 큰 계획보다 낫다',
         '완벽함보다는 꾸준함이 중요하다',
         '함께 가면 더 멀리 갈 수 있다',
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

   if (typeof profile.name !== 'string') errors.push('name은 string');
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
            <h3 class="profile__name">${name}</h3>
         </div>
         <div class="profile__avatar">
            <img src="${image.src}" alt="${image.alt}" />
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
                  (q, index) =>
                     `<blockquote class="${index === 0 ? 'active' : ''}">${q}</blockquote>`,
               )
               .join('')}
         </div>
         <div class="profile__resume">
            <button class="resume__btn" onclick="downloadResume()">
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
      RESUME DOWNLOAD
      ================================ */
function downloadResume() {
   const resumeContent = `
   신재준 이력서
   ===================
   
   기본 정보
   ---------
   이름: ${state.name}
   직무: ${state.job}
   생년월일: ${state.age}
   위치: ${state.city}
   
   기술 스택
   ---------
   ${state.skill.join(', ')}
   
   소개
   ----
   ${state.description.join('\n')}
   
   좌우명
   ------
   ${state.quotes.join('\n')}
      `;

   const blob = new Blob([resumeContent], {
      type: 'text/plain;charset=utf-8',
   });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = '신재준_이력서.txt';
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
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
