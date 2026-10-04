/* ==========================================================
   Autenticação — Ariadne Zanardi
   Arquivo: scripts/auth.js
   -----------------------------------------------------------
   PROTÓTIPO SEM BACKEND: as "contas" ficam guardadas no
   localStorage do navegador de quem está usando a página.
   Ou seja, só funcionam no mesmo navegador onde a conta foi
   criada — não é um sistema de login real entre dispositivos.

   IMPORTANTE SOBRE SENHA: aqui a senha passa só por um
   "embaralhamento" simples em base64 (função azObfuscate),
   NÃO é um hash de segurança de verdade. Isso é só pra não
   deixar 100% em texto puro enquanto é só protótipo de front-end.
   Quando existir um backend de verdade, a senha tem que ser
   validada e guardada lá, com hash seguro (bcrypt, argon2, etc.)
   — nunca no navegador da pessoa, e nunca "disfarçada" só com
   base64 como está aqui.

   BACKEND: quando tiver servidor, troque as funções abaixo por
   chamadas de API:
     POST /api/cadastro   -> criar conta
     POST /api/login      -> autenticar
     GET  /api/me         -> pegar usuário logado
   ========================================================== */

const AZ_USERS_KEY = 'az_users';
const AZ_SESSION_KEY = 'az_current_user_id';

/* ---------- Usuários (armazenamento) ---------- */

function azLoadUsers() {
    try {
        const raw = localStorage.getItem(AZ_USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Não foi possível ler os usuários salvos:', e);
        return [];
    }
}

function azSaveUsers(users) {
    try {
        localStorage.setItem(AZ_USERS_KEY, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Não foi possível salvar os usuários:', e);
        return false;
    }
}

function azGenerateId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'u_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function azObfuscate(str) {
    // Veja o aviso no topo do arquivo: isso NÃO é um hash seguro.
    return btoa(unescape(encodeURIComponent(str)));
}

function azFindUserByEmailOrUsername(value) {
    const v = (value || '').trim().toLowerCase();
    return azLoadUsers().find(
        u => u.email.toLowerCase() === v || u.username.toLowerCase() === v
    ) || null;
}

/* ---------- Sessão (quem está logado agora) ---------- */

function azSetCurrentUser(userId) {
    localStorage.setItem(AZ_SESSION_KEY, userId);
}

function azGetCurrentUser() {
    const id = localStorage.getItem(AZ_SESSION_KEY);
    if (!id) return null;
    return azLoadUsers().find(u => u.id === id) || null;
}

function azUpdateCurrentUser(updatedFields) {
    const id = localStorage.getItem(AZ_SESSION_KEY);
    if (!id) return null;

    const users = azLoadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    users[idx] = Object.assign({}, users[idx], updatedFields);
    return azSaveUsers(users) ? users[idx] : null;
}

function azLogout() {
    localStorage.removeItem(AZ_SESSION_KEY);
}

/* Usado em páginas que exigem login (ex.: perfil.html).
   Redireciona para conta.html se não tiver ninguém logado. */
function azRequireAuth() {
    const user = azGetCurrentUser();
    if (!user) {
        window.location.href = 'conta.html';
    }
    return user;
}

/* Atualiza o link "Entrar" do cabeçalho em todas as páginas:
   mostra o primeiro nome + leva pro perfil quando tem alguém logado. */
function azUpdateHeaderAuth() {
    const link = document.getElementById('navAuthLink');
    if (!link) return;

    const user = azGetCurrentUser();
    if (user) {
        link.textContent = user.nome.split(' ')[0];
        link.href = 'perfil.html';
    } else {
        link.textContent = 'Entrar';
        link.href = 'conta.html';
    }
}

document.addEventListener('DOMContentLoaded', azUpdateHeaderAuth);

/* ---------- Validação e máscaras (CPF / telefone) ---------- */

function azFormatCPF(value) {
    return value
        .replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function azFormatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
        return digits
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

function azIsValidCPF(cpfRaw) {
    const cpf = (cpfRaw || '').replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
    let check1 = 11 - (sum % 11);
    if (check1 >= 10) check1 = 0;
    if (check1 !== parseInt(cpf[9], 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
    let check2 = 11 - (sum % 11);
    if (check2 >= 10) check2 = 0;
    if (check2 !== parseInt(cpf[10], 10)) return false;

    return true;
}

function azIsValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

function azIsValidPhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
}