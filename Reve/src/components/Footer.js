/**
 * =============================================
 * 📍 위치: src/components/Footer.js
 * 역할: 쇼핑몰형 Footer UI + initFooter()
 * - Mobile-first Accordion
 * - Tablet/Desktop: 멀티 컬럼 펼침 레이아웃
 * - 모든 정보는 "허구(학습용)" 문구 포함
 * =============================================
 */

export const Footer = () => {
   return `
 <footer class="site-footer" data-footer>
   <div class="footer__wrap">
     <div class="footer__top">
       <!-- Brand -->
       <section class="footer__brand">
         <strong class="footer__logo" aria-label="REVE">REVE</strong>
         <p class="footer__tagline">
           가볍고 빠른 쇼핑 경험을 위해 설계된 MVP 스토어.
         </p>
 
         <div class="footer__badges" aria-label="Service badges">
           <span class="footer__badge">무료배송</span>
           <span class="footer__badge">당일출고</span>
           <span class="footer__badge">안전결제</span>
         </div>
 
         <div class="footer__cs">
           <p class="footer__csTitle">고객센터</p>
           <a class="footer__csTel" href="tel:010-0000-0000">010-0000-0000</a>
           <p class="footer__csTime">평일 10:00 - 18:00 (점심 12:30 - 13:30)</p>
           <div class="footer__csActions">
             <a class="footer__btn" href="/search?q=문의">1:1 문의</a>
             <a class="footer__btn ghost" href="/search?q=FAQ">FAQ</a>
           </div>
         </div>
       </section>
 
       <!-- Links (Accordion on Mobile) -->
       <section class="footer__links" aria-label="Footer links">
        ${accItem({
           id: 'footer-sec-1',
           title: '쇼핑 가이드',
           links: [
              { label: '배송 안내', href: '/search?q=배송' },
              { label: '교환/반품', href: '/search?q=교환' },
              { label: '주문/결제', href: '/search?q=결제' },
              { label: '사이즈 가이드', href: '/search?q=사이즈' },
              { label: '회원 혜택', href: '/search?q=회원혜택' },
              { label: '적립금/쿠폰', href: '/search?q=적립금' },
              { label: '상품 문의', href: '/search?q=상품문의' },
              { label: '상품 리뷰', href: '/search?q=리뷰' },
           ],
        })}

${accItem({
   id: 'footer-sec-2',
   title: '고객지원',
   links: [
      { label: '공지사항', href: '/search?q=공지' },
      { label: '자주 묻는 질문', href: '/search?q=FAQ' },
      { label: '1:1 문의', href: '/search?q=1:1문의' },
      { label: '주문 조회', href: '/search?q=주문조회' },
      { label: '배송 조회', href: '/search?q=배송조회' },
      { label: '반품 신청', href: '/search?q=반품신청' },
      { label: '교환 신청', href: '/search?q=교환신청' },
      { label: '취소/환불 안내', href: '/search?q=환불' },
   ],
})}

${accItem({
   id: 'footer-sec-3',
   title: '회사정보',
   links: [
      { label: '회사 소개', href: '/search?q=회사소개' },
      { label: '브랜드 스토리', href: '/search?q=브랜드' },
      { label: '채용', href: '/search?q=채용' },
      { label: '제휴 문의', href: '/search?q=제휴' },
      { label: '오시는 길', href: '/search?q=위치' },
      { label: '언론/보도', href: '/search?q=보도' },
      { label: '투자 정보', href: '/search?q=IR' },
      { label: '윤리경영', href: '/search?q=윤리경영' },
   ],
})}

${accItem({
   id: 'footer-sec-4',
   title: '정책',
   links: [
      { label: '이용약관', href: '/search?q=이용약관' },
      { label: '개인정보처리방침', href: '/search?q=개인정보' },
      { label: '쿠키 정책', href: '/search?q=쿠키' },
      { label: '청소년 보호정책', href: '/search?q=보호정책' },
      { label: '환불 정책', href: '/search?q=환불정책' },
      { label: '배송 정책', href: '/search?q=배송정책' },
      { label: '판매자 정책', href: '/search?q=판매자정책' },
      { label: '전자금융거래 약관', href: '/search?q=전자금융' },
   ],
})}
       </section>
 
       <!-- Business Info -->
       <section class="footer__biz" aria-label="Business information">
         <h3 class="footer__bizTitle">사업자 정보</h3>
 
         <dl class="footer__dl">
           <div class="footer__dlRow">
             <dt>상호</dt><dd>레브(REVE) 스토어</dd>
           </div>
           <div class="footer__dlRow">
             <dt>대표</dt><dd>홍길동</dd>
           </div>
           <div class="footer__dlRow">
             <dt>사업자등록번호</dt><dd>123-45-67890</dd>
           </div>
           <div class="footer__dlRow">
             <dt>통신판매업</dt><dd>2026-서울가상-0001</dd>
           </div>
           <div class="footer__dlRow">
             <dt>주소</dt><dd>서울특별시 가상구 리브로 88, 12층</dd>
           </div>
           <div class="footer__dlRow">
             <dt>개인정보책임자</dt><dd>김레브 (privacy@reve.example)</dd>
           </div>
           <div class="footer__dlRow">
             <dt>입금계좌</dt><dd>가상은행 110-123-456789 (레브스토어)</dd>
           </div>
         </dl>
 
         <p class="footer__bizNote">
           ※ 위 정보는 <strong>학습용 예시</strong>이며 실제 사업자 정보가 아닙니다.
         </p>
 
         <div class="footer__escrow" aria-label="Payment notice">
           <p class="footer__escrowTitle">안전결제 안내 </p>
           <p class="footer__escrowDesc">
             고객님의 결제정보는 암호화되어 안전하게 처리됩니다.
           </p>
         </div>
       </section>
     </div>
 
     <!-- Bottom -->
     <div class="footer__bottom" aria-label="Footer bottom">
       <p class="footer__copy">
         © <span data-footer-year></span> REVE. All rights reserved.
       </p>
 
       <div class="footer__bottomLinks" aria-label="Quick policies">
         <a href="/search?q=이용약관">이용약관</a>
         <a href="/search?q=개인정보">개인정보처리방침</a>
         <a href="/search?q=고객센터">고객센터</a>
       </div>
 
       <div class="footer__sns" aria-label="Social links">
         <a class="footer__snsLink" href="#" aria-label="Instagram">IG</a>
         <a class="footer__snsLink" href="#" aria-label="YouTube">YT</a>
         <a class="footer__snsLink" href="#" aria-label="GitHub">GH</a>
       </div>
     </div>
   </div>
 </footer>
 `;
};

