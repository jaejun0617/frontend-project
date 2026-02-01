/**
 * =============================================
 * 📍 위치: src/components/Header.js
 * 역할: 상단 Header/Navigation UI 컴포넌트
 * 사용처: app.js(또는 각 Page/레이아웃)에서 import 해서 렌더링
 * =============================================
 */
export const Header = () => {
   return `
    <header class='site-header' role='banner' aria-label='Site Header'>
      <nav class='site-nav' aria-label='Primary Navigation'>
        <div class='site-logo' aria-label='Brand'>
          <a href='/' data-link aria-label='Go to Home'>
            <img src='/assets/logo/logo.svg' alt='' />
          </a>
        </div>

        <ul class='nav-menu-list' aria-label='Main Menu'>
          <li>
            <a href='/product' data-link aria-label='Menu Item'>상품</a>
          </li>
        </ul>

        <ul class='nav-menu-icons' aria-label='Utility Menu'>
          <li>
            <button
              class='search-toggle'
              type='button'
              aria-label='Open search'
              aria-controls='search-drawer'
              aria-expanded='false'
            >
              <img src='/src/icons/search.svg' alt='' aria-hidden='true' />
            </button>
          </li>
          <li>
            <a href='/auth' data-link aria-label='Login'>
              <img src='/src/icons/usericon.svg' alt='' />
            </a>
          </li>
          <li>
            <a href='/cart' data-link aria-label='Cart'>
              <img src='/src/icons/cart.svg' alt='' />
            </a>
          </li>
          <li class='mypage-icon'>
            <a href='/mypage' data-link aria-label='My Page'>
              <img src='/src/icons/category.svg' alt='' />
            </a>
          </li>
          <li class='admin-icon'>
            <a href='/admin' data-link aria-label='Admin'>
              <img src='/src/icons/lock.svg' alt='' />
            </a>
          </li>
          <li class='menu-bar-item'>
            <button
              class='site-menu-bar'
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
            <button type='button' class='sidebar-close' aria-label='Close menu'>
              ✕
            </button>
          </div>

          <div class='mobile-icons'>
            <ul class='mobile-icons__list'>
              <li>
                <button
                  class='search-toggle'
                  type='button'
                  aria-label='Open search'
                  aria-controls='search-drawer'
                  aria-expanded='false'
                >
                  <img src='/src/icons/search.svg' alt='' aria-hidden='true' />
                </button>
              </li>
              <li>
                <a href='/auth' data-link aria-label='Login'>
                  <img src='/src/icons/usericon.svg' alt='' />
                </a>
              </li>
              <li>
                <a href='/cart' data-link aria-label='Cart'>
                  <img src='/src/icons/cart.svg' alt='' />
                </a>
              </li>
              <li class='mypage-icon'>
                <a href='/mypage' data-link aria-label='My Page'>
                  <img src='/src/icons/category.svg' alt='' />
                </a>
              </li>
              <li class='admin-icon'>
                <a href='/admin' data-link aria-label='Admin'>
                  <img src='/src/icons/lock.svg' alt='' />
                </a>
              </li>
            </ul>
          </div>

          <nav class='mobile-sidebar__nav' aria-label='Mobile Navigation'>
            <a href='/' data-link>Home</a>
            <a href='/product' data-link>상품</a>
            <a href='/search' data-link>Search</a>
            <a href='/cart' data-link>Cart</a>
            <a href='/auth' data-link>Login</a>
            <a href='/mypage' data-link>MyPage</a>
            <a href='/admin' data-link>Admin</a>
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
              <img src='/assets/logo/logo.svg' alt='' />
              <button type='button' class='search-close' aria-label='Close search'>
                ✕
              </button>
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
