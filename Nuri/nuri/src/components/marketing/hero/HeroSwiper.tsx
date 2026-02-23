/* 파일: src/components/marketing/hero/HeroSwiper.tsx */

'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './HeroSwiper.module.css';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, A11y } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';

type Locale = 'ko' | 'en' | 'ja';

type SlideCopy = {
  id: number;
  imageSrc: string;
  ko: string;
  en: string;
  ja: string;
};

function detectLocaleFromHtmlLang(): Locale {
  if (typeof document === 'undefined') return 'ko';
  const lang = (document.documentElement.lang || 'ko').toLowerCase();

  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'ko';
}

export default function HeroSwiper() {
  const [locale, setLocale] = useState<Locale>('ko');

  useEffect(() => {
    setLocale(detectLocaleFromHtmlLang());
  }, []);

  const slides = useMemo<SlideCopy[]>(
    () => [
      {
        id: 1,
        imageSrc: '/marketing/hero/01.png',
        ko: '오늘도 네 곁에 머물고 있어. 네가 힘들지 않기를, 조용히 바라보고 있어.',
        en: 'I am still by your side today. Quietly wishing you don’t feel alone.',
        ja: '今日もあなたのそばにいるよ。ひとりで苦しまないように、そっと見守ってる。',
      },
      {
        id: 2,
        imageSrc: '/marketing/hero/02.png',
        ko: '나를 위해 많이 애써줬지. 그 시간들, 나는 잊지 않을게.',
        en: 'You did so much for me. I will never forget those days we shared.',
        ja: 'たくさん頑張ってくれたね。一緒に過ごした時間、忘れないよ。',
      },
      {
        id: 3,
        imageSrc: '/marketing/hero/03.png',
        ko: '가끔 나를 떠올려 줘. 그 순간만으로도 나는 다시 네 곁에 서 있을 수 있어.',
        en: 'Think of me sometimes. In that moment, I can stand beside you again.',
        ja: 'たまに思い出してね。その瞬間だけで、またあなたの隣に立てるから。',
      },
    ],
    [],
  );

  const uiText = useMemo(() => {
    const map: Record<Locale, { badge: string; title: string; cta1: string; cta2: string }> = {
      ko: {
        badge: '기억은 사라지지 않습니다',
        title: 'NURI — 소중한 존재와의 기억을 지키는 공간',
        cta1: '기억 기록 시작하기',
        cta2: '서비스 소개 보기',
      },
      en: {
        badge: 'Memories don’t disappear',
        title: 'NURI — A place to preserve the memories of someone precious',
        cta1: 'Start recording',
        cta2: 'Learn more',
      },
      ja: {
        badge: '思い出は消えない',
        title: 'NURI — 大切な存在との記憶を守る場所',
        cta1: '記録をはじめる',
        cta2: 'もっと見る',
      },
    };

    return map[locale] ?? map.ko;
  }, [locale]);

  const getMessage = (s: SlideCopy) => {
    if (locale === 'en') return s.en;
    if (locale === 'ja') return s.ja;
    return s.ko;
  };

  return (
    <section className={styles.hero} aria-label="NURI Hero">
      <Swiper
        className={styles.swiper}
        modules={[Autoplay, EffectFade, A11y]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={900}
        autoplay={{
          delay: 7000,
          disableOnInteraction: false,
        }}
        // ✅ 모바일 터치/스와이프
        allowTouchMove
        touchStartPreventDefault={false}
        resistanceRatio={0.65}
        a11y={{ enabled: true }}
      >
        {slides.map((s) => (
          <SwiperSlide key={s.id}>
            <div className={styles.slide}>
              <img className={styles.image} src={s.imageSrc} alt={`NURI Hero Slide ${s.id}`} />
              <div className={styles.overlay} />

              <div className={styles.content}>
                <div className={styles.badge}>{uiText.badge}</div>
                <h1 className={styles.title}>{uiText.title}</h1>

                <p className={styles.message} aria-label="Message from your dog">
                  “{getMessage(s)}”
                </p>

                <div className={styles.ctaRow}>
                  <a className={`${styles.btn} ${styles.btnPrimary}`} href="#start">
                    {uiText.cta1}
                  </a>
                  <a className={`${styles.btn} ${styles.btnGhost}`} href="#about">
                    {uiText.cta2}
                  </a>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