export function initFooter() {
   const root = document.querySelector('[data-footer]');
   if (!root) return;

   if (root.dataset.bound === '1') return;
   root.dataset.bound = '1';

   const y = root.querySelector('[data-footer-year]');
   if (y) y.textContent = String(new Date().getFullYear());

   root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-footer-acc-btn]');
      if (!btn) return;

      // ✅ 데스크탑(768+)에서는 아코디언이 "항상 펼침"이므로 클릭 무시
      if (window.matchMedia('(min-width: 768px)').matches) return;

      const item = btn.closest('[data-footer-acc-item]');
      if (!item) return;

      const isOpen = item.classList.contains('is-open');

      root.querySelectorAll('[data-footer-acc-item].is-open').forEach((el) => {
         if (el !== item) {
            el.classList.remove('is-open');
            const b = el.querySelector('[data-footer-acc-btn]');
            if (b) b.setAttribute('aria-expanded', 'false');
         }
      });

      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
   });
}

/* ---------- helpers ---------- */

function accItem({ id, title, links }) {
   const items = (links || [])
      .map(
         (l) => `
 <li class="footer__accLi">
   <a class="footer__accLink" href="${l.href}">${escapeHtml(l.label)}</a>
 </li>`,
      )
      .join('');

   return `
 <section class="footer__accItem" data-footer-acc-item>
   <button
     type="button"
     class="footer__accBtn"
     data-footer-acc-btn
     aria-expanded="false"
     aria-controls="${id}"
   >
     <span class="footer__accTitle">${escapeHtml(title)}</span>
     <span class="footer__accIcon" aria-hidden="true"></span>
   </button>
 
   <div class="footer__accPanel" id="${id}">
     <div class="footer__accPanelInner">
       <ul class="footer__accList">${items}</ul>
     </div>
   </div>
 </section>
 `;
}

function escapeHtml(v) {
   return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
}
