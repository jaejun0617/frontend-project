/* 파일: src/components/marketing/header/Header.tsx */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import styles from './Header.module.css';

type Locale = 'ko' | 'en' | 'ja';
type Theme = 'light' | 'dark';

function detectLocaleFromHtmlLang(): Locale {
  if (typeof document === 'undefined') return 'ko';
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'ko';
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function readSavedTheme(): Theme | null {
  const v = window.localStorage.getItem('nuri-theme');
  return v === 'light' || v === 'dark' ? v : null;
}

function saveTheme(theme: Theme) {
  window.localStorage.setItem('nuri-theme', theme);
}

type MenuItem = { id: string; href: string; label: string };

function UserPlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 20a7 7 0 0 1 14 0v1H4v-1Zm17-9v2h-2v2h-2v-2h-2v-2h2V9h2v2h2Z"
      />
    </svg>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"
      />
    </svg>
  );
}

export default function Header() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isOpen, setIsOpen] = useState(false);
  const [isElevated, setIsElevated] = useState(false);

  useEffect(() => {
    setLocale(detectLocaleFromHtmlLang());
  }, []);

  useEffect(() => {
    const saved = readSavedTheme();
    const initial = saved ?? getSystemTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  // fixed header scroll effect
  useEffect(() => {
    const onScroll = () => setIsElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // 메뉴 열렸을 때 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const text = useMemo(() => {
    const map: Record<
      Locale,
      {
        brand: string;
        menu: { about: string; preview: string; pricing: string; faq: string };
        login: string;
        signup: string;
      }
    > = {
      ko: {
        brand: 'NURI',
        menu: { about: '서비스 소개', preview: '앱 미리보기', pricing: '요금제', faq: 'FAQ' },
        login: '로그인',
        signup: '회원가입',
      },
      en: {
        brand: 'NURI',
        menu: { about: 'About', preview: 'App Preview', pricing: 'Pricing', faq: 'FAQ' },
        login: 'Log in',
        signup: 'Sign up',
      },
      ja: {
        brand: 'NURI',
        menu: { about: 'サービス紹介', preview: 'アプリ体験', pricing: '料金', faq: 'FAQ' },
        login: 'ログイン',
        signup: '新規登録',
      },
    };
    return map[locale] ?? map.ko;
  }, [locale]);

  const menuItems: MenuItem[] = useMemo(
    () => [
      { id: 'about', href: '#about', label: text.menu.about },
      { id: 'preview', href: '#preview', label: text.menu.preview },
      { id: 'pricing', href: '#pricing', label: text.menu.pricing },
      { id: 'faq', href: '#faq', label: text.menu.faq },
    ],
    [text.menu],
  );

  const onNavClick = (href: string) => {
    // ✅ 메뉴 클릭 시 닫기
    setIsOpen(false);

    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = href;
  };

  const themeEmoji = theme === 'dark' ? '🌙' : '☀️';
  const themeLabel = theme === 'dark' ? 'Dark' : 'Light';

  return (
    <>
      <header className={`${styles.header} ${isElevated ? styles.elevated : ''}`}>
        <div className={styles.inner}>
          {/* 로고 */}
          <Link className={styles.logo} href="/" aria-label="Go to home">
            <Image
              src="/marketing/header/logo.png"
              alt="NURI Logo"
              width={32}
              height={32}
              priority
              className={styles.logoImage}
            />
            <span className={styles.logoText}>{text.brand}</span>
          </Link>

          {/* Desktop nav */}
          <nav className={styles.nav} aria-label="Primary navigation">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.navLink}
                onClick={() => onNavClick(item.href)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.actions}>
            {/* Theme */}
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={`Toggle theme (${themeLabel})`}
              title={`Toggle theme (${themeLabel})`}
            >
              <span className={styles.knob} aria-hidden="true">
                {themeEmoji}
              </span>
            </button>

            {/* Desktop auth */}
            <Link className={styles.login} href="/login">
              {text.login}
            </Link>

            <Link className={styles.signup} href="/signup" aria-label={text.signup}>
              <UserPlusIcon className={styles.signupIcon} />
              <span className={styles.signupText}>{text.signup}</span>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              onClick={() => setIsOpen((v) => !v)}
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* ✅ Backdrop (모바일) */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* ✅ Drawer (모바일) */}
      <aside
        id="mobile-menu"
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        aria-hidden={!isOpen}
      >
        <div className={styles.drawerTop}>
          <div className={styles.drawerBrand}>
            <Image src="/marketing/header/logo.png" alt="NURI Logo" width={28} height={28} />
            <span className={styles.drawerTitle}>{text.brand}</span>
          </div>
        </div>

        <div className={styles.drawerNav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.drawerLink}
              onClick={() => onNavClick(item.href)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.drawerActions}>
          <button type="button" className={styles.drawerThemeToggle} onClick={toggleTheme}>
            <span className={styles.drawerEmoji} aria-hidden="true">
              {themeEmoji}
            </span>
            <span>Theme: {themeLabel}</span>
          </button>

          <Link className={styles.drawerLogin} href="/login" onClick={() => setIsOpen(false)}>
            {text.login}
          </Link>

          <Link className={styles.drawerSignup} href="/signup" onClick={() => setIsOpen(false)}>
            <UserPlusIcon />
            <span>{text.signup}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
