import { supabase } from './supaBase.js';
import { azGetTipoUsuario, azGetPaginaInicial } from './perfilAuth.js';

async function updateAuthLink() {
    const link = document.getElementById('navAuthLink');
    const heroBtn = document.getElementById('heroAuthBtn'); // só existe na home
    if (!link) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();

        // remove um link de perfil antigo, caso o script rode mais de uma vez
        const oldProfileLink = document.getElementById('navProfileLink');
        if (oldProfileLink) oldProfileLink.remove();

        if (session) {
            const tipo = await azGetTipoUsuario(session);
            const destino = azGetPaginaInicial(tipo);

            // ---------- Logado: "Perfil" + "Sair" ----------
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

            // ---------- Hero: deixa de ser "Entrar" ----------
            if (heroBtn) {
                heroBtn.textContent = 'Montar meu look';
                heroBtn.href = destino;
                // Para esconder o botão em vez de trocar, use:
                // heroBtn.style.display = 'none';
            }
        } else {
            // ---------- Deslogado: só "Entrar" ----------
            link.textContent = 'Entrar';
            link.href = 'conta.html';
            link.classList.remove('btn-sair');

            if (heroBtn) {
                heroBtn.textContent = 'Entrar';
                heroBtn.href = 'conta.html';
            }
        }
    } catch (error) {
        console.error('[NAV] Erro ao atualizar links de autenticação:', error);
    } finally {
        // mostra o botão do hero já no estado correto
        if (heroBtn) heroBtn.style.visibility = '';
    }
}

updateAuthLink();