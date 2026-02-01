/**
 * =============================================
 * 📍 위치: src/utils/format.js
 * 역할: 포맷 유틸 모음 (가격/숫자 등 UI 표시용 변환)
 * 사용처: 컴포넌트/페이지에서 import 해서 데이터 표시 형식을 통일
 * =============================================
 */

/**
 * 가격(원화) 포맷
 * @param {number} value
 * @returns {string} 예: 1290000 -> "1,290,000"
 */
export function formatPrice(value) {
   const num = Number(value || 0);
   return new Intl.NumberFormat('ko-KR').format(num);
}
