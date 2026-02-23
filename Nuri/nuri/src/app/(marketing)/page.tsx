import styles from './page.module.css';

export default function Home() {
   return (
      <div className={styles.page}>
         <main className={styles.main}>
            <section className={styles.hero}>
               <h1 className={styles.title}>🌈 NURI</h1>
               <p className={styles.subtitle}>
                  반려동물을 사랑한 보호자를 위한 디지털 기억 플랫폼.
                  <br />
                  기억을 구조화하고 감정을 정리하며, 아이와의 시간을 계속
                  이어갑니다.
               </p>

               <div className={styles.ctaRow}>
                  <a className={styles.primaryBtn} href="/signup">
                     시작하기
                  </a>
                  <a className={styles.secondaryBtn} href="/pricing">
                     요금제 보기
                  </a>
               </div>
            </section>
         </main>
      </div>
   );
}
