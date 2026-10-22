import { supabase } from './supaBase.js';

async function updateAuthLink() {
    const link = document.getElementById('navAuthLink');
    if (!link) return;

    const { data: { session } } = await supabase.auth.getSession();

    // remove um link de perfil antigo, caso o script rode mais de uma vez
    const oldProfileLink = document.getElementById('navProfileLink');
    if (oldProfileLink) oldProfileLink.remove();

    if (session) {
        // ---------- Logado: mostra "Perfil" + "Sair" ----------
        const profileLink = document.createElement('a');
        profileLink.id = 'navProfileLink';
        profileLink.href = 'perfil.html';
        profileLink.textContent = 'Perfil';

        link.insertAdjacentElement('beforebegin', profileLink);

        link.textContent = 'Sair';
        link.href = '#';
        link.classList.add('btn-sair');

        link.addEventListener('click', async (event) => {
            event.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        // ---------- Deslogado: só "Entrar" ----------
        link.textContent = 'Entrar';
        link.href = 'conta.html';
        link.classList.remove('btn-sair');
    }
}

updateAuthLink();