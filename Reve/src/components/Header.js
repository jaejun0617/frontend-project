/**
 * =============================================
 * 📍 위치: src/components/Header.js
 * 역할: 상단 Header/Navigation UI 컴포넌트
 * - 로그인/권한에 따라 UI 토글 가능하도록 data 훅 제공
 * - 기본값: GUEST 기준 렌더 (MyPage/Admin/Logout hidden)
 * =============================================
 */
export const Header = () => {
   return `
  <header class='site-header' role='banner' aria-label='Site Header'>
    <nav class='site-nav' aria-label='Primary Navigation'>
      <!-- Brand -->
      <div class='site-logo' aria-label='Brand'>
        <a href='/' data-link aria-label='Go to Home'>
          <img src='/assets/logo/logo.svg' alt='Reve' />
        </a>
      </div>

      <!-- ✅ PC Main Menu -->
      <ul class='nav-menu-list' aria-label='Main Menu'>
        <li class="nav-menu-item">
          <a class="nav-menu-link" href='/product' data-link>Product</a>
        </li>

        <li class="nav-menu-item">
          <a class="nav-menu-link" href='/event' data-link>Event</a>
        </li>

        <li class="nav-menu-item">
          <a class="nav-menu-link" href='/brand' data-link>Brand</a>
        </li>

                <li class="nav-menu-item">
          <a class="nav-menu-link" href='/review' data-link>Review</a>
        </li>


        <li class="nav-menu-item">
          <a class="nav-menu-link" href='/notice' data-link>Notice</a>
        </li>
      </ul>

      <!-- Utility Icons -->
      <ul class='nav-menu-icons' aria-label='Utility Menu'>
        <li>
          <button
            class='icon-btn search-toggle'
            type='button'
            aria-label='Open search'
            aria-controls='search-drawer'
            aria-expanded='false'
          >
            <img src='/src/icons/search.svg' alt='' aria-hidden='true' />
          </button>
        </li>

        <!-- ✅ GUEST: 로그인 아이콘 -->
        <li data-auth-login hidden>
          <a class="icon-link" href='/auth' data-link aria-label='Login'>
            <img src='/src/icons/lock.svg' alt='' aria-hidden='true' />
          </a>
        </li>

        <!-- ✅ MEMBER/ADMIN: 로그아웃 아이콘 -->
        <li data-auth-logout hidden>
          <button
            type='button'
            class='icon-btn nav-logout-btn'
            data-logout
            aria-label='Logout'
          >
            <img src='/src/icons/unlock.svg' alt='' aria-hidden='true' />
          </button>
        </li>

        <li>
          <a href='/cart' data-link aria-label='Cart' class='nav-cart icon-link'>
            <img src='/src/icons/cart.svg' alt='' aria-hidden='true' />
            <span
              class='cart-badge'
              data-cart-count
              aria-label='Cart item count'
              aria-live='polite'
              hidden
            >0</span>
          </a>
        </li>

        <!-- ✅ MEMBER/ADMIN: 마이페이지 -->
        <li data-auth-mypage hidden>
          <a href='/mypage' data-link aria-label='My Page' class="icon-link">
            <img src='/src/icons/category.svg' alt='' aria-hidden='true' />
          </a>
        </li>

        <!-- ✅ ADMIN only -->
        <li data-auth-admin hidden>
          <a href='/admin' data-link aria-label='Admin' class="icon-link">
            <img src='/src/icons/lock.svg' alt='' aria-hidden='true' />
          </a>
        </li>

        <!-- ✅ Mobile only: Hamburger -->
        <li class='menu-bar-item'>
          <button
            class='icon-btn site-menu-bar'
            type='button'
            aria-label='Open menu'
            aria-controls='mobile-sidebar'
            aria-expanded='false'
          >
            <img src='/src/icons/menubar.svg' alt='' aria-hidden='true' />
          </button>
        </li>
      </ul>

      <!-- Overlay -->
      <div class='sidebar-overlay' data-sidebar-overlay aria-hidden='true'></div>

      <!-- Mobile Sidebar (Off-canvas) -->
      <aside
        id='mobile-sidebar'
        class='mobile-sidebar'
        aria-label='Mobile Menu'
        aria-hidden='true'
      >
        <div class='mobile-sidebar__header'>
          <div class='mobile-title'></div>
          <button type='button' class='sidebar-close' aria-label='Close menu'>✕</button>
        </div>

        <div class='mobile-icons'>
          <ul class='mobile-icons__list'>
            <li>
              <button
                class='icon-btn search-toggle'
                type='button'
                aria-label='Open search'
                aria-controls='search-drawer'
                aria-expanded='false'
              >
                <img src='/src/icons/search.svg' alt='' aria-hidden='true' />
              </button>
            </li>

            <li data-auth-login hidden>
              <a class="icon-link" href='/auth' data-link aria-label='Login'>
                <img src='/src/icons/lock.svg' alt='' aria-hidden='true' />
              </a>
            </li>

            <li data-auth-logout hidden>
              <button type='button' class='icon-btn nav-logout-btn' data-logout aria-label='Logout'>
                <img src='/src/icons/unlock.svg' alt='' aria-hidden='true' />
              </button>
            </li>

            <li>
              <a href='/cart' data-link aria-label='Cart' class='nav-cart icon-link'>
                <img src='/src/icons/cart.svg' alt='' aria-hidden='true' />
                <span class='cart-badge' data-cart-count aria-live='polite' hidden>0</span>
              </a>
            </li>

            <li data-auth-mypage hidden>
              <a href='/mypage' data-link aria-label='My Page' class="icon-link">
                <img src='/src/icons/category.svg' alt='' aria-hidden='true' />
              </a>
            </li>

            <li data-auth-admin hidden>
              <a href='/admin' data-link aria-label='Admin' class="icon-link">
                <img src='/src/icons/lock.svg' alt='' aria-hidden='true' />
              </a>
            </li>
          </ul>
        </div>

        <!-- ✅ Mobile Navigation (PC 메뉴와 동일한 항목으로 통일) -->
        <nav class='mobile-sidebar__nav' aria-label='Mobile Navigation'>
          <a href='/' data-link>Home</a>
          <a href='/product' data-link>Product</a>
          <a href='/event' data-link>Event</a>
          <a href='/brand' data-link>Brand</a>
          <a href='/review' data-link>Review</a>
          <a href='/notice' data-link>Notice</a>

          <!-- ✅ GUEST -->
          <a href='/auth' data-link data-auth-login hidden>Login</a>

          <!-- ✅ ADMIN only -->
          <a href='/admin' data-link data-auth-admin hidden>Admin</a>
        </nav>
      </aside>

      <!-- Search Overlay -->
      <div class='search-overlay' data-search-overlay aria-hidden='true'></div>

      <!-- Search Drawer (Top-down) -->
      <section
        id='search-drawer'
        class='search-drawer'
        role='dialog'
        aria-label='Search'
        aria-hidden='true'
      >
        <div class='search-drawer__inner'>
          <div class='search-drawer__header'>
            <img src='/assets/logo/logo.svg' alt='Reve' />
            <button type='button' class='search-close' aria-label='Close search'>✕</button>
          </div>

          <form class='search-form' data-search-form>
            <input
              class='search-input'
              type='search'
              name='q'
              placeholder='검색어를 입력하세요'
              autocomplete='off'
              aria-label='Search input'
            />
            <button class='search-submit' type='submit'>검색</button>
          </form>

          <div class='search-panels'>
            <div class='search-panel'>
              <div class='search-panel__head'>
                <strong>최근 검색어</strong>
                <button type='button' class='search-clear' data-search-clear>전체 삭제</button>
              </div>
              <ul class='search-chips' data-search-recent></ul>
            </div>

            <div class='search-panel'>
              <div class='search-panel__head'>
                <strong>추천 검색어</strong>
              </div>
              <ul class='search-chips' data-search-suggest></ul>
            </div>
          </div>
        </div>
      </section>
    </nav>
  </header>
`;
};
