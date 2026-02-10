/**
 * statusHistory(객체)를 타임라인 배열로 변환
 * { PAID: ms, SHIPPING: ms|null, DELIVERED: ms|null, CANCELED: ms|null }
 * -> [{status:'PAID', at: ms}, ...]
 */
export function toStatusTimeline(statusHistory) {
   const h =
      statusHistory && typeof statusHistory === 'object' ? statusHistory : {};

   const steps = ['PAID', 'SHIPPING', 'DELIVERED', 'CANCELED'];

   return steps
      .map((status) => ({ status, at: h[status] ?? null }))
      .filter((x) => Boolean(x.at));
}

export function statusKo(status) {
   const s = String(status || '').toUpperCase();
   if (s === 'PAID') return '결제완료';
   if (s === 'SHIPPING') return '배송중';
   if (s === 'DELIVERED') return '배송완료';
   if (s === 'CANCELED') return '취소';
   return s;
}
