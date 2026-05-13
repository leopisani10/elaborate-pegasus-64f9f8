# Dona Baby+

Plataforma do Rio que conecta babás verificadas a famílias acolhedoras.

> Status atual: **mockups visuais em HTML estático**. Próxima fase é converter pra app React funcional com Supabase + Stripe. Veja [INTEGRACAO.md](./INTEGRACAO.md) pro roteiro completo.

---

## Como rodar localmente

Os mockups são HTML puro, sem build necessário. Basta abrir qualquer arquivo no navegador.

```bash
# Opção 1: clique duplo em index.html
# Opção 2: rodar um servidor local pra ver com URLs limpas
python3 -m http.server 8000
# Acesse http://localhost:8000
```

---

## Deploy via Netlify (auto-deploy do GitHub)

1. **Crie um repositório no GitHub** (privado é recomendado por enquanto)
2. **Empurre os arquivos** deste pacote pra esse repo
3. **No Netlify**:
   - Conecte o site existente ao novo repo (Settings → Build & deploy → Continuous deployment → Link repository)
   - **OU** crie um novo site puxando do repo (Add new site → Import from GitHub)
4. **Configurações de build** (já tá pré-definido no `netlify.toml`):
   - Build command: *(vazio)* — não precisa
   - Publish directory: `.` (raiz)
5. **Pronto.** Todo commit que você empurrar pro `main` republica automaticamente.

---

## Estrutura

```
.
├── index.html                  # Landing page (página inicial pública)
├── signup.html                 # Cadastro (escolha babá/família)
├── login.html                  # Entrar
├── onboarding-baba.html        # Onboarding multi-step babá
├── onboarding-familia.html     # Onboarding família
├── dashboard.html              # Busca de babás com filtros
├── profile.html                # Perfil completo da babá
├── chat.html                   # Mensagens (estilo chat)
├── pricing.html                # Checkout com Stripe Elements visual
├── admin.html                  # Painel admin de aprovação
├── account.html                # Minha conta + assinatura
├── demo.html                   # 🔒 Overview interno (acesse via /demo) — uso seu
├── shared.css                  # Design system compartilhado
├── logo.png                    # Logo com transparência
├── donababy_schema_v1.sql      # Schema do banco pra Supabase
├── INTEGRACAO.md               # Guia: o que precisa pra integrações
├── netlify.toml                # Config do Netlify
└── README.md                   # Este arquivo
```

**Sobre o `demo.html`:** é uma página oculta com cards de todas as telas pra você navegar durante o desenvolvimento. Não tem link nem busca apontando pra ela — só funciona se acessar direto `donababy.com/demo`. Você pode bookmarcar pra uso pessoal.

---

## Roadmap

- [x] **Fase 0 — Design system + mockups** (essa entrega)
- [ ] **Fase 1 — Setup das contas** (Stripe, Supabase, Resend) — ver INTEGRACAO.md
- [ ] **Fase 2 — Projeto React** (Vite + TypeScript + Tailwind)
- [ ] **Fase 3 — Auth + onboarding funcionando**
- [ ] **Fase 4 — Busca + perfil + chat realtime**
- [ ] **Fase 5 — Stripe checkout + webhook**
- [ ] **Fase 6 — Admin panel funcional**
- [ ] **Fase 7 — Polimento + testes + go-live**

Estimativa: 6-10 semanas até estar no ar pra primeiros usuários.

---

## Design

- **Tipografia:** Poppins (300-800)
- **Cores principais:**
  - Teal `#1A9D85` — babás
  - Roxo `#7C5BD3` — famílias
  - Coral `#EB5F2D` — CTAs
  - Amarelo `#FFCB30` — acentos
  - Tinta `#0E1620` — texto
- **Espírito:** sério + carinhoso + infantil. Boutique premium pra família.

---

## Contato

Av. Ataulfo de Paiva, 1235 · Sala 303
Leblon · Rio de Janeiro · RJ
(21) 99548-8295
