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
  if (profile.user_type === 'baba') {
    const baba = await getBabaProfile(profile.id);
    if (!baba || !baba.bio) {
      window.location.href = '/onboarding-baba.html';
    } else if (baba.approval_status === 'pending') {
      window.location.href = '/onboarding-baba.html?status=pending';
    } else {
      // Babá aprovada vai buscar famílias
      window.location.href = '/families.html';
    }
  } else if (profile.user_type === 'admin') {
    window.location.href = '/admin.html';
  } else {
    // Família: se ainda não preencheu perfil, manda pra onboarding
    const parent = await getParentProfile(profile.id);
    if (!parent || !parent.children_count) {
      window.location.href = '/onboarding-familia.html';
    } else {
      window.location.href = '/dashboard.html';
    }
  }
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

async function upsertBabaProfile(userId, fields) {
  const { data, error } = await db
    .from('baba_profiles')
    .update({
      ...fields,
      approval_status: 'pending',
    })
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

  if (filters.neighborhood) {
    query = query.contains('neighborhoods', [filters.neighborhood]);
  }
  if (filters.minPrice) query = query.gte('hourly_rate', filters.minPrice);
  if (filters.maxPrice) query = query.lte('hourly_rate', filters.maxPrice);

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

// Pega minha subscription (null se não tem)
async function getMySubscription() {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', me.id)
    .maybeSingle();
  if (error) { console.error('getMySubscription:', error); return null; }
  return data;
}

// Retorna true se a sub é trial OU active e não venceu
function isSubActive(sub) {
  if (!sub) return false;
  if (!['active', 'trialing'].includes(sub.status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
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
  getMySubscription, isSubActive, requireActiveSubscription,
  showError, showSuccess, setLoading,
};
