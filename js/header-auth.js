// header-auth.js — Sincroniza estado de login no header das páginas públicas
// Em páginas com .pub-nav (institucionais/landing), se o usuário tá logado,
// substitui "Entrar" + "Criar conta" por um chip com nome/foto.
//
// Inclui via: <script defer src="js/header-auth.js"></script>
//
// Depende: auth.js (window.dbClient e window.dbHelpers)

(function() {
  if (window.__dbHeaderAuthInited) return;
  window.__dbHeaderAuthInited = true;

  // CSS pro chip + estado de loading (evita "flash" de "Entrar/Criar conta")
  const style = document.createElement('style');
  style.textContent = `
    .pub-nav.db-hidden-buttons a[href="/login.html"],
    .pub-nav.db-hidden-buttons a[href="/signup.html"],
    .nav-right.db-hidden-buttons > a {
      display: none !important;
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
      if (!profile) return; // não logado — deixa "Entrar/Criar conta"

      // Logado! Esconde botões e mostra chip
      container.classList.add('db-hidden-buttons');

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
