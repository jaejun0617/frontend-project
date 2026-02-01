/**
 * =============================================
 * 📍 위치: src/api/products.js
 * 역할: 상품 데이터를 가져오는 "데이터 레이어"
 *
 * ✅ 지금 단계(MVP)
 * - API/DB가 아직 없으니 목업 데이터(mock)를 반환
 *
 * 🔜 나중에
 * - Firebase/서버 API로 교체해도
 *   페이지(Product/Search) 코드는 그대로 두고 여기만 바꾸면 됨
 * =============================================
 */

// (MVP) 목업 상품 데이터
const MOCK_PRODUCTS = [
   {
      id: 'p-001',
      name: 'Éclat Leather Bag',
      price: 1490000,
      tags: ['leather', 'bag', 'black', '에끌라', '가방'],
      category: 'bag',
      image: '',
   },
   {
      id: 'p-002',
      name: 'Minimal Wallet',
      price: 590000,
      tags: ['wallet', 'minimal', 'black', '지갑'],
      category: 'wallet',
      image: '',
   },
   {
      id: 'p-003',
      name: 'Classic Watch',
      price: 3290000,
      tags: ['watch', 'classic', 'silver', '시계'],
      category: 'watch',
      image: '',
   },
   {
      id: 'p-004',
      name: 'New Season Sneakers',
      price: 890000,
      tags: ['sneakers', 'new', 'street', '신발'],
      category: 'shoes',
      image: '',
   },
   {
      id: 'p-005',
      name: 'Silk Scarf',
      price: 360000,
      tags: ['scarf', 'silk', 'pattern', '스카프'],
      category: 'accessory',
      image: '',
   },
   {
      id: 'p-006',
      name: 'Signature Belt',
      price: 520000,
      tags: ['belt', 'leather', 'signature', '벨트'],
      category: 'accessory',
      image: '',
   },
   {
      id: 'p-007',
      name: 'Cashmere Coat',
      price: 4990000,
      tags: ['coat', 'cashmere', 'winter', '코트'],
      category: 'outer',
      image: '',
   },
   {
      id: 'p-008',
      name: 'Monochrome Sunglasses',
      price: 410000,
      tags: ['sunglasses', 'mono', 'summer', '선글라스'],
      category: 'accessory',
      image: '',
   },
   {
      id: 'p-009',
      name: 'Iconic Bracelet',
      price: 770000,
      tags: ['bracelet', 'jewelry', 'gold', '팔찌'],
      category: 'jewelry',
      image: '',
   },
   {
      id: 'p-010',
      name: 'Tailored Jacket',
      price: 1890000,
      tags: ['jacket', 'tailored', 'formal', '자켓'],
      category: 'top',
      image: '',
   },
   {
      id: 'p-011',
      name: 'Everyday Tote',
      price: 1290000,
      tags: ['tote', 'bag', 'daily', '토트'],
      category: 'bag',
      image: '',
   },
   {
      id: 'p-012',
      name: 'Soft Knit',
      price: 690000,
      tags: ['knit', 'soft', 'winter', '니트'],
      category: 'top',
      image: '',
   },
];

/**
 * 상품 목록 조회
 * - 실제 API라면 fetch를 여기서 하게 됨
 */
export async function getProducts() {
   // 로딩 상태 연습용: 약간의 딜레이를 줌(원치 않으면 제거해도 됨)
   await new Promise((r) => setTimeout(r, 250));
   return MOCK_PRODUCTS;
}
