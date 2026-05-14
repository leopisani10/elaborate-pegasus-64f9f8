// header-auth.js v4 — Sincroniza estado de login no header
//
// Casos:
// 1. Landing (.nav-right): logado → chip pra account
// 2. Institucionais (.pub-nav):
//    - Babá/Família logado: applinks (Buscar X / Dicas / Mensagens) + chip
//    - Admin logado: SÓ botão "Sair" (sem applinks, admin não precisa nem de Dicas nem Mensagens)

(function() {
  if (window.__dbHeaderAuthInited) return;
  window.__dbHeaderAuthInited = true;

  const style = document.createElement('style');
  style.textContent = `
    .pub-nav.db-hidden-original > a,
    .nav-right.db-hidden-original > a {
      display: none !important;
    }
    .pub-nav .db-applink {
      color: var(--ink-2, #3C4452);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: color 0.15s;
    }
    .pub-nav .db-applink:hover { color: var(--cta, #EB5F2D); }
    .pub-nav .db-applink.active {
      color: var(--cta, #EB5F2D);
      font-weight: 700;
    }
    .db-user-chip {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 14px 6px 6px; border-radius: 999px;
      background: white; border: 1.5px solid var(--line-strong, #DDDFE3);
      text-decoration: none; color: var(--ink, #0E1620);
      font-weight: 600; font-size: 13px;
      transition: all 0.15s;
    }
    .db-user-chip:hover { border-color: var(--ink, #0E1620); }
    .db-user-chip-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--baba, #1A9D85); color: white;
      font-weight: 700; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .db-user-chip-avatar img { width: 100%; height: 100%; object-fit: cover; }

    /* Botão Sair (pro admin) */
    .db-logout-btn {
      background: white; color: var(--cta, #EB5F2D);
      border: 1.5px solid var(--cta, #EB5F2D);
      padding: 8px 18px; border-radius: 999px;
      font-family: inherit; font-size: 13px; font-weight: 700;
      cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.15s;
    }
    .db-logout-btn:hover { background: var(--cta, #EB5F2D); color: white; }

    @media (max-width: 960px) {
      .pub-nav .db-applink { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  async function init() {
    const pubNav = document.querySelector('.pub-nav');
    const navRight = document.querySelector('.nav-right');
    const container = pubNav || navRight;
    if (!container) return;

    const isLanding = !pubNav && !!navRight;

    let tries = 0;
    while (!window.dbClient && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!window.dbClient || !window.dbHelpers) return;

    try {
      const profile = await window.dbHelpers.getCurrentProfile();
      if (!profile) return;

      container.classList.add('db-hidden-original');

      // ADMIN: só botão Sair, sem nada mais
      if (profile.user_type === 'admin') {
        const btn = document.createElement('a');
        btn.className = 'db-logout-btn';
        btn.href = '#';
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sair
        `;
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          await window.dbHelpers.signOut();
        });
        container.appendChild(btn);
        return;
      }

      const firstName = (profile.full_name || '?').split(' ')[0];
      const initial = (profile.full_name || '?').charAt(0).toUpperCase();
      const avatarInner = profile.avatar_url
        ? `<img src="${escapeStr(profile.avatar_url)}" alt="">`
        : initial;

      // LANDING: só chip
      if (isLanding) {
        const chip = document.createElement('a');
        chip.className = 'db-user-chip';
        chip.href = '/account.html';
        chip.innerHTML = `
          <div class="db-user-chip-avatar">${avatarInner}</div>
          <span>${escapeStr(firstName)}</span>
        `;
        container.appendChild(chip);
        return;
      }

      // INSTITUCIONAL (babá/família): applinks + chip
      const links = appLinksFor(profile.user_type);
      const currentPath = (window.location.pathname || '').replace(/\.html$/, '').replace(/\/$/, '');
      links.forEach(l => {
        const a = document.createElement('a');
        a.className = 'db-applink';
        a.href = l.href;
        a.textContent = l.label;
        const linkPath = l.href.replace(/\.html$/, '').replace(/\/$/, '');
        if (linkPath && currentPath.endsWith(linkPath)) a.classList.add('active');
        container.appendChild(a);
      });

      const chip = document.createElement('a');
      chip.className = 'db-user-chip';
      chip.href = '/account.html';
      chip.style.marginLeft = '8px';
      chip.innerHTML = `
        <div class="db-user-chip-avatar">${avatarInner}</div>
        <span>${escapeStr(firstName)}</span>
      `;
      container.appendChild(chip);
    } catch (err) {
      console.warn('header-auth: erro', err);
    }
  }

  function appLinksFor(userType) {
    if (userType === 'baba') {
      return [
        { href: '/families.html', label: 'Buscar famílias' },
        { href: '/dicas.html', label: 'Dicas' },
        { href: '/chat.html', label: 'Mensagens' },
      ];
    }
    return [
      { href: '/dashboard.html', label: 'Buscar babás' },
      { href: '/dicas.html', label: 'Dicas' },
      { href: '/chat.html', label: 'Mensagens' },
    ];
  }

  function escapeStr(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
