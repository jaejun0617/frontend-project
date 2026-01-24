const STORES = [
   { area: 'ilsan', name: '일산탄현동점', meta: '일산서구 · 탄현' },
   { area: 'ilsan', name: '일산탄현제니스점', meta: '일산서구 · 탄현' },
   { area: 'ilsan', name: '문촌사거리점', meta: '일산서구 · 주엽' },
   { area: 'ilsan', name: '일산동구청점', meta: '일산동구' },
   { area: 'ilsan', name: '일산식사점', meta: '일산동구 · 식사' },
   { area: 'ilsan', name: '일산하늘마을점', meta: '일산동구 · 중산' },
   { area: 'ilsan', name: '일산주엽점', meta: '일산서구 · 주엽' },

   // 전체(예시)
   { area: 'all', name: '서울역점(예시)', meta: '서울' },
   { area: 'all', name: '판교역점(예시)', meta: '성남' },
];

const areaSelect = document.getElementById('store-area');
const branchSelect = document.getElementById('store-branch');
const listEl = document.getElementById('store-list');

function getStoresByArea(area) {
   if (area === 'all') return STORES;
   return STORES.filter((s) => s.area === area);
}

function renderBranchOptions(stores) {
   branchSelect.innerHTML = '';
   const optAll = document.createElement('option');
   optAll.value = '__all__';
   optAll.textContent = '전체 보기';
   branchSelect.appendChild(optAll);

   stores.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      branchSelect.appendChild(opt);
   });

   branchSelect.value = '__all__';
}

function renderList(stores, pickedName) {
   const filtered =
      pickedName && pickedName !== '__all__'
         ? stores.filter((s) => s.name === pickedName)
         : stores;

   listEl.innerHTML = '';

   filtered.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="store__store-name">${s.name}</span>
        <span class="store__store-meta">${s.meta}</span>
      `;
      listEl.appendChild(li);
   });

   if (filtered.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="store__store-name">매장이 없습니다</span>
        <span class="store__store-meta">다른 옵션을 선택해 주세요</span>
      `;
      listEl.appendChild(li);
   }
}

function init() {
   const area = areaSelect.value;
   const stores = getStoresByArea(area);
   renderBranchOptions(stores);
   renderList(stores, '__all__');
}

areaSelect.addEventListener('change', () => {
   const stores = getStoresByArea(areaSelect.value);
   renderBranchOptions(stores);
   renderList(stores, '__all__');
});

branchSelect.addEventListener('change', () => {
   const stores = getStoresByArea(areaSelect.value);
   renderList(stores, branchSelect.value);
});

init();
