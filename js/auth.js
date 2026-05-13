// =============================================
// Dona Baby+ — Auth + DB helpers
// =============================================

const SUPABASE_URL = 'https://cvvdmgoyvozzjsrswyzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmRtZ295dm96empzcnN3eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUyNjMsImV4cCI6MjA5NDIyMTI2M30.AfVR9iNjctz8mCdvF12N88fwivL9DjTnTbLkXcsBCr0';

// IMPORTANTE: usar nome diferente de 'supabase' pra não conflitar
// com a global que o SDK CDN expõe.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.dbClient = db;

// =============================================
// UI HELPERS
// =============================================

function showError(message) { alert('Ops: ' + message); }
function showSuccess(message) { alert(message); }

function setLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'wait';
    button.innerHTML = 'Aguarde...';
  } else {
    button.disabled = false;
    button.style.opacity = '';
    button.style.cursor = '';
    if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
  }
}

// =============================================
// AUTH
// =============================================

async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) { console.error('getCurrentProfile error:', error); return null; }
  return data;
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = '/';
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) { window.location.href = '/login.html'; return null; }
  return user;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.user_type !== 'admin') {
    alert('Acesso negado. Essa página é só pra administradores.');
    window.location.href = '/';
    return null;
  }
  return profile;
}

async function redirectToDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) { window.location.href = '/login.html'; return; }

  if (profile.user_type === 'admin') {
    window.location.href = '/admin.html';
    return;
  }

  if (profile.user_type === 'baba') {
    // Babá: 1) preenche perfil → 2) pricing → 3) aguarda aprovação → 4) families
    const baba = await getBabaProfile(profile.id);
    if (!baba || !baba.bio) {
      window.location.href = '/onboarding-baba.html';
      return;
    }

    // Já preencheu perfil. Tem subscription?
    const sub = await getMySubscription();
    if (!isSubActive(sub)) {
      window.location.href = '/pricing.html';
      return;
    }

    // Tem sub. Tá aprovada?
    if (baba.approval_status === 'pending') {
      window.location.href = '/onboarding-baba.html?status=pending';
      return;
    }
    if (baba.approval_status === 'rejected') {
      window.location.href = '/onboarding-baba.html?status=rejected';
      return;
    }
    // Aprovada e com sub → buscar famílias
    window.location.href = '/families.html';
    return;
  }

  // Família: 1) preenche perfil → 2) pricing → 3) dashboard
  const parent = await getParentProfile(profile.id);
  if (!parent || !parent.children_count) {
    window.location.href = '/onboarding-familia.html';
    return;
  }
  const sub = await getMySubscription();
  if (!isSubActive(sub)) {
    window.location.href = '/pricing.html';
    return;
  }
  window.location.href = '/dashboard.html';
}

// =============================================
// BABÁ PROFILE
// =============================================

async function getBabaProfile(userId) {
  const { data, error } = await db
    .from('baba_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) { console.error('getBabaProfile error:', error); return null; }
  return data;
}

async function upsertBabaProfile(userId, fields, opts = {}) {
  // Por padrão volta pra pending (cadastro inicial). Em edição passa { forcePending: false }.
  const updates = { ...fields, updated_at: new Date().toISOString() };
  if (opts.forcePending !== false) {
    updates.approval_status = 'pending';
  }
  const { data, error } = await db
    .from('baba_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('upsertBabaProfile error:', error);
    throw error;
  }
  return data;
}

async function getApprovedBabas(filters = {}) {
  let query = db
    .from('baba_profiles')
    .select(`
      *,
      profiles!baba_profiles_id_fkey(full_name, avatar_url)
    `)
    .eq('approval_status', 'approved');

  if (filters.neighborhoods && filters.neighborhoods.length > 0) {
    query = query.overlaps('neighborhoods', filters.neighborhoods);
  } else if (filters.neighborhood) {
    query = query.contains('neighborhoods', [filters.neighborhood]);
  }
  if (filters.minPrice) query = query.gte('hourly_rate', filters.minPrice);
  if (filters.maxPrice) query = query.lte('hourly_rate', filters.maxPrice);

  if (filters.specialties && filters.specialties.length > 0) {
    query = query.overlaps('specialties', filters.specialties);
  }
  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages);
  }
  if (filters.certifications && filters.certifications.length > 0) {
    query = query.overlaps('certifications', filters.certifications);
  }
  if (filters.hasCnh) query = query.eq('has_cnh', true);
  if (filters.hasVehicle) query = query.eq('has_vehicle', true);
  if (filters.acceptsOvernight) query = query.eq('accepts_overnight', true);
  if (filters.acceptsTravel) query = query.eq('accepts_travel', true);
  if (filters.nonSmoker) query = query.eq('is_smoker', false);
  if (filters.hasPassport) query = query.eq('has_passport', 'yes');
  if (filters.hasOwnChildren === true) query = query.eq('has_own_children', true);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) { console.error('getApprovedBabas error:', error); return []; }
  return data || [];
}

