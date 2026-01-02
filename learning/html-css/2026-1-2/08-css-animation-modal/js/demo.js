/*
  ============================================================
  목표(요청사항)
  1) "구매하기" 클릭 -> 모달 오픈 + 상품 정보(텍스트/이미지) 표시
  2) 이미지 클릭 -> 모달 오픈 + 상품 정보 표시
  3) 제목 클릭 -> 모달 오픈 + 상품 정보 표시
  4) "담기" 클릭 -> 토스트 표시 + 버튼 텍스트 "담김" 변경 + 잠시 후 원복
  ============================================================

  핵심 전략: 이벤트 위임(Event Delegation)
  - 상품이 100개여도 이벤트를 각각 붙이지 않음
  - 상위(ul)에 클릭 이벤트 1개만 붙임
  - 클릭된 대상이 "buy/cart/이미지/제목" 중 무엇인지 판별해서 처리
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

// 토스트 중복 실행 방지를 위한 타이머 id
let toastTimerId = null;

// 담기 버튼 텍스트 원복을 위한 타이머 id(연속 클릭 처리)
let cartBtnTimerId = null;

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
// - 모달에 상품 이미지를 보여주려면 카드의 img 정보를 가져와야 함
function readImageFromCard($card) {
   const $img = $card.querySelector('img');

   // 이미지가 없는 경우 대비(안전장치)
   if (!$img) {
      return { src: '', alt: '' };
   }

   return {
      src: $img.getAttribute('src') || '',
      alt: $img.getAttribute('alt') || '',
   };
}

/* =========================
   3) 모달 열기/닫기 + 내용 채우기
   ========================= */

// 모달을 열기 전에, 모달에 표시할 내용을 먼저 세팅하는게 보통 안정적
function fillModalWithProduct(product, image) {
   // 텍스트 교체
   $modalBrand.textContent = product.brand;
   $modalProductTitle.textContent = product.title;
   $modalPrice.textContent = formatKRW(product.price);

   // 이미지 교체
   // (src가 비어있으면 깨진 이미지 아이콘이 보일 수 있음)
   // → 실무에선 placeholder 처리도 하지만, 여기서는 단순히 값만 주입
   $modalImg.src = image.src;
   $modalImg.alt = image.alt || `${product.title} 이미지`;
}

// 모달 열기
function openModal() {
   lastFocus = document.activeElement; // 열기 전 포커스 저장
   document.body.classList.add('is-open'); // CSS 열린 상태로 전환
   $root.setAttribute('aria-hidden', 'false'); // 접근성: 스크린리더에 모달 공개
   $close.focus(); // 키보드 포커스를 모달 안으로 이동
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
   5) 담기 버튼 UX: "담기 -> 담김" + 비활성화 + 원복
   ========================= */

function setCartButtonAdded($btn) {
   // 버튼이 이미 "담김" 상태면 중복 처리하지 않음
   if ($btn.classList.contains('is-added')) return;

   // 원래 텍스트를 data-original-text에 저장해 둔다(나중에 원복할 때 필요)
   // dataset으로 임시 저장하는 패턴은 실무에서도 자주 쓴다
   $btn.dataset.originalText = $btn.textContent.trim();

   // 텍스트 변경
   $btn.textContent = '담김';

   // 시각적/기능적 비활성화
   $btn.classList.add('is-added');
   $btn.disabled = true;

   // 일정 시간 후 원복(원하면 "담김"을 계속 유지하게 해도 됨)
   // 요청이 "담겼다는 의미로"였으니 "잠시 후 원복"으로 구현
   if (cartBtnTimerId) clearTimeout(cartBtnTimerId);

   cartBtnTimerId = setTimeout(() => {
      $btn.textContent = $btn.dataset.originalText || '담기';
      $btn.classList.remove('is-added');
      $btn.disabled = false;
      cartBtnTimerId = null;
   }, 1500);
}

/* =========================
   6) 클릭 이벤트 1개로 전부 처리(이벤트 위임)
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
     A) 구매하기 버튼 클릭
     ------------------------- */
   const isBuyButton = $target.matches('button[data-action="buy"]');

   if (isBuyButton) {
      // 1) 모달 내용 채우기
      fillModalWithProduct(product, image);

      // 2) 모달 열기
      openModal();

      return;
   }

   /* -------------------------
     B) 담기 버튼 클릭
     ------------------------- */
   const isCartButton = $target.matches('button[data-action="cart"]');

   if (isCartButton) {
      // 1) 토스트 표시
      showToast(`"${product.title}"이(가) 담겼습니다.`);

      // 2) 버튼 텍스트 변경 + 비활성화 + 원복
      setCartButtonAdded($target);

      return;
   }

   /* -------------------------
     C) 이미지/제목 클릭(모달 오픈)
     -------------------------
     - figure/h3에 data-open="modal"을 붙여둔 상태
     - closest('[data-open="modal"]')가 있으면 "모달 오픈 대상" 클릭임
  */
   const isOpenArea = $target.closest('[data-open="modal"]');

   if (isOpenArea) {
      fillModalWithProduct(product, image);
      openModal();
      return;
   }
});

/* =========================
   7) 모달 닫기 이벤트들
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
