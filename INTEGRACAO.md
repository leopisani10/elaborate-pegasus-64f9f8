# Dona Baby+ — Guia de Integração

> O que precisa ser feito pra sair dos mockups e ter um site funcional, vivo, recebendo pagamentos via Stripe.

---

## Onde estamos agora

**Pronto:**
- Identidade visual, design system, sistema de cores definidos
- Schema completo do banco (`donababy_schema_v1.sql`)
- 10 telas em HTML/CSS responsivo (mockups visuais, navegáveis entre si)
- Logo PNG com transparência funcionando

**Falta pra ir ao ar:**
1. Você criar 3 contas (Stripe, Supabase, Resend) — todas free tier no começo (Netlify ✓ já tem)
2. Confirmar que o domínio `donababy.com` já tá apontando pro Netlify ✓
3. Conversão dos mockups HTML em app React real (vou fazer, mas precisa do seu ok)
4. Wire-up de auth + Stripe + chat realtime + admin (várias conversas seguintes)

Custo de infra **no primeiro ano**: aproximadamente **R$ 0/mês** (todas em free tier) até passar de uns 1.000 usuários ativos por mês. Custo único: domínio (~R$ 40/ano) e tempo seu nas configurações iniciais.

---

## Conta 1 — Stripe Brasil

**Pra que serve:** processar as assinaturas (R$ 19/mês babá e R$ 29/mês família), gerenciar cobrança recorrente, lidar com cartão expirado, gerar recibos.

### Passos pra você