async function getBabaById(babaId) {
  const { data, error } = await db
    .from('baba_profiles')
    .select(`
      *,
      profiles!baba_profiles_id_fkey(full_name, avatar_url, phone)
    `)
    .eq('id', babaId)
    .single();
  if (error) { console.error('getBabaById error:', error); return null; }
  return data;
}

// =============================================
// ADMIN — APROVAÇÕES
// =============================================

async function getPendingBabas() {
  const { data, error } = await db
    .from('baba_profiles')
    .select(`
      *,
      profiles!baba_profiles_id_fkey(full_name, email, phone, avatar_url)
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });
  if (error) { console.error('getPendingBabas error:', error); return []; }
  return data || [];
}

async function approveBaba(babaId) {
  const { data, error } = await db
    .from('baba_profiles')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', babaId)
    .select()
    .single();
  if (error) { console.error('approveBaba error:', error); throw error; }
  return data;
}

async function rejectBaba(babaId, reason) {
  const { data, error } = await db
    .from('baba_profiles')
    .update({
      approval_status: 'rejected',
      rejection_reason: reason || 'Sem motivo especificado',
    })
    .eq('id', babaId)
    .select()
    .single();
  if (error) { console.error('rejectBaba error:', error); throw error; }
  return data;
}

// =============================================
// PARENT PROFILE
// =============================================

async function getParentProfile(userId) {
  const { data, error } = await db
    .from('parent_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) { console.error('getParentProfile error:', error); return null; }
  return data;
}

async function upsertParentProfile(userId, fields) {
  const { data, error } = await db
    .from('parent_profiles')
    .update({
      ...fields,
      is_searching: fields.is_searching !== false,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('upsertParentProfile error:', error);
    throw error;
  }
  return data;
}

async function getActiveFamilies() {
  const { data, error } = await db
    .from('parent_profiles')
    .select(`
      *,
      profiles!parent_profiles_id_fkey(full_name, avatar_url)
    `)
    .eq('is_searching', true)
    .not('children_count', 'is', null)
    .order('created_at', { ascending: false });
  if (error) { console.error('getActiveFamilies error:', error); return []; }
  return data || [];
}

async function getFamilyById(parentId) {
  const { data, error } = await db
    .from('parent_profiles')
    .select(`
      *,
      profiles!parent_profiles_id_fkey(full_name, avatar_url, phone)
    `)
    .eq('id', parentId)
    .single();
  if (error) { console.error('getFamilyById error:', error); return null; }
  return data;
}

// =============================================
// CHAT
// =============================================

// Encontra conversa existente ou cria uma nova entre eu e outro user.
// Determina automaticamente quem é parent e quem é babá baseado nos tipos.
async function getOrCreateConversation(otherUserId) {
  const me = await getCurrentUser();
  if (!me) throw new Error('Não logado');

  const myProfile = await getCurrentProfile();
  if (!myProfile) throw new Error('Sem profile');

  // Busca o profile do outro pra saber quem é qual
  const { data: otherProfile, error: otherErr } = await db
    .from('profiles')
    .select('id, user_type')
    .eq('id', otherUserId)
    .single();
  if (otherErr || !otherProfile) throw new Error('Outro usuário não encontrado');

  let parentId, babaId;
  if (myProfile.user_type === 'parent' && otherProfile.user_type === 'baba') {
    parentId = me.id;
    babaId = otherProfile.id;
  } else if (myProfile.user_type === 'baba' && otherProfile.user_type === 'parent') {
    parentId = otherProfile.id;
    babaId = me.id;
  } else {
    throw new Error('Conversa só entre família e babá');
  }

  // Tenta achar conversa existente
  const { data: existing } = await db
    .from('conversations')
    .select('*')
    .eq('parent_id', parentId)
    .eq('baba_id', babaId)
    .maybeSingle();

  if (existing) return existing;

  // Cria nova
  const { data: newConv, error: createErr } = await db
    .from('conversations')
    .insert({ parent_id: parentId, baba_id: babaId })
    .select()
    .single();

  if (createErr) {
    console.error('createConversation error:', createErr);
    throw createErr;
  }
  return newConv;
}

async function getMyConversations() {
  const me = await getCurrentUser();
  if (!me) return [];

  const { data, error } = await db
    .from('conversations')
    .select('*')
    .or(`parent_id.eq.${me.id},baba_id.eq.${me.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) { console.error('getMyConversations error:', error); return []; }
  return data || [];
}

// Pega o profile do "outro" lado de uma conversa
async function getOtherParticipant(conversation) {
  const me = await getCurrentUser();
  if (!me) return null;
  const otherId = conversation.parent_id === me.id ? conversation.baba_id : conversation.parent_id;
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('id', otherId)
    .single();
  return data;
}

async function getMessages(conversationId) {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getMessages error:', error); return []; }
  return data || [];
}

async function sendMessage(conversationId, content) {
  const me = await getCurrentUser();
  if (!me) throw new Error('Não logado');
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: me.id,
      content: content.trim(),
    })
    .select()
    .single();
  if (error) { console.error('sendMessage error:', error); throw error; }
  return data;
}

