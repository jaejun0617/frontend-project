/**
 * =============================================
 * 📍 위치: src/store/adminOrderStore.js
 * 역할: 관리자용 주문 제어 래퍼
 * - orderStore의 데이터를 읽고, 상태 변경을 "규칙 기반"으로 수행
 * - canTransitionOrderStatus로 전이 검증
 * - auditLog 기록
 * =============================================
 */

import { orderStore } from './orderStore.js';
import {
   canTransitionOrderStatus,
   normalizeOrderStatus,
   normalizeText,
} from '../utils/validate.js';
import { auditLog } from '../utils/auditLog.js';

function safeList() {
   const list = orderStore.getOrders?.() ?? [];
   return Array.isArray(list) ? list : [];
}

export const adminOrderStore = {
   /**
    * ✅ 전체 주문 조회(관리자 뷰)
    */
   list({ filterStatus = 'ALL', q = '' } = {}) {
      const key = normalizeText(q).toLowerCase();
      const statusKey = String(filterStatus || 'ALL').toUpperCase();

      let orders = safeList();

      if (statusKey !== 'ALL') {
         orders = orders.filter(
            (o) => normalizeOrderStatus(o?.status) === statusKey,
         );
      }

      if (key) {
         orders = orders.filter((o) => {
            const id = String(o?.orderId || '').toLowerCase();
            const userId = String(o?.userId || '').toLowerCase();
            const receiver = String(
               o?.shippingAddress?.receiver || '',
            ).toLowerCase();
            return (
               id.includes(key) ||
               userId.includes(key) ||
               receiver.includes(key)
            );
         });
      }

      return orders;
   },

   /**
    * ✅ 단일 주문 조회
    */
   get(orderId) {
      const id = normalizeText(orderId);
      if (!id) return null;
      return orderStore.getOrder?.(id) ?? null;
   },

   /**
    * ✅ 상태 변경 (규칙 검증 + 감사로그)
    * - note/tracking 정보는 orderStore 스키마에 없다면 payload에 메타로 저장해도 됨
    * - 여기서는 최소한 status 변경만 다룸
    */
   updateStatus(
      orderId,
      nextStatus,
      { actorId = 'admin', actorName = 'ADMIN', reason = '' } = {},
   ) {
      const id = normalizeText(orderId);
      if (!id) return { ok: false, message: 'orderId가 필요합니다.' };

      const order = this.get(id);
      if (!order) return { ok: false, message: '주문을 찾을 수 없습니다.' };

      const from = normalizeOrderStatus(order.status);
      const to = normalizeOrderStatus(nextStatus);

      const okMove = canTransitionOrderStatus(from, to);
      if (!okMove.ok) return okMove;

      const r = orderStore.updateOrderStatus?.(id, to);
      if (!r?.ok)
         return { ok: false, message: '주문 상태 변경에 실패했습니다.' };

      auditLog.append({
         actorId,
         actorName,
         action: 'ORDER_STATUS_UPDATE',
         targetType: 'ORDER',
         targetId: id,
         diff: { from, to, reason: String(reason || '').trim() },
      });

      return { ok: true };
   },
};