1. Vá em [stripe.com/br](https://stripe.com/br) e crie uma conta com seu email
2. Verificação de identidade: vão pedir CPF (ou CNPJ se tiver MEI), foto do RG/CNH, selfie. Demora 1-2 dias úteis.
3. Conta bancária pra recebimento: cadastre conta corrente PF ou PJ. O Stripe deposita os pagamentos a cada 7 dias (ou conforme você configurar).
4. No dashboard, vá em **Products** → **Add product**:
   - **Produto 1:** "Plano Babá" — preço recorrente mensal R$ 19,00 (BRL)
   - **Produto 2:** "Plano Família" — preço recorrente mensal R$ 29,00 (BRL)
   - (opcional) "Plano Família Anual" — R$ 290,00 (BRL) recorrente anual
5. Em **Developers** → **API keys**, copie:
   - `Publishable key` (começa com `pk_test_...` ou `pk_live_...`)
   - `Secret key` (começa com `sk_test_...` ou `sk_live_...`)
6. Em **Developers** → **Webhooks**, **prepare** mas ainda não crie o endpoint — fazemos depois quando tivermos a URL do Supabase Edge Function.

### O que me mandar
Depois de configurado, me passa:
- `pk_test_...` (publishable key — não é confidencial, mas peça por chat privado de qualquer forma)
- IDs dos preços criados (formato `price_xxxxxxxxxx`)
- Confirmação de que conta tá verificada e pronta pra cobrar

**Importante:** começamos sempre em **modo teste** (chaves `_test_`). Só viramos pra produção quando o site estiver no ar e validado.

---

## Conta 2 — Supabase

**Pra que serve:** banco de dados (Postgres) + autenticação (login/senha) + storage de arquivos (fotos, documentos) + chat em tempo real.

### Passos pra você

1. Vá em [supabase.com](https://supabase.com) e crie conta (pode logar com GitHub).
2. **Create new project**:
   - Nome: `donababy-prod` (ou `donababy-staging` se quiser ambiente separado)
   - Database password: GERE UMA FORTE e GUARDE em local seguro (1Password, etc.). Você vai precisar disso depois.
   - Região: `East US (North Virginia)` é a mais próxima do Brasil com baixa latência.
   - Pricing: **Free** pra começar.
3. Aguarde 2 minutos a criação do projeto.
4. Vá em **SQL Editor** → **New Query** → cole o conteúdo inteiro do arquivo `donababy_schema_v1.sql` → **Run**.
   - Se rodar sem erro: sucesso, banco montado.
   - Se der erro: tira print e me manda.
5. Vá em **Authentication** → **Providers** → confirme que **Email** está ativo.
   - Em **Auth Settings**, desabilite temporariamente "Confirm email" (vamos religar depois).
6. Vá em **Storage** → **New bucket** → crie dois buckets:
   - `avatars` (público — pra fotos de perfil)
   - `documents` (privado — pra RG, antecedentes, etc.)
7. Em **Settings** → **API**, copie:
   - `Project URL` (formato `https://xxxxx.supabase.co`)
   - `anon public key` (chave longa, OK compartilhar com frontend)
   - `service_role key` (CHAVE MASTER — NUNCA exponha no frontend, é só pra Edge Functions)

### O que me mandar
- Project URL
- `anon public key`
- `service_role key` (por canal privado — não cole em chat público nem em commit)
- Confirmação de que o SQL rodou sem erro

---

## Conta 3 — Netlify (você já tem ✓)

**Pra que serve:** hospedar o site. Deploy automático sempre que você empurrar commit pro GitHub.

### Status atual

- ✓ Conta Netlify já criada
- ✓ Domínio `donababy.com` já apontando pro Netlify
- ✓ Mockups estáticos já no ar (essa entrega)

### Passos pra você (quando virar projeto React)

1. Quando o código React estiver pronto, atualizar build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 20 (definir em variável de ambiente `NODE_VERSION=20`)
2. Adicionar variáveis de ambiente no painel do Netlify (`Site settings` → `Environment variables`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - (a `SUPABASE_SERVICE_ROLE_KEY` e a `STRIPE_SECRET_KEY` vão pro Supabase Edge Functions, NÃO pro Netlify)

### O que me mandar
- Confirmação de que GitHub tá conectado ao Netlify
- Nome do usuário GitHub (pra eu indicar como configurar o repo)

---

## Conta 4 — Resend (email transacional)

**Pra que serve:** mandar emails de:
- Confirmação de cadastro
- Recuperação de senha
- Notificação de nova mensagem
- Recibo de pagamento (o Stripe também manda, mas vamos personalizar)
- Aprovação de cadastro de babá

### Passos pra você

1. Crie conta em [resend.com](https://resend.com).
2. Adicione e verifique o domínio `donababy.com` (ou o que for) em **Domains**. Eles vão te dar registros DNS (DKIM, SPF) pra adicionar onde o domínio tá hospedado.
3. Em **API Keys**, gere uma key.

### O que me mandar
- API key do Resend
- Confirmação de que o domínio foi verificado

**Alternativa mais barata pra começar:** se ainda não tem o domínio configurado, dá pra usar o Resend pelo `onboarding@resend.dev` (subdomínio deles) só pra testar. Quando tiver o domínio próprio, migra.

---

## Conta 5 — Domínio (`donababy.com` ou similar)

**Pra que serve:** o endereço público do site.

### Passos pra você

1. Você já mencionou ter o domínio "dona baby". **Confirma**:
   - O domínio ainda tá registrado (não expirou)?
   - É `.com.br`, `.com`, ou outro?
   - Onde tá registrado (Registro.br, GoDaddy, Hostinger)?
2. Se expirou, registre de novo no [Registro.br](https://registro.br) — custa cerca de R$ 40/ano pra `.com.br`.
3. Depois que o Netlify tiver o projeto, configuramos o DNS pra apontar o domínio.

---

## Ordem de operações daqui pra frente

1. **Você** cria as 4 contas e me manda o que pedi acima
2. **Eu** monto o projeto React (Vite + TypeScript + Tailwind + Supabase client + Stripe SDK)
3. **Eu** converto as 10 telas HTML em componentes React funcionais, mantendo o design 1:1
4. **Eu** implemento auth (signup, login, recover password)
5. **Eu** implemento onboarding (babá + família) com upload pro Supabase Storage
6. **Eu** implemento busca, filtros e perfil
7. **Eu** implemento chat com Supabase Realtime
8. **Eu** implemento Stripe Checkout + Customer Portal + Webhook handler (Supabase Edge Function)
9. **Eu** implemento painel admin pra aprovar babás
10. **Nós** fazemos deploy no Netlify, conectamos domínio, configuramos webhook do Stripe pra apontar pro endpoint do Supabase
11. **Você** testa, eu corrijo, repete
12. **Nós** viramos o Stripe pra modo produção
13. **Lançamento.**

Cada item entre 3 e 9 é umas 2-4 conversas comigo. Total estimado: 20-30 conversas até estar pronto pra lançar. Não precisa fazer tudo de uma vez — dá pra evoluir por fases.

---

## O que decidir antes de começar a fase de código

Algumas decisões de produto que ficaram pendentes ou viraram placeholder. Confirma com sim/não/outro:

| Decisão | Valor atual (placeholder) | Sua resposta? |
|---|---|---|
| Preço plano babá | R$ 19/mês | ___ |
| Preço plano família | R$ 29/mês | ___ |
| Tem plano anual? | Sim, com 17% desconto | ___ |
| Trial grátis? | Não (paga no dia 1) | ___ |
| Bairros que cobre no lançamento | Zona Sul + Tijuca + Barra | ___ |
| Endereço fiscal/contato | Av. Ataulfo de Paiva, 1235 (Leblon) | ___ |
| Email de contato | contato@donababy.com | ___ |
| WhatsApp de suporte | (21) 99548-8295 | ___ |
| Logo é definitiva? | Sim, vamos usar essa | ___ |

---

## Custos esperados (ano 1)

| Item | Custo mensal | Anual |
|---|---|---|
| Domínio | R$ 0 | R$ 40 |
| Stripe (taxa por venda) | 3.99% + R$ 0,39 por transação | varia |
| Supabase | R$ 0 (free tier até ~50k usuários) | R$ 0 |
| Netlify | R$ 0 (free tier sobra) | R$ 0 |
| Resend | R$ 0 (3.000 emails/mês grátis) | R$ 0 |
| **Total fixo** | ~R$ 0 | ~R$ 40 |

Quando crescer:
- Supabase Pro: US$ 25/mês (~R$ 130) quando passar de 50k usuários ativos ou precisar de backups diários
- Netlify Pro: US$ 20/mês (~R$ 105) quando precisar de mais bandwidth
- Resend pago: US$ 20/mês (~R$ 105) quando passar de 3.000 emails/mês

Cenário realista: durante todo o MVP e validação, **custo de infra ≈ R$ 0**. Só Stripe que tira percentual de cada venda, mas só quando você fatura.

---

## Próximo passo concreto

Quando você terminar de:
1. Criar a conta Stripe e os 2 produtos lá dentro
2. Criar o projeto Supabase, rodar o SQL, criar os buckets de Storage
3. Criar a conta Resend e verificar o domínio
4. Confirmar que GitHub já tá conectado ao Netlify do `donababy.com`

Me manda nesta ordem (em mensagem separada por segurança):
- Project URL Supabase + anon key
- Service role key Supabase (em mensagem separada)
- Publishable key Stripe + price IDs
- API key Resend
- Usuário GitHub

**A partir disso, eu monto o projeto React e a gente faz a primeira tela funcional juntos.**

---

## Dúvidas que costumam aparecer

**1. Posso fazer eu mesmo, sem você?**
Tecnicamente sim — todo o código será aberto e você terá acesso. Na prática, sem experiência prévia em React + Supabase + Stripe, é difícil. O acompanhamento aqui acelera tudo.

**2. E se eu quiser parar no meio?**
A qualquer momento, o código fica seu. Os mockups que já te entreguei também. Você não fica preso a mim.

**3. E se eu quiser contratar um dev pra acelerar?**
Perfeito. O dev pega tudo que já temos (schema SQL, mockups HTML, este documento) e segue. Boa contratação: full-stack júnior com experiência em React + Supabase, R$ 4-8k de salário no Rio.

**4. Quando posso lançar?**
Realista: 6-10 semanas a partir do momento em que as contas estiverem prontas. Crítico do caminho: tempo de verificação do Stripe (1-2 dias úteis), aprovação das primeiras babás (manual), validação de fluxos.

**5. Posso lançar antes mesmo de ter babás cadastradas?**
Não recomendo. Sem supply visível, a primeira família que entrar vai sair frustrada. Estratégia: rodar uma campanha de captação de babás 2-3 semanas antes de abrir pras famílias. "Inscreva-se grátis, primeiras 50 babás aprovadas têm o primeiro mês grátis", por exemplo.

---

*Documento vivo. Atualizado conforme avançamos.*