// Subscribe a novas mensagens via Supabase Realtime.
// Retorna o channel pra você poder unsubscribe depois.
function subscribeToMessages(conversationId, onNewMessage) {
  const channel = db
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();
  return channel;
}

function unsubscribe(channel) {
  if (channel) db.removeChannel(channel);
}

// =============================================
// SUBSCRIPTION
// =============================================

// Pega minha subscription mais recente (null se não tem nenhuma)
// IMPORTANTE: não usa maybeSingle pra evitar bug quando user tem >1 row (ex: incomplete antiga + trialing nova)
async function getMySubscription() {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[DonaBaby] getMySubscription error:', error);
    return null;
  }
  const sub = (data && data[0]) || null;
  console.log('[DonaBaby] getMySubscription returned:', sub);
  return sub;
}

// Retorna true se a sub é trial OU active.
// Tolerante: se datas estão null/inválidas mas status é trialing/active, considera ativa.
function isSubActive(sub) {
  if (!sub) return false;
  if (!['active', 'trialing'].includes(sub.status)) return false;
  const now = new Date();
  // Se as datas estão null, dá benefício da dúvida — webhook pode ter chegado parcial
  if (sub.status === 'trialing') {
    if (sub.trial_end && new Date(sub.trial_end) < now) return false;
    return true; // trial_end null tudo bem
  }
  if (sub.status === 'active') {
    if (sub.current_period_end && new Date(sub.current_period_end) < now) return false;
    return true; // current_period_end null tudo bem
  }
  return true;
}

// Bloqueio rápido: chamado antes de ações que exigem sub.
// Se não tem, redireciona pro pricing.
async function requireActiveSubscription() {
  const sub = await getMySubscription();
  if (!isSubActive(sub)) {
    window.location.href = '/pricing.html';
    return false;
  }
  return true;
}

