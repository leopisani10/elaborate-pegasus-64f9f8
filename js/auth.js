// =============================================
// Dona Baby+ — Auth + DB helpers
// =============================================

const SUPABASE_URL = 'https://cvvdmgoyvozzjsrswyzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmRtZ295dm96empzcnN3eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUyNjMsImV4cCI6MjA5NDIyMTI2M30.AfVR9iNjctz8mCdvF12N88fwivL9DjTnTbLkXcsBCr0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.dbClient = supabase;

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
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) { console.error('getCurrentProfile error:', error); return null; }
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
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
    // Se babá ainda não preencheu perfil, manda pro onboarding
    const baba = await getBabaProfile(profile.id);
    if (!baba || !baba.bio) {
      window.location.href = '/onboarding-baba.html';
    } else if (baba.approval_status === 'pending') {
      window.location.href = '/onboarding-baba.html?status=pending';
    } else {
      window.location.href = '/account.html';
    }
  } else if (profile.user_type === 'admin') {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/dashboard.html';
  }
}

// =============================================
// BABÁ PROFILE
// =============================================

async function getBabaProfile(userId) {
  const { data, error } = await supabase
    .from('baba_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) { console.error('getBabaProfile error:', error); return null; }
  return data;
}

async function upsertBabaProfile(userId, fields) {
  // O trigger handle_new_user já criou um baba_profiles vazio.
  // Aqui só atualizamos com os dados do form.
  const { data, error } = await supabase
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
  let query = supabase
    .from('baba_profiles')
    .select(`
      *,
      profiles!inner(full_name, avatar_url)
    `)
    .eq('approval_status', 'approved');

  // Aplica filtros opcionais
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
  const { data, error } = await supabase
    .from('baba_profiles')
    .select(`
      *,
      profiles!inner(full_name, avatar_url, phone)
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
  const { data, error } = await supabase
    .from('baba_profiles')
    .select(`
      *,
      profiles!inner(full_name, email, phone, avatar_url)
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });
  if (error) { console.error('getPendingBabas error:', error); return []; }
  return data || [];
}

async function approveBaba(babaId) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
// EXPORT
// =============================================

window.dbHelpers = {
  // Auth
  getCurrentUser, getCurrentProfile, signOut, requireAuth, requireAdmin, redirectToDashboard,
  // Babá
  getBabaProfile, upsertBabaProfile, getApprovedBabas, getBabaById,
  // Admin
  getPendingBabas, approveBaba, rejectBaba,
  // UI
  showError, showSuccess, setLoading,
};
