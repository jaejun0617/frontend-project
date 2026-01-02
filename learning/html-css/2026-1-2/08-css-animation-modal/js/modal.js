/*
  ============================================================
  목표
  1) "구매하기" 클릭 -> 모달 오픈 + 상품 정보(텍스트/이미지) 표시
  2) 이미지 클릭 -> 모달 오픈 + 상품 정보 표시
  3) 제목 클릭 -> 모달 오픈 + 상품 정보 표시
  4) 딤 클릭 / 닫기 버튼 / ESC -> 모달 닫기
  ============================================================

  핵심 전략: 이벤트 위임(Event Delegation)
  - 상품이 많아져도 이벤트를 버튼마다 달지 않음
  - 상위(ul)에 클릭 이벤트 1개만 붙임
  - 클릭된 대상이 "buy/이미지/제목" 중 무엇인지 판별해서 처리
*/

/* =========================
   1) DOM 요소 가져오기
   ========================= */

// 상품 리스트(여기에 클릭 이벤트 1개만 걸 것)
const $productsList = document.getElementById('productsList');

// 모달 관련 요소들
const $root = document.getElementById('modalRoot');
const $backdrop = document.getElementById('backdrop');
const $panel = document.getElementById('panel');
const $close = document.getElementById('closeBtn');
const $confirm = document.getElementById('confirmBtn');

// 모달 내부 텍스트/이미지 타겟(여기에 클릭한 상품 정보를 꽂을 것)
const $modalBrand = document.getElementById('modalBrand');
const $modalProductTitle = document.getElementById('modalProductTitle');
const $modalPrice = document.getElementById('modalPrice');
const $modalImg = document.getElementById('modalImg'); // 모달 이미지

// 모달 닫을 때 포커스를 원래 위치로 돌려주기 위한 변수
let lastFocus = null;

/* =========================
   2) 유틸(도구) 함수들
   ========================= */

// (A) 가격을 "11,000원" 형태로 보기 좋게 만들기
function formatKRW(numberString) {
   const n = Number(numberString);
   return n.toLocaleString('ko-KR') + '원';
}

// (B) 카드(article.product__card)에서 data-*를 읽어서 상품 정보를 객체로 만들기
function readProductDataFromCard($card) {
   return {
      id: $card.dataset.productId, // data-product-id="1" -> dataset.productId
      title: $card.dataset.title, // data-title="상품 1" -> dataset.title
      price: $card.dataset.price, // data-price="11000" -> dataset.price
      brand: $card.dataset.brand, // data-brand="브랜드 A" -> dataset.brand
   };
}

// (C) 카드 안의 이미지(img) src/alt를 읽기
function readImageFromCard($card) {
   const $img = $card.querySelector('img');

   // 이미지가 없는 경우 대비(안전장치)
   if (!$img) return { src: '', alt: '' };

   return {
      src: $img.getAttribute('src') || '',
      alt: $img.getAttribute('alt') || '',
   };
}

/* =========================
   3) 모달 열기/닫기 + 내용 채우기
   ========================= */

// 모달을 열기 전에, 모달에 표시할 내용을 먼저 세팅
function fillModalWithProduct(product, image) {
   // 텍스트 교체
   $modalBrand.textContent = product.brand;
   $modalProductTitle.textContent = product.title;
   $modalPrice.textContent = formatKRW(product.price);

   // 이미지 교체
   $modalImg.src = image.src;
   $modalImg.alt = image.alt || `${product.title} 이미지`;
}

// 모달 열기
function openModal() {
   lastFocus = document.activeElement; // 열기 전 포커스 저장
   document.body.classList.add('is-open'); // CSS 열린 상태로 전환
   $root.setAttribute('aria-hidden', 'false'); // 접근성: 모달 활성화
   $close.focus(); // 포커스를 모달 내부로 이동
}

// 모달 닫기
function closeModal() {
   document.body.classList.remove('is-open');
   $root.setAttribute('aria-hidden', 'true');

   // 닫힌 후 포커스 복귀(접근성)
   if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
   }
}

/* =========================
   4) 클릭 이벤트 1개로 처리(이벤트 위임)
   ========================= */

$productsList.addEventListener('click', (e) => {
   const $target = e.target;

   // 클릭된 요소가 속해있는 카드(article.product__card)를 찾는다
   const $card = $target.closest('.product__card');

   // 카드 바깥을 클릭했으면 무시
   if (!$card) return;

   // 카드의 data-*로 상품 정보 읽기
   const product = readProductDataFromCard($card);

   // 카드의 이미지 정보 읽기
   const image = readImageFromCard($card);

   /* -------------------------
     A) 구매하기 버튼 클릭 -> 모달 오픈
     ------------------------- */
   const isBuyButton = $target.matches('button[data-action="buy"]');

   if (isBuyButton) {
      fillModalWithProduct(product, image);
      openModal();
      return;
   }

   /* -------------------------
     B) 이미지/제목 클릭 -> 모달 오픈
     -------------------------
     - figure/h3에 data-open="modal"을 붙여둔 상태
     - closest('[data-open="modal"]')가 있으면 모달 오픈 대상으로 판단
  */
   const isOpenArea = $target.closest('[data-open="modal"]');

   if (isOpenArea) {
      fillModalWithProduct(product, image);
      openModal();
      return;
   }
});

/* =========================
   5) 모달 닫기 이벤트들
   ========================= */

// 닫기/확인 버튼 클릭 -> 닫기
$close.addEventListener('click', closeModal);
$confirm.addEventListener('click', closeModal);

// 딤 클릭 -> 닫기
$backdrop.addEventListener('click', closeModal);

// 패널 내부 클릭은 딤으로 전파되지 않게 막기
$panel.addEventListener('click', (e) => e.stopPropagation());

// ESC로 닫기
window.addEventListener('keydown', (e) => {
   const isOpen = document.body.classList.contains('is-open');
   if (e.key === 'Escape' && isOpen) closeModal();
});
