
import { supabase } from './supaBase.js';

const catLabels = {
    tendencias: 'Tendências',
    looks: 'Looks',
    capsula: 'Guarda-roupa cápsula',
    consultoria: 'Consultoria'
};

const main = document.getElementById('postPage');
const year = document.getElementById('year');

// Formata a data
function formatDate(value) {
    if (!value) return '';

    return new Date(value).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Evita inserir HTML diretamente com conteúdo vindo do banco
function escapeHtml(value) {
    const div = document.createElement('div');

    div.textContent = value ?? '';

    return div.innerHTML;
}

// Busca um post específico pelo ID
async function fetchPost(postId) {
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
        .eq('id_post', postId)
        .maybeSingle();

    if (error) {
        console.error('[POST] Erro ao buscar publicação:', error);
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        id: data.id_post,
        title: data.titulo || 'Sem título',
        cat: data.categoria || '',
        excerpt: data.resumo || '',
        content: data.conteudo || data.resumo || '',
        imageUrl: data.blog_anexos?.[0]?.url_arquivo || '',
        dateLabel: formatDate(data.data_publicacao)
    };
}

// Renderiza o conteúdo completo do post
function renderPost(post) {
    const paragraphs = (post.content || '')
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean);

    const contentHtml = paragraphs.length
        ? paragraphs.map(paragraph =>
            `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
        ).join('')
        : '<p></p>';

    main.innerHTML = `
        <a href="blog.html" class="post-back">
            ← Voltar para o blog
        </a>

        <article class="post-article">

            <span class="tag post-tag"></span>

            <h1 class="post-title"></h1>

            <p class="meta post-meta"></p>

            <div class="post-hero" ${post.imageUrl ? '' : 'hidden'}>
                <img id="postHeroImg" alt="">
            </div>

            <div class="post-content">
                ${contentHtml}
            </div>

        </article>
    `;

    main.querySelector('.post-tag').textContent =
        catLabels[post.cat] || post.cat;

    main.querySelector('.post-title').textContent =
        post.title;

    main.querySelector('.post-meta').textContent =
        post.dateLabel;

    const image = document.getElementById('postHeroImg');

    if (image && post.imageUrl) {
        image.src = post.imageUrl;
        image.alt = post.title;
    }

    document.title = `${post.title} - Ariadne Zanardi`;
}

// Exibe mensagem caso o post não seja encontrado
function renderNotFound(message) {
    main.innerHTML = `
        <a href="blog.html" class="post-back">
            ← Voltar para o blog
        </a>

        <div class="post-not-found">
            <strong>Não foi possível exibir esta publicação.</strong>
            <p></p>
        </div>
    `;

    main.querySelector('.post-not-found p').textContent =
        message;
}

// Inicialização da página
async function initPost() {
    const params = new URLSearchParams(window.location.search);

    const postId = params.get('id');

    if (!postId) {
        renderNotFound(
            'Nenhum identificador de publicação foi informado na URL.'
        );

        return;
    }

    try {
        const post = await fetchPost(postId);

        if (!post) {
            renderNotFound(
                'Esse post não foi encontrado. Ele pode ter sido removido ou o link está incorreto.'
            );

            return;
        }

        renderPost(post);

    } catch (error) {
        renderNotFound(
            'Ocorreu um erro ao carregar a publicação. Tente novamente mais tarde.'
        );
    }
}

// Atualiza o ano do rodapé
if (year) {
    year.textContent = new Date().getFullYear();
}

// Executa a conexão
initPost();
