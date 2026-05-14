// header-auth.js v3 — Sincroniza estado de login no header das páginas públicas
//
// Casos:
// 1. Páginas institucionais (.pub-nav): nav completa
//    - Não logado: deixa header padrão
//    - Logado: esconde links originais, injeta applinks (Buscar famílias/Dicas/Mensagens) + chip
//
// 2. Landing (.nav-right): só wrapper dos botões Entrar/Cadastre-se
//    - Não logado: deixa header padrão (mostra Entrar + Cadastre-se)
//    - Logado: substitui os 2 botões por chip único "Meu perfil"
//    - Os .nav-links (Como funciona / Babás / Famílias / Planos) ficam intactos

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

      const firstName = (profile.full_name || '?').split(' ')[0];
      const initial = (profile.full_name || '?').charAt(0).toUpperCase();
      const avatarInner = profile.avatar_url
        ? `<img src="${escapeStr(profile.avatar_url)}" alt="">`
        : initial;

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
      console.warn('header-auth: erro buscando perfil', err);
    }
  }

  function appLinksFor(userType) {
    if (userType === 'admin') {
      return [
        { href: '/admin.html', label: 'Aprovações' },
        { href: '/dicas.html', label: 'Dicas' },
        { href: '/chat.html', label: 'Mensagens' },
      ];
    }
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
