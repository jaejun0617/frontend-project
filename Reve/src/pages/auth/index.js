/**
 * =============================================
 * 📍 위치: src/pages/auth/index.js
 * 역할: 로그인/회원가입(Auth) 페이지
 * 경로: /auth
 *
 * ✅ MVP 동작
 * - 탭: 로그인 / 회원가입
 * - 더미 로그인:
 *   - admin / 1234  → ADMIN
 *   - user / 1234   → MEMBER
 * - 회원가입: localStorage에 계정 저장
 * - 회원가입 성공 시:
 *   - 자동 로그인
 *   - 가입 축하 쿠폰(HELLOWORLD) 1회 지급(couponStore.register)
 *   - 웰컴 쿠폰 모달: 확인→/mypage, 취소→redirectTo 이동
 * - redirectTo 쿼리 지원: /auth?redirectTo=/cart
 * =============================================
 */

import { authStore } from '../../store/authStore.js';
import { couponStore } from '../../store/couponStore.js';
import { confirmModal } from '../../components/ConfirmModal.js';
import { initToast } from '../../components/Toast.js';

const USERS_KEY = 'reve_users_v1';

// ✅ Auth 페이지에서도 토스트 사용(전역처럼 body에 붙는 구조라 1번만 생성돼도 OK)
const toast = initToast();

function safeParse(json) {
   try {
      return JSON.parse(json);
   } catch {
      return null;
   }
}

function readUsers() {
   const raw = localStorage.getItem(USERS_KEY);
   const parsed = raw ? safeParse(raw) : null;
   return Array.isArray(parsed) ? parsed : [];
}

