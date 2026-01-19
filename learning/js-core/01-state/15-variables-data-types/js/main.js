// ===============================
// [DOM 참조: UI의 고정 앵커]
// ===============================
// 이 영역의 역할:
// - render()에서만 DOM을 수정하기 위한 사전 준비
// - 전역에서 한 번만 잡고, 이후에는 참조만 사용한다
// - "DOM 직접 조작 분산"을 막기 위한 구조

const app = document.querySelector('#app');
const errorBox = document.querySelector('#error');

// ===============================
// [고정 데이터: 데이터 소스]
// ===============================
// profiles는 "앱이 참고하는 원본 데이터"
// - 앱 동작 중 변경되지 않는다
// - 상태(state)와 명확히 구분하기 위해 const 사용
// - 여러 케이스를 섞어 검증/렌더 테스트 목적

const profiles = [
   {
      name: '재준',
      job: 'Fronted',
      age: 30,
      skill: ['HTML', 'CSS', 'JavaScript'],
      city: '일산',
      isOnline: true,
   },
   {
      name: '철수',
      job: 'UI Engineer',
      age: 25,
      skill: [], // 빈 배열 케이스 (UI 처리 확인용)
      city: '인천',
      isOnline: false,
   },
   {
      name: '유리',
      job: 'Publisher',
      age: 28,
      skill: ['HTML', 'CSS'],
      city: '강남',
      isOnline: true,
   },
   {
      name: '짱구',
      job: '', // 빈 문자열 케이스
      age: 27,
      skill: [],
      city: '의정부',
      isOnline: true,
   },
];

// ===============================
// [상태(state)]
// ===============================
// state는 "현재 화면에 그릴 데이터"
// - 이벤트에 의해 교체된다
// - render()는 항상 이 state만 기준으로 UI를 계산한다
// - 그래서 let 사용

let state = profiles[0];

// ===============================
// [유틸: 데이터 선택 로직]
// ===============================
// 이 함수의 책임:
// - 어떤 프로필을 쓸지 "선택"만 한다
// - DOM / state / UI에는 관여하지 않는다

function pickRandomProfile() {
   const idx = Math.floor(Math.random() * profiles.length);
   return profiles[idx];
}

// ===============================
// [검증: 렌더링 전 데이터 안전성 체크]
// ===============================
// validateProfile의 책임:
// - UI를 그려도 되는 데이터인지 판단
// - "표현"은 하지 않고, 문제 목록만 반환
// - render()가 이 결과를 해석한다

function validateProfile(profile) {
   const errors = [];

   if (typeof profile.name !== 'string') errors.push('name은 string');
   if (typeof profile.age !== 'number') errors.push('age는 number');
   if (typeof profile.job !== 'string') errors.push('job은 string');
   if (!Array.isArray(profile.skill)) errors.push('skill은 배열');
   if (typeof profile.city !== 'string') errors.push('city는 string');
   if (typeof profile.isOnline !== 'boolean') errors.push('isOnline은 boolean');

   return errors;
}

// ===============================
// [UI 생성: 순수 표현 함수]
// ===============================
// renderProfile의 책임:
// - 전달받은 profile을 "HTML 구조"로 변환
// - 검증 / 상태 변경 / DOM 접근 금지
// - 같은 입력 → 항상 같은 출력

function renderProfile(profile) {
   const badgeClass = profile.isOnline ? 'on' : 'off';
   const badgeText = profile.isOnline ? 'Online' : 'Offline';

   return `
    <section>
      <div class="card">
        <h2>${profile.name}</h2>
        <p>직업: ${profile.job || '없음'}</p>
        <p>나이: ${profile.age}</p>
        <p>
          스킬: ${
             Array.isArray(profile.skill) && profile.skill.length > 0
                ? profile.skill.join(', ')
                : '없음'
          }
        </p>
        <p>지역: ${profile.city}</p>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
    </section>
   `;
}

// ===============================
// [render: 상태 → 화면 반영]
// ===============================
// render의 책임:
// - state를 기준으로 UI를 "다시 계산"
// - DOM 수정은 오직 이 함수에서만
// - 에러 상태 / 정상 상태 분기 처리

function render() {
   const errors = validateProfile(state);

   if (errors.length > 0) {
      app.innerHTML = '';
      errorBox.innerHTML = errors.map((e) => `• ${e}`).join('<br/>');
      return;
   }

   errorBox.innerHTML = '';
   app.innerHTML = renderProfile(state);
}

// ===============================
// [이벤트: 상태 변경 트리거]
// ===============================
// 이벤트의 역할:
// - DOM을 직접 만지지 않는다
// - state만 변경하고 render() 호출

document.querySelector('#btnRandom').addEventListener('click', () => {
   state = pickRandomProfile();
   render();
});

document.querySelector('#btnToggle').addEventListener('click', () => {
   state = { ...state, isOnline: !state.isOnline };
   render();
});

// ===============================
// [초기 렌더]
// ===============================
// 페이지 진입 시 최초 UI 계산

render();
