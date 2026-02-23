/* 파일: src/app/(marketing)/page.tsx */

import styles from './page.module.css';
import Header from '@/components/marketing/header/Header';
import HeroSwiper from '@/components/marketing/hero/HeroSwiper';

export default function MarketingPage() {
  return (
    <main className={styles.main}>
      <Header />

      <HeroSwiper />

      <section className={styles.section} id="about">
        <h2 className={styles.h2}>서비스 소개</h2>
        <p className={styles.p}>
          NURI는 반려동물과의 기억을 ‘갤러리 · 타임라인 · 방명록’으로 남기는 디지털 메모리얼
          플랫폼입니다.
        </p>
      </section>

      <section className={styles.section} id="preview">
        <h2 className={styles.h2}>앱 미리보기</h2>
        <p className={styles.p}>다음 단계에서 탭 기반 미니앱(갤러리/타임라인/방명록)을 붙입니다.</p>
      </section>

      <section className={styles.section} id="pricing">
        <h2 className={styles.h2}>요금제</h2>
        <p className={styles.p}>Free / Plus / Memorial Pro 구조로 확장됩니다.</p>
      </section>

      <section className={styles.section} id="faq">
        <h2 className={styles.h2}>FAQ</h2>
        <p className={styles.p}>자주 묻는 질문 섹션을 여기에 구성합니다.</p>
      </section>

      <div id="start" />
    </main>
  );
}
