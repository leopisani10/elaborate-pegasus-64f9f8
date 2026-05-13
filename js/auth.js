// =============================================
// Dona Baby+ — Auth + helpers compartilhados
// Carregado em todas as páginas que precisam de
// autenticação ou acesso ao banco.
// =============================================

const SUPABASE_URL = 'https://cvvdmgoyvozzjsrswyzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmRtZ295dm96empzcnN3eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUyNjMsImV4cCI6MjA5NDIyMTI2M30.AfVR9iNjctz8mCdvF12N88fwivL9DjTnTbLkXcsBCr0';

// Cria o cliente Supabase global
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.dbClient = supabase;

// =============================================
// HELPERS DE UI
// =============================================

function showError(message) {
  alert('Ops: ' + message);
}

function showSuccess(message) {
  alert(message);
}

function setLoading(button, isLoading, originalText) {
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
    button.innerHTML = button.dataset.originalText || originalText;
  }
}

// =============================================
// AUTH HELPERS
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
  if (error) {
    console.error('Erro buscando profile:', error);
    return null;
  }
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}

// Protege páginas que exigem login. Chame em pages logadas.
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

// Redireciona pra dashboard certo baseado no tipo de usuário
async function redirectToDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) {
    window.location.href = '/login.html';
    return;
  }
  if (profile.user_type === 'baba') {
    window.location.href = '/onboarding-baba.html';
  } else if (profile.user_type === 'admin') {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/dashboard.html';
  }
}

window.dbHelpers = {
  getCurrentUser,
  getCurrentProfile,
  signOut,
  requireAuth,
  redirectToDashboard,
  showError,
  showSuccess,
  setLoading,
};