// Força sync da subscription com o Stripe (fallback se webhook falhou)
// Retorna { synced, status, plan_name, error }
async function syncSubscription() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return { error: 'Sem sessão' };

    // Pega URL do supabase a partir do db.supabaseUrl
    const SUPABASE_URL = db.supabaseUrl || 'https://cvvdmgoyvozzjsrswyzg.supabase.co';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[DonaBaby] syncSubscription failed:', data);
      return { error: data.error || data.message || 'Erro' };
    }
    console.log('[DonaBaby] syncSubscription:', data);
    return data;
  } catch (err) {
    console.error('[DonaBaby] syncSubscription error:', err);
    return { error: err.message };
  }
}

// =============================================
// MODAL DE PAYWALL/AVISO (cores Dona Baby+)
// =============================================

// Mostra modal customizado em vez de alert() feio.
// type: 'pending' | 'paywall' | 'info'
// Retorna promise — resolve quando fecha
function showDbModal({ type = 'info', title, message, primaryLabel, primaryHref, secondaryLabel, secondaryHref } = {}) {
  return new Promise((resolve) => {
    // Remove modal anterior se houver
    const existing = document.getElementById('dbModalOverlay');
    if (existing) existing.remove();

    const colors = {
      pending: { bg: '#FFF7E6', icon: '#B5530F', accent: 'var(--cta)' },
      paywall: { bg: 'var(--cta-soft)', icon: 'var(--cta)', accent: 'var(--cta)' },
      info: { bg: 'var(--baba-soft)', icon: 'var(--baba-deep)', accent: 'var(--baba)' },
    };
    const c = colors[type] || colors.info;

    const icons = {
      pending: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      paywall: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const overlay = document.createElement('div');
    overlay.id = 'dbModalOverlay';
    overlay.innerHTML = `
      <style>
        #dbModalOverlay {
          position: fixed; inset: 0; background: rgba(14, 22, 32, 0.55);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
          padding: 20px; opacity: 0; transition: opacity 0.2s ease;
          font-family: 'Poppins', sans-serif;
        }
        #dbModalOverlay.show { opacity: 1; }
        .db-modal-card {
          background: white; border-radius: 24px;
          max-width: 440px; width: 100%;
          padding: 32px 28px 24px;
          transform: scale(0.95); transition: transform 0.2s ease;
          box-shadow: 0 20px 60px -10px rgba(0,0,0,0.25);
        }
        #dbModalOverlay.show .db-modal-card { transform: scale(1); }
        .db-modal-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: ${c.bg}; color: ${c.icon};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .db-modal-title {
          font-size: 22px; font-weight: 800;
          letter-spacing: -0.025em; text-align: center;
          margin-bottom: 12px; color: var(--ink, #0E1620);
          line-height: 1.2;
        }
        .db-modal-msg {
          color: var(--ink-2, #3C4452); font-size: 15px;
          line-height: 1.6; text-align: center;
          margin-bottom: 24px;
        }
        .db-modal-msg strong { color: var(--ink, #0E1620); font-weight: 700; }
        .db-modal-actions {
          display: flex; flex-direction: column; gap: 8px;
        }
        .db-modal-btn {
          padding: 13px 22px; border-radius: 999px;
          font-family: inherit; font-size: 14px; font-weight: 700;
          text-align: center; text-decoration: none; cursor: pointer;
          border: none; transition: all 0.15s;
        }
        .db-modal-btn-pri {
          background: ${c.accent}; color: white;
        }
        .db-modal-btn-pri:hover { filter: brightness(0.92); }
        .db-modal-btn-sec {
          background: white; color: var(--ink, #0E1620);
          border: 1.5px solid var(--line-strong, #DDDFE3);
        }
        .db-modal-btn-sec:hover { background: var(--bg-soft, #F6F7F9); }
      </style>
      <div class="db-modal-card">
        <div class="db-modal-icon">${icons[type] || icons.info}</div>
        <div class="db-modal-title">${title || ''}</div>
        <div class="db-modal-msg">${message || ''}</div>
        <div class="db-modal-actions">
          ${primaryLabel ? `<a class="db-modal-btn db-modal-btn-pri" href="${primaryHref || '#'}">${primaryLabel}</a>` : ''}
          ${secondaryLabel ? `<button class="db-modal-btn db-modal-btn-sec" id="dbModalClose">${secondaryLabel}</button>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    function close() {
      overlay.classList.remove('show');
      setTimeout(() => { overlay.remove(); resolve(); }, 200);
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const closeBtn = overlay.querySelector('#dbModalClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });
  });
}

// =============================================
// AVATAR UPLOAD
// =============================================

// Faz upload de arquivo pro bucket 'avatars' e atualiza profile.avatar_url
async function uploadAvatar(file, userId) {
  if (!file) throw new Error('Sem arquivo');
  if (!userId) throw new Error('Sem userId');

  // Validações básicas
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Imagem muito grande. Máximo 5MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo precisa ser uma imagem.');
  }

  // Nome do arquivo: userId/timestamp.ext (cache busting)
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  // Upload no bucket
  const { error: upErr } = await db.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (upErr) {
    console.error('Upload err:', upErr);
    throw upErr;
  }

  // Pega URL pública
  const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(path);

  // Atualiza profile
  const { error: updErr } = await db
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updErr) {
    console.error('Update profile err:', updErr);
    throw updErr;
  }

  return publicUrl;
}

// Cria componente HTML de avatar (img se url, senão inicial)
function avatarHTML(profile, size = 40, classes = '') {
  const sizeStyle = `width:${size}px; height:${size}px; font-size:${Math.max(11, size/3)}px;`;
  if (profile?.avatar_url) {
    return `<div class="db-avatar ${classes}" style="${sizeStyle} border-radius:50%; overflow:hidden; display:inline-flex; align-items:center; justify-content:center;">
      <img src="${profile.avatar_url}" alt="" style="width:100%; height:100%; object-fit:cover;">
    </div>`;
  }
  const initial = (profile?.full_name || '?').charAt(0).toUpperCase();
  return `<div class="db-avatar ${classes}" style="${sizeStyle} border-radius:50%; background:var(--baba); color:white; font-weight:700; display:inline-flex; align-items:center; justify-content:center;">${initial}</div>`;
}

// =============================================
// DOCUMENTS (uploads privados)
// =============================================

async function uploadDocument(file, userId, docType = 'criminal_record') {
  if (!file) throw new Error('Sem arquivo');
  if (!userId) throw new Error('Sem userId');
  if (file.size > 10 * 1024 * 1024) throw new Error('Documento muito grande. Máximo 10MB.');

  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!allowed.includes(file.type)) {
    throw new Error('Formato inválido. Aceita PDF, JPG ou PNG.');
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;

  const { error: upErr } = await db.storage
    .from('documents')
    .upload(path, file, { upsert: false, cacheControl: '3600' });
  if (upErr) throw upErr;

  // Cria registro na tabela documents
  const { data, error } = await db
    .from('documents')
    .insert({
      user_id: userId,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyDocuments() {
  const me = await getCurrentUser();
  if (!me) return [];
  const { data, error } = await db
    .from('documents')
    .select('*')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('getMyDocuments:', error); return []; }
  return data || [];
}

async function getSignedDocUrl(filePath) {
  if (!filePath) return null;
  const { data, error } = await db.storage
    .from('documents')
    .createSignedUrl(filePath, 60 * 60); // válido por 1h
  if (error) { console.error('getSignedDocUrl:', error); return null; }
  return data?.signedUrl || null;
}

async function deleteMyDocument(docId, filePath) {
  // Apaga storage
  if (filePath) {
    await db.storage.from('documents').remove([filePath]);
  }
  // Apaga registro
  const { error } = await db.from('documents').delete().eq('id', docId);
  if (error) throw error;
}

// CPF: validação de dígito verificador
function isValidCPF(cpf) {
  if (!cpf) return false;
  const cleaned = String(cpf).replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleaned[10])) return false;

  return true;
}

function formatCPF(cpf) {
  const cleaned = String(cpf || '').replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0,3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0,3)}.${cleaned.slice(3,6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0,3)}.${cleaned.slice(3,6)}.${cleaned.slice(6,9)}-${cleaned.slice(9)}`;
}

function formatCEP(cep) {
  const cleaned = String(cep || '').replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0,5)}-${cleaned.slice(5)}`;
}

