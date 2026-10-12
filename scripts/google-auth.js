const AZ_GOOGLE_CLIENT_ID = '359091971325-9g02hvkc4gqb7d33ue9ss33pimb574ug.apps.googleusercontent.com';

/* Decodifica o payload do JWT do Google (com suporte a acentos) */
function azDecodeJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
        atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
}

/* Gera um @usuario único a partir do e-mail */
function azUniqueUsername(email, users) {
    let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (base.length < 3) base += 'user';
    let candidate = base, n = 1;
    while (users.some(u => u.username.toLowerCase() === candidate)) {
        candidate = base + n++;
    }
    return candidate;
}

/* Acha ou cria o usuário local a partir do perfil do Google */
function azLoginWithGoogleProfile(profile) {
    const users = azLoadUsers();

    let user = users.find(u => u.googleId === profile.sub)
            || users.find(u => u.email.toLowerCase() === profile.email.toLowerCase());

    if (user) {
        // conta já existia (por senha): vincula ao Google
        if (!user.googleId) {
            user.googleId = profile.sub;
            azSaveUsers(users);
        }
    } else {
        user = {
            id: azGenerateId(),
            googleId: profile.sub,
            nome: profile.name || profile.email.split('@')[0],
            username: azUniqueUsername(profile.email, users),
            email: profile.email,
            telefone: '',   // string vazia: o cadastro por senha faz u.cpf.replace(...)
            cpf: '',        // e quebraria com null/undefined
            senha: null,    // conta só com Google
            picture: profile.picture || null,
            createdAt: Date.now(),
            measurements: null
        };
        users.push(user);
        if (!azSaveUsers(users)) return null;
    }

    azSetCurrentUser(user.id);
    return user;
}

function azGoogleStatus(msg) {
    const el = document.querySelector('.auth-panel:not([hidden]) .auth-status');
    if (el) el.textContent = msg;
}

function handleGoogleCredential(response) {
    /* BACKEND: troque o bloco abaixo por
       fetch('/api/auth/google', { method: 'POST', credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ credential: response.credential }) })
       O back-end verifica o token (verifyIdToken) e abre a sessão. */
    let profile;
    try {
        profile = azDecodeJwt(response.credential);
    } catch (e) {
        azGoogleStatus('Não foi possível ler a resposta do Google. Tenta de novo?');
        return;
    }

    if (!profile.email || !profile.email_verified) {
        azGoogleStatus('Essa conta do Google não tem e-mail verificado.');
        return;
    }

    const user = azLoginWithGoogleProfile(profile);
    if (!user) {
        azGoogleStatus('Não foi possível entrar agora. Tenta de novo?');
        return;
    }
    window.location.href = 'perfil.html';
}

window.addEventListener('load', () => {
    if (!window.google || !google.accounts) {
        azGoogleStatus('Não foi possível carregar o login do Google.');
        return;
    }

    google.accounts.id.initialize({
        client_id: AZ_GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
    });

    document.querySelectorAll('.google-slot').forEach(slot => {
        google.accounts.id.renderButton(slot, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            locale: 'pt-BR',
            text: slot.dataset.mode === 'signup' ? 'signup_with' : 'signin_with',
            width: 320   // largura fixa: um dos painéis começa oculto
        });
    });
});