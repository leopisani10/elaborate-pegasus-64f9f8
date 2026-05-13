// Footer global Dona Baby+
// Injeta o markup do footer + estilos antes do </body> automaticamente.
// Inclui via: <script defer src="js/footer.js"></script>
(function() {
  const footerHTML = `<!-- ============================================= -->
<!-- FOOTER GLOBAL DONA BABY+                     -->
<!-- Inclui via <script src="js/footer.js"></script> -->
<!-- ============================================= -->
<style>
  .db-footer {
    background: #0E1620;
    color: #C8CFD8;
    padding: 56px 0 32px;
    margin-top: 80px;
    font-family: 'Poppins', sans-serif;
  }
  .db-footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .db-footer-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
  }
  .db-footer-brand img { height: 36px; margin-bottom: 16px; filter: brightness(0) invert(1); }
  .db-footer-brand p {
    font-size: 13px; line-height: 1.6; color: #8B95A1; max-width: 280px;
    margin-bottom: 16px;
  }
  .db-footer-brand .addr {
    font-size: 12px; line-height: 1.7; color: #8B95A1;
  }
  .db-footer-brand .addr strong { color: #C8CFD8; font-weight: 600; display: block; margin-bottom: 4px; }

  .db-footer h5 {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: white; margin-bottom: 16px;
  }
  .db-footer-list { list-style: none; padding: 0; margin: 0; }
  .db-footer-list li { margin-bottom: 10px; }
  .db-footer-list a {
    color: #8B95A1; text-decoration: none; font-size: 13px;
    transition: color 0.15s;
  }
  .db-footer-list a:hover { color: white; }

  .db-footer-bot {
    border-top: 1px solid #1F2A38;
    padding-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }
  .db-footer-bot p { font-size: 12px; color: #8B95A1; margin: 0; }
  .db-footer-social { display: flex; gap: 10px; }
  .db-footer-social a {
    width: 36px; height: 36px; border-radius: 50%;
    background: #1F2A38; color: #C8CFD8;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; text-decoration: none;
  }
  .db-footer-social a:hover { background: #EB5F2D; color: white; transform: translateY(-2px); }

  @media (max-width: 900px) {
    .db-footer-grid { grid-template-columns: 1fr 1fr; }
    .db-footer-brand { grid-column: 1 / -1; }
  }
  @media (max-width: 540px) {
    .db-footer-grid { grid-template-columns: 1fr; gap: 28px; }
    .db-footer-bot { flex-direction: column; align-items: flex-start; }
  }
</style>

<footer class="db-footer">
  <div class="db-footer-inner">
    <div class="db-footer-grid">

      <div class="db-footer-brand">
        <img src="/logo.png" alt="Dona Baby+">
        <p>O jeito mais cuidadoso de famílias e babás se encontrarem no Rio de Janeiro.</p>
        <div class="addr">
          <strong>Dona Baby+ Tecnologia LTDA</strong>
          Av. Ataulfo de Paiva, 1235 · sala 303<br>
          Leblon · Rio de Janeiro · RJ<br>
          WhatsApp (21) 99548-8295
        </div>
      </div>

      <div>
        <h5>Produto</h5>
        <ul class="db-footer-list">
          <li><a href="/">Início</a></li>
          <li><a href="/pricing.html">Planos</a></li>
          <li><a href="/sobre.html">Sobre nós</a></li>
          <li><a href="/seguranca.html">Segurança</a></li>
        </ul>
      </div>

      <div>
        <h5>Pra você</h5>
        <ul class="db-footer-list">
          <li><a href="/dicas.html">Dicas e blog</a></li>
          <li><a href="/faq.html">Perguntas frequentes</a></li>
          <li><a href="/dicas.html?tag=familia">Dicas pra famílias</a></li>
          <li><a href="/dicas.html?tag=baba">Dicas pra babás</a></li>
        </ul>
      </div>

      <div>
        <h5>Suporte</h5>
        <ul class="db-footer-list">
          <li><a href="https://wa.me/5521995488295" target="_blank" rel="noopener">WhatsApp</a></li>
          <li><a href="mailto:contato@donababy.com">Email</a></li>
          <li><a href="/faq.html">Central de ajuda</a></li>
        </ul>
      </div>

      <div>
        <h5>Legal</h5>
        <ul class="db-footer-list">
          <li><a href="/termos.html">Termos de uso</a></li>
          <li><a href="/privacidade.html">Privacidade</a></li>
        </ul>
      </div>

    </div>

    <div class="db-footer-bot">
      <p>© 2026 Dona Baby+ · Feito com carinho no Rio</p>
      <div class="db-footer-social">
        <a href="https://instagram.com/donababy.ofc" target="_blank" rel="noopener" aria-label="Instagram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="https://wa.me/5521995488295" target="_blank" rel="noopener" aria-label="WhatsApp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.4c.1-.1.2-.3.3-.5.1-.2 0-.3 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
        </a>
      </div>
    </div>
  </div>
</footer>
`;
  function inject() {
    // Se já existe, não duplica
    if (document.querySelector('.db-footer')) return;
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