// Busca CEP via API ViaCEP (gratuita, sem auth)
async function lookupCEP(cep) {
  const cleaned = String(cep || '').replace(/\D/g, '');
  if (cleaned.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      cep: data.cep,
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      complement: data.complemento,
    };
  } catch (err) {
    console.error('lookupCEP error:', err);
    return null;
  }
}

// =============================================
// CONSTANTES — bairros, idiomas, certificações
// =============================================

const RIO_NEIGHBORHOODS = {
  'Zona Sul': [
    'Leblon', 'Ipanema', 'Copacabana', 'Lagoa', 'Botafogo', 'Flamengo',
    'Laranjeiras', 'Gávea', 'Jardim Botânico', 'Humaitá', 'Urca',
    'Glória', 'Catete', 'Cosme Velho', 'São Conrado', 'Vidigal',
  ],
  'Zona Norte/Central': [
    'Tijuca', 'Vila Isabel', 'Grajaú', 'Méier', 'Engenho Novo', 'Maracanã',
    'Praça da Bandeira', 'Andaraí', 'Cachambi', 'Centro', 'Santa Teresa',
  ],
  'Barra e Oeste': [
    'Barra da Tijuca', 'Recreio', 'Jacarepaguá', 'Itanhangá',
    'Joá', 'Camorim', 'Vargem Grande', 'Freguesia',
  ],
  'Niterói': [
    'Icaraí', 'Santa Rosa', 'Ingá', 'Boa Viagem', 'São Francisco', 'Charitas',
  ],
};

