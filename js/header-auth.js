// header-auth.js v2 — Sincroniza estado de login no header das páginas públicas
//
// Quando o usuário tá logado:
// - Esconde os links institucionais ("Dicas", "Sobre", "Planos", "Entrar", "Criar conta")
// - Mostra os links do app conforme o user_type (Buscar babás/famílias, Dicas, Mensagens, Meu perfil)
// - Substitui o botão "Criar conta" pelo chip com nome+foto
//
// Inclui via: <script defer src="js/header-auth.js"></script>

(function() {
  if (window.__dbHeaderAuthInited) return;
  window.__dbHeaderAuthInited = true;

  const style = document.createElement('style');
  style.textContent = `
    /* Esconde os botões/links originais quando logado */
    .pub-nav.db-hidden-original > a,
    .nav-right.db-hidden-original > a {
      display: none !important;
    }

    /* Estilos pros links do app injetados */
    .pub-nav .db-applink,
    .nav-right .db-applink {
      color: var(--ink-2, #3C4452);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: color 0.15s;
    }
    .pub-nav .db-applink:hover,
    .nav-right .db-applink:hover { color: var(--cta, #EB5F2D); }
    .pub-nav .db-applink.active,
    .nav-right .db-applink.active {
      color: var(--cta, #EB5F2D);
      font-weight: 700;
    }

    /* Chip do usuário */
    .db-user-chip {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 14px 6px 6px; border-radius: 999px;
      background: white; border: 1.5px solid var(--line-strong, #DDDFE3);
      text-decoration: none; color: var(--ink, #0E1620);
      font-weight: 600; font-size: 13px;
      transition: all 0.15s;
      margin-left: 8px;
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

    /* Mobile: esconde links injetados, só mostra chip (mobile-menu cuida do resto) */
    @media (max-width: 960px) {
      .db-applink { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  async function init() {
    // Suporta: .pub-nav (institucionais), .nav-right (landing)
    const container = document.querySelector('.pub-nav, .nav-right');
    if (!container) return;

    // Espera supabase carregar (max ~3s)
    let tries = 0;
    while (!window.dbClient && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!window.dbClient || !window.dbHelpers) return;

    try {
      const profile = await window.dbHelpers.getCurrentProfile();
      if (!profile) return; // não logado — deixa o header padrão

      // Esconde os links originais
      container.classList.add('db-hidden-original');

      // Define links do app conforme user_type
      const links = appLinksFor(profile.user_type);

      // Insere os links do app
      const currentPath = (window.location.pathname || '').replace(/\.html$/, '').replace(/\/$/, '');
      links.forEach(l => {
        const a = document.createElement('a');
        a.className = 'db-applink';
        a.href = l.href;
        a.textContent = l.label;
        // Marca ativo se o path bate
        const linkPath = l.href.replace(/\.html$/, '').replace(/\/$/, '');
        if (linkPath && currentPath.endsWith(linkPath)) a.classList.add('active');
        container.appendChild(a);
      });

      // Chip do usuário
      const firstName = (profile.full_name || '?').split(' ')[0];
      const initial = (profile.full_name || '?').charAt(0).toUpperCase();
      const avatarInner = profile.avatar_url
        ? `<img src="${escape(profile.avatar_url)}" alt="">`
        : initial;

      const chip = document.createElement('a');
      chip.className = 'db-user-chip';
      chip.href = '/account.html';
      chip.innerHTML = `
        <div class="db-user-chip-avatar">${avatarInner}</div>
        <span>${escape(firstName)}</span>
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
    // parent (default)
    return [
      { href: '/dashboard.html', label: 'Buscar babás' },
      { href: '/dicas.html', label: 'Dicas' },
      { href: '/chat.html', label: 'Mensagens' },
    ];
  }

  function escape(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
