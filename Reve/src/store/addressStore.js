/**
 * =============================================
 * 📍 위치: src/store/addressStore.js
 * 역할: 배송지 저장소(localStorage) - 유저별 분리
 *
 * ✅ 기능
 * - setOwner(ownerKey): 유저별 저장소 스위칭
 * - getAddresses(): 최신순
 * - createAddress(payload)
 * - updateAddress(id, patch)
 * - deleteAddress(id)
 * - setDefault(id): 기본 배송지 1개 강제
 * =============================================
 */

const STORAGE_PREFIX = 'reve_addresses_v1:';
let ownerKey = 'guest';

function storageKey() {
   return `${STORAGE_PREFIX}${ownerKey}`;
}

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readState() {
   const raw = localStorage.getItem(storageKey());
   const parsed = raw ? safeParse(raw) : null;

   return {
      addresses: Array.isArray(parsed?.addresses) ? parsed.addresses : [],
   };
}

function writeState(next) {
   localStorage.setItem(storageKey(), JSON.stringify(next));
}

let state = readState();
/** @type {Set<(state:any)=>void>} */
const listeners = new Set();

function notify() {
   writeState(state);
   listeners.forEach((fn) => fn(state));
}

/* ------------------------------
   Normalizers
------------------------------ */

function normalizePhone(v) {
   // 숫자/하이픈 허용, 공백 제거
   return String(v ?? '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^\d-]/g, '');
}

function trimText(v) {
   return String(v ?? '').trim();
}

function normalizePayload(payload) {
   const p = payload && typeof payload === 'object' ? payload : null;
   if (!p) return null;

   const receiver = trimText(p.receiver);
   const phone = normalizePhone(p.phone);
   const zip = trimText(p.zip);
   const address1 = trimText(p.address1);
   const address2 = trimText(p.address2);

   // label은 optional
   const label = trimText(p.label);

   if (!receiver)
      return { ok: false, message: '받는 분 이름을 입력해 주세요.' };
   if (!phone) return { ok: false, message: '휴대폰 번호를 입력해 주세요.' };
   if (!zip) return { ok: false, message: '우편번호를 입력해 주세요.' };
   if (!address1) return { ok: false, message: '기본 주소를 입력해 주세요.' };

   return {
      ok: true,
      data: {
         label: label || '',
         receiver,
         phone,
         zip,
         address1,
         address2: address2 || '',
         // isDefault는 create/update에서 결정
      },
   };
}

function ensureSingleDefault(list) {
   // default가 2개 이상이면 첫 번째만 유지
   let seen = false;
   return list.map((a) => {
      if (!a.isDefault) return a;
      if (!seen) {
         seen = true;
         return a;
      }
      return { ...a, isDefault: false };
   });
}

function sortLatest(list) {
   return [...list].sort(
      (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0),
   );
}

/* ------------------------------
   Store API
------------------------------ */

export const addressStore = {
   setOwner(nextOwner) {
      ownerKey = String(nextOwner || 'guest');
      state = readState();
      notify();
   },

   subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
   },

   getState() {
      return state;
   },

   getAddresses() {
      const list = Array.isArray(state.addresses) ? state.addresses : [];
      // 기본 배송지가 위로 오도록 1차 정렬 + 최신순 2차
      return [...list].sort((a, b) => {
         const ad = a.isDefault ? 1 : 0;
         const bd = b.isDefault ? 1 : 0;
         if (ad !== bd) return bd - ad;
         return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
      });
   },

   getAddress(id) {
      const key = trimText(id);
      if (!key) return null;
      return state.addresses.find((a) => a.id === key) || null;
   },

   createAddress(payload) {
      const norm = normalizePayload(payload);
      if (!norm?.ok) return norm;

      const now = Date.now();
      const id = `addr_${now}`;

      const isFirst = state.addresses.length === 0;
      const wantsDefault = Boolean(payload?.isDefault);

      const next = {
         id,
         ...norm.data,
         isDefault: isFirst ? true : wantsDefault,
         createdAt: now,
         updatedAt: now,
      };

      let nextList = [next, ...state.addresses];

      // 기본 배송지 1개 강제
      if (next.isDefault) {
         nextList = nextList.map((a) =>
            a.id === id ? a : { ...a, isDefault: false },
         );
      } else {
         nextList = ensureSingleDefault(nextList);
      }

      state = { ...state, addresses: nextList };
      notify();
      return { ok: true, id };
   },

   updateAddress(id, patch) {
      const key = trimText(id);
      if (!key) return { ok: false, message: 'address id가 필요해요.' };

      const base = state.addresses.find((a) => a.id === key);
      if (!base) return { ok: false, message: '배송지를 찾을 수 없어요.' };

      const merged = {
         ...base,
         ...(patch && typeof patch === 'object' ? patch : {}),
      };
      const norm = normalizePayload(merged);
      if (!norm?.ok) return norm;

      const now = Date.now();
      const wantsDefault = Boolean(merged.isDefault);

      let nextList = state.addresses.map((a) => {
         if (a.id !== key) return a;
         return {
            ...a,
            ...norm.data,
            isDefault: wantsDefault ? true : Boolean(a.isDefault),
            updatedAt: now,
         };
      });

      // 기본 배송지 1개 강제
      if (wantsDefault) {
         nextList = nextList.map((a) =>
            a.id === key ? a : { ...a, isDefault: false },
         );
      } else {
         nextList = ensureSingleDefault(nextList);
      }

      state = { ...state, addresses: nextList };
      notify();
      return { ok: true };
   },

   deleteAddress(id) {
      const key = trimText(id);
      if (!key) return { ok: false, message: 'address id가 필요해요.' };

      const target = state.addresses.find((a) => a.id === key);
      if (!target) return { ok: false, message: '배송지를 찾을 수 없어요.' };

      const nextList = state.addresses.filter((a) => a.id !== key);

      // 삭제로 default가 사라졌다면: 남은 것 중 첫 번째를 default로 승격
      if (target.isDefault && nextList.length > 0) {
         nextList[0] = {
            ...nextList[0],
            isDefault: true,
            updatedAt: Date.now(),
         };
      }

      state = { ...state, addresses: nextList };
      notify();
      return { ok: true };
   },

   setDefault(id) {
      const key = trimText(id);
      if (!key) return { ok: false, message: 'address id가 필요해요.' };

      if (!state.addresses.some((a) => a.id === key)) {
         return { ok: false, message: '배송지를 찾을 수 없어요.' };
      }

      const now = Date.now();
      const nextList = state.addresses.map((a) => {
         if (a.id === key) return { ...a, isDefault: true, updatedAt: now };
         if (a.isDefault)
            return { ...a, isDefault: false, updatedAt: a.updatedAt };
         return a;
      });

      state = { ...state, addresses: nextList };
      notify();
      return { ok: true };
   },
};