function writeUsers(users) {
   localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeId(value) {
   return String(value ?? '').trim();
}

function normalizePw(value) {
   return String(value ?? '').trim();
}

function normalizeName(value) {
   return String(value ?? '').trim();
}

function getRedirectTo() {
   const qs = new URLSearchParams(window.location.search);
   const redirectTo = String(qs.get('redirectTo') || '').trim();
   // 보안/안전: 외부 URL 방지 (내 앱 내부 경로만 허용)
   if (!redirectTo.startsWith('/')) return '/';
   return redirectTo || '/';
}

function setMsg(root, text, type = 'info') {
   const el = root.querySelector('[data-auth-msg]');
   if (!el) return;
   el.textContent = text;
   el.dataset.type = type;
}

function setActiveTab(root, tab) {
   root.querySelectorAll('[data-auth-tab]').forEach((btn) => {
      const t = btn.getAttribute('data-auth-tab');
      btn.classList.toggle('is-active', t === tab);
   });

   root.querySelectorAll('[data-auth-panel]').forEach((panel) => {
      const t = panel.getAttribute('data-auth-panel');
      panel.classList.toggle('is-active', t === tab);
   });

   setMsg(root, ''); // 탭 바꿀 때 메시지 초기화
}

function matchDummyAccount(id, pw) {
   const uid = normalizeId(id);
   const upw = normalizePw(pw);

   if (uid === 'admin' && upw === '1234') {
      return { id: 'admin', name: '관리자', role: 'ADMIN', totalSpent: 0 };
   }
   if (uid === 'user' && upw === '1234') {
      return { id: 'user', name: '일반회원', role: 'MEMBER', totalSpent: 0 };
   }
   return null;
}

function findUser(users, id) {
   const uid = normalizeId(id);
   return users.find((u) => String(u.id) === uid) || null;
}

function createUser(users, { id, password, name }) {
   const uid = normalizeId(id);
   const upw = normalizePw(password);
   const uname = normalizeName(name);

   if (uid.length < 2)
      return { ok: false, message: '아이디는 2자 이상 입력해 주세요.' };
   if (upw.length < 4)
      return { ok: false, message: '비밀번호는 4자 이상 입력해 주세요.' };
   if (uname.length < 1) return { ok: false, message: '이름을 입력해 주세요.' };

   if (findUser(users, uid))
      return { ok: false, message: '이미 존재하는 아이디입니다.' };

   const next = [
      {
         id: uid,
         password: upw, // MVP: 평문 저장(학습용). 실서비스면 절대 금지.
         name: uname,
         role: 'MEMBER',
         totalSpent: 0,
         createdAt: Date.now(),
      },
      ...users,
   ];

   writeUsers(next);
   return { ok: true, message: '회원가입 완료! 자동 로그인합니다.' };
}

export function AuthPage() {
   return `
    <section class="page auth-page" aria-label="Auth Page">
      <header class="page__header">
        <h1 class="page__title">로그인</h1>
        <p class="page__desc">로그인/회원가입 후 마이페이지와 혜택을 이용할 수 있어요.</p>
      </header>

      <div class="page__content">
        <div class="auth" data-auth>
          <div class="auth__tabs" role="tablist" aria-label="Auth Tabs">
            <button type="button" class="auth__tab is-active" data-auth-tab="login" role="tab" aria-selected="true">
              로그인
            </button>
            <button type="button" class="auth__tab" data-auth-tab="signup" role="tab" aria-selected="false">
              회원가입
            </button>
          </div>

          <p class="auth__msg" data-auth-msg></p>

          <!-- 로그인 -->
          <section class="auth__panel is-active" data-auth-panel="login" role="tabpanel">
            <form class="auth__form" data-auth-login-form>
              <label class="auth__field">
                <span class="auth__label">아이디</span>
                <input class="auth__input" name="id" autocomplete="username" placeholder="예: user / admin" />
              </label>

              <label class="auth__field">
                <span class="auth__label">비밀번호</span>
                <input class="auth__input" name="pw" type="password" autocomplete="current-password" placeholder="예: 1234" />
              </label>

              <button class="auth__submit" type="submit">로그인</button>

              <p class="auth__hint">
                더미 계정: <strong>user/1234</strong>, <strong>admin/1234</strong>
              </p>
            </form>
          </section>

          <!-- 회원가입 -->
          <section class="auth__panel" data-auth-panel="signup" role="tabpanel">
            <form class="auth__form" data-auth-signup-form>
              <label class="auth__field">
                <span class="auth__label">이름</span>
                <input class="auth__input" name="name" autocomplete="name" placeholder="예: 신재준" />
              </label>

              <label class="auth__field">
                <span class="auth__label">아이디</span>
                <input class="auth__input" name="id" autocomplete="username" placeholder="2자 이상" />
              </label>

              <label class="auth__field">
                <span class="auth__label">비밀번호</span>
                <input class="auth__input" name="pw" type="password" autocomplete="new-password" placeholder="4자 이상" />
              </label>

              <button class="auth__submit" type="submit">회원가입</button>

              <p class="auth__hint">
                회원가입 시 <strong>웰컴 쿠폰(HELLOWORLD · 10%)</strong>이 1회 지급됩니다 🎫
              </p>
            </form>
          </section>
        </div>
      </div>
    </section>
  `;
}
function delay(ms) {
   return new Promise((r) => setTimeout(r, ms));
}
export function initAuthPage() {
   const root = document.querySelector('[data-auth]');
   if (!root) return;

   // 이미 로그인 상태면 바로 보내기(UX)
   if (authStore.isLoggedIn()) {
      const redirectTo = getRedirectTo();
      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href: redirectTo } }),
      );
      return;
   }

   // 탭 전환
   root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-auth-tab]');
      if (!tabBtn) return;

      const tab = tabBtn.getAttribute('data-auth-tab');
      if (!tab) return;

      setActiveTab(root, tab);
   });

   // 로그인 submit
   const loginForm = root.querySelector('[data-auth-login-form]');
   loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      const fd = new FormData(loginForm);
      const id = normalizeId(fd.get('id'));
      const pw = normalizePw(fd.get('pw'));

      if (!id || !pw) {
         setMsg(root, '아이디와 비밀번호를 입력해 주세요.', 'error');
         return;
      }

      // 1) 더미 계정 우선
      const dummy = matchDummyAccount(id, pw);
      if (dummy) {
         authStore.login(dummy);
         setMsg(root, `${dummy.name} 계정으로 로그인 완료`, 'success');

         const redirectTo = getRedirectTo();
         window.dispatchEvent(
            new CustomEvent('app:navigate', { detail: { href: redirectTo } }),
         );
         return;
      }

      // 2) 가입 계정 로그인
      const users = readUsers();
      const found = findUser(users, id);

      if (!found || String(found.password) !== pw) {
         setMsg(root, '로그인 실패: 아이디/비밀번호를 확인해 주세요.', 'error');
         return;
      }

      authStore.login({
         id: found.id,
         name: found.name,
         role: found.role,
         totalSpent: found.totalSpent ?? 0,
      });

      setMsg(root, `${found.name}님, 로그인 완료 ✨`, 'success');

      const redirectTo = getRedirectTo();
      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href: redirectTo } }),
      );
   });

   // 회원가입 submit
   const signupForm = root.querySelector('[data-auth-signup-form]');
   signupForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      const fd = new FormData(signupForm);
      const name = normalizeName(fd.get('name'));
      const id = normalizeId(fd.get('id'));
      const pw = normalizePw(fd.get('pw'));

      const users = readUsers();
      const created = createUser(users, { id, password: pw, name });

      if (!created.ok) {
         setMsg(root, created.message, 'error');
         return;
      }

      // ✅ 자동 로그인
      authStore.login({ id, name, role: 'MEMBER', totalSpent: 0 });

      // ✅ 가입 축하 쿠폰 1회 지급
      const couponResult = couponStore.register('HELLOWORLD');

      setMsg(root, created.message, 'success');

      // ✅ 이동할 곳(보통 / or /cart 등)
      const redirectTo = getRedirectTo();

      // ✅ "메인 이동 후 모달 띄우기" 예약 (중요!)
      const payload = {
         name,
         ok: Boolean(couponResult?.ok),
         coupon: {
            code: 'HELLOWORLD',
            title: '웰컴 쿠폰',
            rateText: '10% 할인',
         },
         // 모달에서 "확인" 눌렀을 때 갈 곳
         confirmHref: '/mypage',
         // 모달 띄우기 딜레이(ms)
         delayMs: 2000,
      };

      sessionStorage.setItem(
         'reve_after_signup_modal',
         JSON.stringify(payload),
      );

      // ✅ 여기서 바로 이동시켜야 "메인으로 이동된 다음 모달"이 가능
      window.dispatchEvent(
         new CustomEvent('app:navigate', { detail: { href: redirectTo } }),
      );
   });
}
