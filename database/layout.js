
import { azGetCurrentUser } from './perfilAuth.js';

async function carregarComponente(elementId, caminho) {
    const container = document.getElementById(elementId);

    if (!container) return;

    try {
        const response = await fetch(caminho);

        if (!response.ok) {
            throw new Error(`Erro ao carregar ${caminho}: ${response.status}`);
        }

        container.innerHTML = await response.text();

    } catch (error) {
        console.error(`Não foi possível carregar ${caminho}:`, error);
    }
}

function configurarCabecalho(user) {
    const loginLink = document.getElementById('navLoginLink');
    const profileLink = document.getElementById('navProfileLink');

    const minhasPecasLink = document.getElementById('navMinhasPecas');
    const lookbookLink = document.getElementById('navLookbook');

    const montarLookLink = document.getElementById('navMontarLook');
    const publicarLink = document.getElementById('navPublicar');

    const isLoggedIn = Boolean(user);
    const isAdmin = user?.tipo_usuario === 'administradora';
    const isClient = user?.tipo_usuario === 'cliente';

    if (loginLink) loginLink.hidden = isLoggedIn;
    if (profileLink) profileLink.hidden = !isLoggedIn;

    if (minhasPecasLink) minhasPecasLink.hidden = !isClient;
    if (lookbookLink) lookbookLink.hidden = !isClient;

    if (montarLookLink) montarLookLink.hidden = !isAdmin;
    if (publicarLink) publicarLink.hidden = !isAdmin;
}

function configurarRodape() {
    const year = document.getElementById('year');

    if (year) {
        year.textContent = new Date().getFullYear();
    }
}

async function inicializarLayout() {
    // Carrega os componentes
    await Promise.all([
        carregarComponente('header-placeholder', './components/header.html'),
        carregarComponente('footer-placeholder', './components/footer.html')
    ]);

    // Consulta o usuário autenticado
    let currentUser = null;

    try {
        currentUser = await azGetCurrentUser();
    } catch (error) {
        console.error('Erro ao verificar usuário autenticado:', error);
    }

    // Configura os links do cabeçalho
    configurarCabecalho(currentUser);

    // Configura o ano do rodapé
    configurarRodape();
}

inicializarLayout();
