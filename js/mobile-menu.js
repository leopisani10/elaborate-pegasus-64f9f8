// Mobile menu universal Dona Baby+
// Adiciona botão sanduíche + drawer em qualquer header de nav.
// Inclui via: <script defer src="js/mobile-menu.js"></script>
//
// Como funciona:
// 1. Procura no DOM um <header> ou <nav> com classe que pareça nav (.app-nav, .pub-header, #nav)
// 2. Acha a lista de links (.nav-links, .app-nav-links, .pub-nav)
// 3. Em telas <= 700px, esconde a lista e mostra ícone sanduíche
// 4. Clicar abre drawer lateral

(function() {
  // Não duplica se já injetou
  if (window.__dbMobileMenuInited) return;
  window.__dbMobileMenuInited = true;

  // ----- CSS -----
  const css = `
    .db-burger {
      display: none;
      background: none;
      border: 1px solid var(--line-strong, #DDDFE3);
      width: 40px;
      height: 40px;
      border-radius: 12px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s;
    }
    .db-burger:hover { background: var(--bg-soft, #F6F7F9); }
    .db-burger svg { width: 20px; height: 20px; }

    @media (max-width: 960px) {
      .db-burger { display: inline-flex; }
      /* Esconde menus horizontais comuns em mobile */
      .nav-links, .app-nav-links, .pub-nav { display: none !important; }
      /* Esconde botões/links auxiliares mas mantém logo */
      .app-nav-right > a.user-chip,
      .pub-nav,
      .nav-right { display: none !important; }
    }

    .db-drawer-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 998;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }
    .db-drawer-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .db-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(85vw, 340px);
      background: white;
      z-index: 999;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.32, 0.72, 0.4, 1);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgba(0,0,0,0.12);
    }
    .db-drawer.open { transform: translateX(0); }

    .db-drawer-head {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line, #ECECEE);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .db-drawer-head img { height: 28px; }
    .db-drawer-close {
      background: none; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-3, #6B7280);
    }
    .db-drawer-close:hover { background: var(--bg-soft, #F6F7F9); color: var(--ink, #0E1620); }

    .db-drawer-user {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line, #ECECEE);
      display: flex; align-items: center; gap: 12px;
    }
    .db-drawer-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--baba, #1A9D85); color: white;
      font-weight: 700; font-size: 17px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .db-drawer-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .db-drawer-user-info strong {
      display: block; font-size: 14px; font-weight: 700;
      color: var(--ink, #0E1620);
    }
    .db-drawer-user-info span {
      font-size: 12px; color: var(--ink-3, #6B7280);
    }

    .db-drawer-nav {
      flex: 1;
      padding: 12px 12px;
      overflow-y: auto;
    }
    .db-drawer-nav a, .db-drawer-nav button {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 15px;
      font-weight: 500;
      color: var(--ink-2, #3C4452);
      text-decoration: none;
      background: none;
      border: none;
      width: 100%;
      cursor: pointer;
      text-align: left;
    }
    .db-drawer-nav a:hover, .db-drawer-nav button:hover {
      background: var(--bg-soft, #F6F7F9);
      color: var(--ink, #0E1620);
    }
    .db-drawer-nav a.active {
      background: var(--cta-soft, #FDECE4);
      color: var(--cta, #EB5F2D);
      font-weight: 700;
    }
    .db-drawer-nav .divider {
      height: 1px;
      background: var(--line, #ECECEE);
      margin: 10px 4px;
    }
    .db-drawer-nav .danger {
      color: #B53034;
    }
    .db-drawer-nav .danger:hover { background: #FCE7E7; color: #B53034; }

    .db-drawer-foot {
      padding: 20px 24px;
      border-top: 1px solid var(--line, #ECECEE);
      display: flex; flex-direction: column; gap: 8px;
    }
    .db-drawer-foot a.btn-pri {
      background: var(--cta, #EB5F2D);
      color: white;
      padding: 12px 18px;
      border-radius: 999px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
    }
    .db-drawer-foot a.btn-sec {
      padding: 12px 18px;
      border-radius: 999px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      color: var(--ink, #0E1620);
      text-decoration: none;
    }
    .db-drawer-foot a.btn-sec:hover { background: var(--bg-soft, #F6F7F9); }

    body.db-drawer-locked { overflow: hidden; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ----- HTML -----
  const overlay = document.createElement('div');
  overlay.className = 'db-drawer-overlay';
  overlay.addEventListener('click', closeDrawer);

  const drawer = document.createElement('aside');
  drawer.className = 'db-drawer';
  drawer.innerHTML = `
    <div class="db-drawer-head">
      <a href="/"><img src="/logo.png" alt="Dona Baby+"></a>
      <button class="db-drawer-close" aria-label="Fechar menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="dbDrawerUser" style="display:none;"></div>
    <nav class="db-drawer-nav" id="dbDrawerNav"></nav>
    <div class="db-drawer-foot" id="dbDrawerFoot"></div>
  `;

  drawer.querySelector('.db-drawer-close').addEventListener('click', closeDrawer);

  function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.classList.add('db-drawer-locked');
  }
  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.classList.remove('db-drawer-locked');
  }

  function init() {
    if (document.body.contains(drawer)) return;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Acha o header de nav e injeta botão sanduíche
    const header = document.querySelector('header.app-nav, header.pub-header, header.checkout-header, header.ob-header, nav#nav, header.header');
    if (!header) {
      // página sem header reconhecido (ex: success simples) — não faz nada
      return;
    }

    // Cria botão sanduíche
    const burger = document.createElement('button');
    burger.className = 'db-burger';
    burger.setAttribute('aria-label', 'Abrir menu');
    burger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    burger.addEventListener('click', () => {
      buildDrawerContent();
      openDrawer();
    });

    // Posicionar o botão: no fim do nav inner (à direita)
    const navInner = header.querySelector('.nav-inner, .app-nav-inner, .pub-header-inner, .checkout-header-inner, .ob-header-inner') || header;

    // Se há um nav-right (chip ou btns), botão fica DENTRO dele.
    const navRight = navInner.querySelector('.app-nav-right, .nav-right, .pub-nav');
    if (navRight) {
      navRight.parentNode.insertBefore(burger, navRight.nextSibling);
    } else {
      navInner.appendChild(burger);
    }
  }

  function buildDrawerContent() {
    const drawerNav = document.getElementById('dbDrawerNav');
    const drawerFoot = document.getElementById('dbDrawerFoot');
    const drawerUser = document.getElementById('dbDrawerUser');

    // Tenta determinar contexto: tá logado?
    const isLogged = window.dbClient && window.dbHelpers;

    // Acha link "ativo" pela URL
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';

    // ===== LINKS DA NAV =====
    // Tenta clonar dos links existentes da página primeiro
    const existing = document.querySelectorAll('.nav-links a, .app-nav-links a, .pub-nav > a');

    let links = [];

    if (existing.length > 0) {
      existing.forEach(a => {
        const href = a.getAttribute('href');
        const label = a.textContent.trim();
        if (!href || !label) return;
        // Pula botões de "Entrar" e "Cadastre-se" pra colocar separado no foot
        if (/entrar|sign|criar conta|cadastr|btn-pri|btn-cta/i.test(href + ' ' + a.className + ' ' + label)) return;
        links.push({ href, label, active: a.classList.contains('active') });
      });
    }

    // Se não achou links (header simples), monta padrão público
    if (links.length === 0) {
      links = [
        { href: '/dicas.html', label: 'Dicas' },
        { href: '/sobre.html', label: 'Sobre' },
        { href: '/pricing.html', label: 'Planos' },
        { href: '/faq.html', label: 'FAQ' },
      ];
    }

    drawerNav.innerHTML = links.map(l => {
      const active = l.active ? ' class="active"' : '';
      return `<a href="${l.href}"${active}>${l.label}</a>`;
    }).join('');

    // ===== USUÁRIO + FOOT =====
    if (isLogged) {
      // Tenta pegar profile (assincronamente)
      Promise.resolve(window.dbHelpers.getCurrentProfile()).then(profile => {
        if (!profile) {
          renderPublicFoot();
          return;
        }
        const initial = (profile.full_name || '?').charAt(0).toUpperCase();
        const firstName = (profile.full_name || '').split(' ')[0];
        const avatarHTML = profile.avatar_url
          ? `<img src="${profile.avatar_url}" alt="">`
          : initial;
        drawerUser.style.display = 'flex';
        drawerUser.className = 'db-drawer-user';
        drawerUser.innerHTML = `
          <div class="db-drawer-avatar">${avatarHTML}</div>
          <div class="db-drawer-user-info">
            <strong>${escapeHtml(profile.full_name || '—')}</strong>
            <span>${escapeHtml(profile.email || '')}</span>
          </div>
        `;

        // Adiciona "Minha conta" e "Sair" no drawer nav
        const accountLink = `<a href="/account.html">Minha conta</a>`;
        const signOutBtn = `<button type="button" class="danger" id="dbDrawerSignOut">Sair</button>`;
        drawerNav.insertAdjacentHTML('beforeend', `<div class="divider"></div>${accountLink}${signOutBtn}`);

        const so = document.getElementById('dbDrawerSignOut');
        if (so) so.addEventListener('click', async () => {
          await window.dbHelpers.signOut();
        });

        drawerFoot.innerHTML = '';
      }).catch(() => renderPublicFoot());
    } else {
      renderPublicFoot();
    }

    function renderPublicFoot() {
      drawerUser.style.display = 'none';
      drawerFoot.innerHTML = `
        <a href="/signup.html" class="btn-pri">Criar conta grátis</a>
        <a href="/login.html" class="btn-sec">Já tenho conta</a>
      `;
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  }

  // Fecha drawer com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
