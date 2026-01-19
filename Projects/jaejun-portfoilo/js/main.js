// ===== DOM Elements =====
const darkModeToggle = document.getElementById('darkModeToggle');
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelectorAll('.nav__link');
const sections = document.querySelectorAll('.section');
const contactForm = document.getElementById('contactForm');

// ===== Dark Mode Toggle =====
const initDarkMode = () => {
   // localStorage에서 다크 모드 설정 불러오기
   const savedMode = localStorage.getItem('darkMode');

   if (savedMode === 'enabled') {
      document.body.classList.add('dark-mode');
      updateDarkModeIcon(true);
   }
};

const toggleDarkMode = () => {
   document.body.classList.toggle('dark-mode');
   const isDark = document.body.classList.contains('dark-mode');

   // localStorage에 저장
   localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
   updateDarkModeIcon(isDark);
};

const updateDarkModeIcon = (isDark) => {
   const icon = darkModeToggle.querySelector('.toggle__icon');
   icon.textContent = isDark ? '☀️' : '🌙';
};

// ===== Navigation Active State =====
const updateActiveNav = () => {
   let currentSection = '';

   sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const scrollPosition = window.scrollY + 200;

      if (
         scrollPosition >= sectionTop &&
         scrollPosition < sectionTop + sectionHeight
      ) {
         currentSection = section.getAttribute('id');
      }
   });

   navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
         link.classList.add('active');
      }
   });
};

// ===== Smooth Scroll =====
const smoothScroll = (e) => {
   const target = e.target;

   // 네비게이션 링크 또는 CTA 버튼 클릭 시
   if (
      target.classList.contains('nav__link') ||
      (target.classList.contains('btn') &&
         target.getAttribute('href')?.startsWith('#'))
   ) {
      e.preventDefault();
      const targetId = target.getAttribute('href');

      if (targetId === '#hero') {
         // Hero 섹션으로 이동 (최상단)
         window.scrollTo({
            top: 0,
            behavior: 'smooth',
         });
      } else {
         const targetSection = document.querySelector(targetId);

         if (targetSection) {
            const headerOffset = 70;
            const elementPosition = targetSection.getBoundingClientRect().top;
            const offsetPosition =
               elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
               top: offsetPosition,
               behavior: 'smooth',
            });
         }
      }
   }
};

// ===== Hamburger Menu =====
const toggleMobileMenu = () => {
   const nav = document.querySelector('.header__nav');

   nav.classList.toggle('active');
   hamburger.classList.toggle('active');
};

// ===== Form Validation =====
const validateEmail = (email) => {
   const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return regex.test(email);
};

const handleFormSubmit = (e) => {
   e.preventDefault();

   const nameInput = document.getElementById('name');
   const emailInput = document.getElementById('email');
   const messageInput = document.getElementById('message');

   const name = nameInput.value.trim();
   const email = emailInput.value.trim();
   const message = messageInput.value.trim();

   // 유효성 검사
   if (!name) {
      alert('이름을 입력해주세요.');
      nameInput.focus();
      return;
   }

   if (!email) {
      alert('이메일을 입력해주세요.');
      emailInput.focus();
      return;
   }

   if (!validateEmail(email)) {
      alert('올바른 이메일 형식이 아닙니다.');
      emailInput.focus();
      return;
   }

   if (!message) {
      alert('메시지를 입력해주세요.');
      messageInput.focus();
      return;
   }

   // 폼 제출 성공
   alert('메시지가 성공적으로 전송되었습니다!');
   contactForm.reset();
};

// ===== Scroll Animations =====
const observeElements = () => {
   const elements = document.querySelectorAll('.section__container');

   const observer = new IntersectionObserver(
      (entries) => {
         entries.forEach((entry) => {
            if (entry.isIntersecting) {
               entry.target.style.opacity = '1';
               entry.target.style.transform = 'translateY(0)';
            }
         });
      },
      {
         threshold: 0.1,
         rootMargin: '0px 0px -100px 0px',
      },
   );

   elements.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
   });
};

// ===== Skill Bar Animation =====
const animateSkillBars = () => {
   const skillBars = document.querySelectorAll('.skill__progress');

   const observer = new IntersectionObserver(
      (entries) => {
         entries.forEach((entry) => {
            if (entry.isIntersecting) {
               const width = entry.target.style.width;
               entry.target.style.width = '0';
               setTimeout(() => {
                  entry.target.style.width = width;
               }, 100);
               observer.unobserve(entry.target);
            }
         });
      },
      {
         threshold: 0.5,
      },
   );

   skillBars.forEach((bar) => observer.observe(bar));
};

// ===== Header Scroll Effect =====
const handleHeaderScroll = () => {
   const header = document.querySelector('.header');

   if (window.scrollY > 100) {
      header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
   } else {
      header.style.boxShadow = 'none';
   }
};

// ===== Mobile Menu Styles =====
const addMobileMenuStyles = () => {
   const style = document.createElement('style');
   style.textContent = `
    @media (max-width: 768px) {
      .header__nav {
        position: fixed;
        top: var(--header-height);
        right: -100%;
        width: 250px;
        height: calc(100vh - var(--header-height));
        background: var(--color-bg);
        border-left: 1px solid var(--color-border);
        transition: right 0.3s ease;
        z-index: 999;
        padding: 2rem;
        display: block;
      }
      
      .header__nav.active {
        right: 0;
      }
      
      .nav__list {
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .header__hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(8px, 8px);
      }
      
      .header__hamburger.active span:nth-child(2) {
        opacity: 0;
      }
      
      .header__hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -7px);
      }
    }
  `;
   document.head.appendChild(style);
};

// ===== Event Listeners =====
const initEventListeners = () => {
   // 다크 모드 토글
   if (darkModeToggle) {
      darkModeToggle.addEventListener('click', toggleDarkMode);
   }

   // 스무스 스크롤
   document.addEventListener('click', smoothScroll);

   // 스크롤 이벤트
   window.addEventListener('scroll', () => {
      updateActiveNav();
      handleHeaderScroll();
   });

   // 햄버거 메뉴
   if (hamburger) {
      hamburger.addEventListener('click', toggleMobileMenu);
   }

   // 모바일 메뉴 링크 클릭 시 메뉴 닫기
   navLinks.forEach((link) => {
      link.addEventListener('click', () => {
         const nav = document.querySelector('.header__nav');
         if (nav && nav.classList.contains('active')) {
            toggleMobileMenu();
         }
      });
   });

   // 폼 제출
   if (contactForm) {
      contactForm.addEventListener('submit', handleFormSubmit);
   }
};

// ===== Initialize =====
const init = () => {
   initDarkMode();
   addMobileMenuStyles();
   initEventListeners();
   observeElements();
   animateSkillBars();

   // 초기 네비게이션 상태 설정
   setTimeout(() => {
      updateActiveNav();
   }, 100);
};

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', init);
} else {
   init();
}