const LANGUAGES = [
  { value: 'portugues', label: 'Português' },
  { value: 'ingles', label: 'Inglês' },
  { value: 'espanhol', label: 'Espanhol' },
  { value: 'frances', label: 'Francês' },
  { value: 'libras', label: 'Libras' },
];

const CERTIFICATIONS = [
  { value: 'primeiros-socorros', label: 'Primeiros Socorros' },
  { value: 'cuidador-rn', label: 'Cuidados com Recém-Nascido' },
  { value: 'pedagogia', label: 'Pedagogia' },
  { value: 'enfermagem', label: 'Enfermagem' },
  { value: 'tec-enfermagem', label: 'Técnico em Enfermagem' },
  { value: 'cuidador-especial', label: 'Cuidados Especiais (autismo, TDAH)' },
  { value: 'manobra-heimlich', label: 'Manobra de Heimlich' },
  { value: 'amamentacao', label: 'Apoio à Amamentação' },
];

// =============================================
// EXPORT
// =============================================

window.dbHelpers = {
  getCurrentUser, getCurrentProfile, signOut, requireAuth, requireAdmin, redirectToDashboard,
  getBabaProfile, upsertBabaProfile, getApprovedBabas, getBabaById,
  getParentProfile, upsertParentProfile, getActiveFamilies, getFamilyById,
  getPendingBabas, approveBaba, rejectBaba,
  getOrCreateConversation, getMyConversations, getOtherParticipant,
  getMessages, sendMessage, subscribeToMessages, unsubscribe,
  getMySubscription, isSubActive, requireActiveSubscription, syncSubscription,
  uploadAvatar, avatarHTML, showDbModal,
  uploadDocument, getMyDocuments, getSignedDocUrl, deleteMyDocument,
  isValidCPF, formatCPF, formatCEP, lookupCEP,
  RIO_NEIGHBORHOODS, LANGUAGES, CERTIFICATIONS,
  showError, showSuccess, setLoading,
};
