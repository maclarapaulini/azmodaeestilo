
import { supabase } from './supaBase.js';

const catLabels = {
    tendencias: 'Tendências',
    looks: 'Looks',
    capsula: 'Guarda-roupa cápsula',
    consultoria: 'Consultoria'
};

const postsGrid = document.getElementById('postsGrid');
const emptyState = document.getElementById('emptyState');
const chips = document.querySelectorAll('.chip');

let activeCat = 'todos';
let allPosts = [];

// Formata a data para o padrão brasileiro
function formatDate(value) {
    if (!value) return '';

    return new Date(value).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Busca os posts cadastrados no Supabase
async function fetchPosts() {
    const { data, error } = await supabase
        .from('blog_posts')
        .select(`
            id_post,
            titulo,
            categoria,
            resumo,
            conteudo,
            data_publicacao,
            blog_anexos ( url_arquivo )
        `)
        .order('data_publicacao', { ascending: false });

    if (error) {
        console.error('[BLOG] Erro ao buscar publicações:', error);
        throw error;
    }

    return (data || []).map(post => ({
        id: post.id_post,
        title: post.titulo || 'Sem título',
        cat: post.categoria || '',
        excerpt: post.resumo || '',
        content: post.conteudo || '',
        imageUrl: post.blog_anexos?.[0]?.url_arquivo || '',
        dateLabel: formatDate(post.data_publicacao)
    }));
}

// Curtir post (apenas visual, sem persistência)
function bindLike(button) {
    button.addEventListener('click', () => {
        const count = button.querySelector('span');
        const current = Number(button.dataset.likes || 0);

        const liked = button.classList.toggle('liked');

        const next = liked
            ? current + 1
            : Math.max(0, current - 1);

        button.dataset.likes = String(next);
        count.textContent = String(next);

        button.firstChild.textContent = liked ? '♥ ' : '♡ ';
    });
}

// Salvar post (apenas visual, sem persistência)
function bindSave(button) {
    button.addEventListener('click', () => {
        const saved = button.classList.toggle('saved');

        button.textContent = saved ? '♥' : '♡';

        button.title = saved
            ? 'Salvo na pasta de inspirações'
            : 'Salvar na pasta de inspirações';
    });
}

// Cria o card de cada publicação
function buildCardElement(post) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.cat = post.cat;

    const media = document.createElement('div');
    media.className = 'card-media';

    if (post.imageUrl) {
        const img = document.createElement('img');

        img.src = post.imageUrl;
        img.alt = post.title;
        img.loading = 'lazy';

        media.appendChild(img);
    }

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = catLabels[post.cat] || post.cat;

    media.appendChild(tag);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'icon-btn save';
    saveButton.title = 'Salvar na pasta de inspirações';
    saveButton.setAttribute(
        'aria-label',
        'Salvar na pasta de inspirações'
    );
    saveButton.textContent = '♡';

    media.appendChild(saveButton);

    const body = document.createElement('div');
    body.className = 'card-body';

    body.innerHTML = `
        <p class="meta"></p>
        <h3><a></a></h3>
        <p class="excerpt"></p>

        <div class="card-foot">
            <button type="button" class="like-btn" data-likes="0">
                ♡ <span>0</span>
            </button>

            <a class="read">Ler mais →</a>
        </div>
    `;

    const postUrl = `post.html?id=${encodeURIComponent(post.id)}`;

    body.querySelector('.meta').textContent = post.dateLabel;

    const titleLink = body.querySelector('h3 a');
    titleLink.textContent = post.title;
    titleLink.href = postUrl;

    body.querySelector('.excerpt').textContent = post.excerpt;

    const readLink = body.querySelector('.read');
    readLink.href = postUrl;

    card.append(media, body);

    bindSave(saveButton);
    bindLike(body.querySelector('.like-btn'));

    return card;
}

// Aplica o filtro selecionado
function applyFilter() {
    const cards = postsGrid.querySelectorAll('.card');

    let visible = 0;

    cards.forEach(card => {
        const show =
            activeCat === 'todos' ||
            card.dataset.cat === activeCat;

        card.style.display = show ? '' : 'none';

        if (show) visible++;
    });

    emptyState.hidden = visible > 0;

    if (visible === 0) {
        emptyState.textContent = activeCat === 'todos'
            ? 'Ainda não há publicações no blog. Em breve!'
            : 'Ainda não tem post nessa categoria — em breve!';
    }
}

// Renderiza os posts na tela
function renderPosts() {
    postsGrid.innerHTML = '';

    allPosts.forEach(post => {
        postsGrid.appendChild(buildCardElement(post));
    });

    applyFilter();
}

// Inicialização do blog
async function initBlog() {
    try {
        allPosts = await fetchPosts();

        renderPosts();

    } catch (error) {
        postsGrid.innerHTML = '';

        emptyState.hidden = false;

        emptyState.textContent =
            'Não foi possível carregar as publicações. Tente novamente mais tarde.';
    }
}

// Eventos dos filtros de categoria
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(item => item.classList.remove('active'));

        chip.classList.add('active');

        activeCat = chip.dataset.cat || 'todos';

        applyFilter();
    });
});

// Newsletter, caso exista na página
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', event => {
        event.preventDefault();

        const emailField =
            document.getElementById('newsletterEmail');

        const status =
            document.getElementById('newsletterStatus');

        if (emailField && status) {
            const email = emailField.value.trim();

            status.textContent =
                `Prontinho! Os próximos posts chegam em ${email} ♡`;
        }

        newsletterForm.reset();
    });
}

// Atualiza o ano do rodapé
const year = document.getElementById('year');

if (year) {
    year.textContent = new Date().getFullYear();
}

// Executa a conexão
initBlog();
