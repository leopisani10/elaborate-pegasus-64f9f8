-- =====================================================
-- Dona Baby — Schema inicial (Fase 1)
-- Executar no Supabase SQL Editor de uma vez só.
-- Idempotente NÃO: rode em projeto novo ou faça reset antes.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_type AS ENUM ('parent', 'baba', 'admin');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled',
  'unpaid', 'incomplete', 'incomplete_expired', 'paused'
);

CREATE TYPE suggestion_status AS ENUM ('pending', 'viewed', 'contacted', 'dismissed');

-- =====================================================
-- TABELAS
-- =====================================================

-- profiles: estende auth.users com info de aplicação
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- baba_profiles: dados específicos da babá
CREATE TABLE baba_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  experience_years INT CHECK (experience_years >= 0),
  hourly_rate NUMERIC(10,2),
  daily_rate NUMERIC(10,2),
  availability JSONB,                          -- {mon: ['08:00-18:00'], tue: [...]}
  has_car BOOLEAN DEFAULT FALSE,
  smokes BOOLEAN DEFAULT FALSE,
  certifications TEXT[],
  languages TEXT[],
  age_groups TEXT[],                           -- ['newborn','infant','toddler','school_age']
  references_text TEXT,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  documents_uploaded BOOLEAN DEFAULT FALSE,
  rg_url TEXT,
  cpf TEXT,                                    -- considere hash ou só últimos 4 dígitos depois
  background_check_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- parent_profiles: dados específicos da família
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  family_description TEXT,
  kids_count INT CHECK (kids_count >= 0),
  kids_ages INT[],
  neighborhood TEXT,
  preferences TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subscriptions: sincronizado do Stripe via webhook (service role only)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, status, current_period_end);

-- match_suggestions: curadoria feita pelo admin
CREATE TABLE match_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  baba_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_by UUID NOT NULL REFERENCES profiles(id),
  admin_note TEXT,
  status suggestion_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, baba_id)
);

CREATE INDEX idx_suggestions_parent ON match_suggestions(parent_id, status);

-- conversations: 1 conversa por par (pai, babá)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  baba_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, baba_id)
);

CREATE INDEX idx_conversations_parent ON conversations(parent_id, last_message_at DESC);
CREATE INDEX idx_conversations_baba ON conversations(baba_id, last_message_at DESC);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = p_user_id AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_baba_visible(p_baba_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM baba_profiles bp
    WHERE bp.id = p_baba_id
      AND bp.approval_status = 'approved'
      AND has_active_subscription(bp.id)
  );
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- updated_at automation
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_baba_profiles_updated_at
  BEFORE UPDATE ON baba_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_parent_profiles_updated_at
  BEFORE UPDATE ON parent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-criação de profile + sub-perfil ao signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type user_type;
BEGIN
  v_user_type := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::user_type,
    'parent'
  );

  INSERT INTO profiles (id, user_type, full_name, email)
  VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  IF v_user_type = 'baba' THEN
    INSERT INTO baba_profiles (id) VALUES (NEW.id);
  ELSIF v_user_type = 'parent' THEN
    INSERT INTO parent_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Atualiza last_message_at da conversa quando msg nova chega
CREATE OR REPLACE FUNCTION bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_last_message();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE baba_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------
CREATE POLICY "users see own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "authenticated users see visible babás"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_type = 'baba'
    AND is_baba_visible(id)
  );

CREATE POLICY "users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins read all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "admins update profiles"
  ON profiles FOR UPDATE
  USING (is_admin(auth.uid()));

-- ---------- baba_profiles ----------
CREATE POLICY "babá reads own data"
  ON baba_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "authenticated users see approved + paying babás"
  ON baba_profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND approval_status = 'approved'
    AND has_active_subscription(id)
  );

CREATE POLICY "babá updates own profile"
  ON baba_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- babá não pode alterar próprio status de aprovação
    AND approval_status = (SELECT approval_status FROM baba_profiles WHERE id = auth.uid())
  );

CREATE POLICY "admins manage all babá profiles"
  ON baba_profiles FOR ALL
  USING (is_admin(auth.uid()));

-- ---------- parent_profiles ----------
CREATE POLICY "parent reads own profile"
  ON parent_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "parent updates own profile"
  ON parent_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins read parent profiles"
  ON parent_profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- ---------- subscriptions ----------
-- INSERT/UPDATE só via service role (webhook). Sem policy = sem acesso de cliente.
CREATE POLICY "users read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all subscriptions"
  ON subscriptions FOR SELECT
  USING (is_admin(auth.uid()));

-- ---------- match_suggestions ----------
CREATE POLICY "parents read own suggestions"
  ON match_suggestions FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "parents update suggestion status"
  ON match_suggestions FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "admins manage suggestions"
  ON match_suggestions FOR ALL
  USING (is_admin(auth.uid()));

-- ---------- conversations ----------
CREATE POLICY "participants see conversations"
  ON conversations FOR SELECT
  USING (auth.uid() IN (parent_id, baba_id));

CREATE POLICY "subscribed participants create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IN (parent_id, baba_id)
    AND has_active_subscription(auth.uid())
  );

CREATE POLICY "admins read all conversations"
  ON conversations FOR SELECT
  USING (is_admin(auth.uid()));

-- ---------- messages ----------
CREATE POLICY "participants read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND auth.uid() IN (conversations.parent_id, conversations.baba_id)
    )
  );

CREATE POLICY "subscribed participants send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND has_active_subscription(auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
        AND auth.uid() IN (conversations.parent_id, conversations.baba_id)
    )
  );

CREATE POLICY "participants mark messages read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND auth.uid() IN (conversations.parent_id, conversations.baba_id)
    )
  )
  WITH CHECK (sender_id != auth.uid());

-- =====================================================
-- REALTIME (para chat em tempo real)
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- =====================================================
-- PRIMEIRO ADMIN (rode manualmente DEPOIS de criar sua conta)
-- =====================================================
-- 1. Crie sua conta normalmente pelo app (signup)
-- 2. Pegue o seu user UUID em auth.users
-- 3. Rode:
--    UPDATE profiles SET user_type = 'admin' WHERE email = 'seu-email@dominio.com';
