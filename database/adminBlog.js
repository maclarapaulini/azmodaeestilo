import { supabase } from './supaBase.js';
import { azRequireAdmin } from './perfilAuth.js';

const isAdminUser = await azRequireAdmin();

if (!isAdminUser) {
    throw new Error('Acesso restrito à administradora.');
}

document.getElementById('adminApp').hidden = false;

const BUCKET = 'imagens';
let adminUser = null;

const $ = id => document.getElementById(id);

/* ==========================================================
    PostsAPI — todo o acesso ao banco fica aqui
    ========================================================== */
const PostsAPI = {
    /** Lista posts (mais novos primeiro) já no formato usado pela tela. */
    async list() {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('id_post, titulo, categoria, resumo, conteudo, data_publicacao, blog_anexos ( url_arquivo )')
            .order('data_publicacao', { ascending: false });

        if (error) {
            console.error('[ADMIN-BLOG] Erro ao listar posts:', error);
            throw error;
        }

        return (data || []).map(p => ({
            id: p.id_post,
            title: p.titulo,
            cat: p.categoria,
            excerpt: p.resumo,
            content: p.conteudo,
            imageUrl: p.blog_anexos && p.blog_anexos[0] ? p.blog_anexos[0].url_arquivo : '',
            dateLabel: new Date(p.data_publicacao).toLocaleDateString('pt-BR', {
                day: 'numeric', month: 'short', year: 'numeric'
            })
        }));
    },

    /** Foto → Storage, post → blog_posts, anexo → blog_anexos (com desfazer em caso de erro). */
    async create({ title, cat, excerpt, content, imageDataUrl }) {
        const blob = await (await fetch(imageDataUrl)).blob();   // data URL → JPEG
        const path = adminUser.id + '/blog/' + Date.now().toString(36) +
                        Math.random().toString(36).slice(2, 7) + '.jpg';
        let postId = null;

        try {
            const { error: upError } = await supabase.storage
                .from(BUCKET)
                .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
            if (upError) throw upError;

            const { data: post, error: postError } = await supabase
                .from('blog_posts')
                .insert({
                    id_administradora: adminUser.id_usuario,
                    titulo: title,
                    categoria: cat,
                    resumo: excerpt,
                    conteudo: content || excerpt
                })
                .select('id_post')
                .single();
            if (postError) throw postError;
            postId = post.id_post;

            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

            const { error: anexoError } = await supabase
                .from('blog_anexos')
                .insert({
                    id_post: postId,
                    url_arquivo: pub.publicUrl,
                    tipo_arquivo: 'image/jpeg',
                    caminho_storage: path
                });
            if (anexoError) throw anexoError;

            return postId;
        } catch (error) {
            console.error('[ADMIN-BLOG] Erro ao publicar:', error);
            if (postId) await supabase.from('blog_posts').delete().eq('id_post', postId);
            await supabase.storage.from(BUCKET).remove([path]);
            throw error;
        }
    },

    /** Exclui o post (anexos saem por CASCADE) e a foto do Storage. */
    async remove(id) {
        const { data: anexos } = await supabase
            .from('blog_anexos')
            .select('caminho_storage')
            .eq('id_post', id);

        const { error } = await supabase.from('blog_posts').delete().eq('id_post', id);
        if (error) throw error;

        const paths = (anexos || []).map(a => a.caminho_storage).filter(Boolean);
        if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    },

    /** Apaga todos os posts da administradora logada (e as fotos). */
    async clearAll() {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('id_post, blog_anexos ( caminho_storage )')
            .eq('id_administradora', adminUser.id_usuario);
        if (error) throw error;

        const paths = (data || [])
            .flatMap(p => (p.blog_anexos || []).map(a => a.caminho_storage))
            .filter(Boolean);

        const { error: delError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id_administradora', adminUser.id_usuario);
        if (delError) throw delError;

        if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    }
};

const catLabels = {
    tendencias: 'Tendências',
    looks: 'Looks',
    capsula: 'Guarda-roupa cápsula',
    consultoria: 'Consultoria'
};

/* ==========================================================
    Lista de posts publicados
    ========================================================== */
const postsList = $('postsList');
const listStatus = $('listStatus');

function buildPostItem(post) {
    const li = document.createElement('li');
    li.className = 'adm-post';

    const thumb = document.createElement('img');
    thumb.className = 'adm-post-thumb';
    thumb.src = post.imageUrl;
    thumb.alt = '';

    const info = document.createElement('div');
    info.className = 'adm-post-info';

    const title = document.createElement('h3');
    title.textContent = post.title;

    const meta = document.createElement('p');
    meta.className = 'adm-post-meta';
    const cat = document.createElement('span');
    cat.className = 'cat';
    cat.textContent = catLabels[post.cat] || post.cat;
    meta.append(cat, ' · ' + (post.dateLabel || ''));

    info.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'adm-post-actions';

    const view = document.createElement('a');
    view.className = 'adm-mini';
    view.href = 'post.html?id=' + post.id;
    view.textContent = 'Ver';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'adm-mini danger';
    del.textContent = 'Excluir';
    del.addEventListener('click', () => deletePost(post));

    actions.append(view, del);
    li.append(thumb, info, actions);
    return li;
}

async function renderPosts() {
    let posts = [];
    try {
        posts = await PostsAPI.list();
    } catch (err) {
        listStatus.classList.remove('ok');
        listStatus.textContent = 'Não foi possível carregar os posts agora.';
    }

    postsList.innerHTML = '';
    $('postCount').textContent = posts.length;

    if (!posts.length) {
        const li = document.createElement('li');
        li.className = 'adm-empty';
        const strong = document.createElement('strong');
        strong.textContent = 'Nenhum post publicado';
        li.append(strong, 'Quando você publicar, o post aparece aqui e no blog.');
        postsList.appendChild(li);
        return;
    }

    posts.forEach(p => postsList.appendChild(buildPostItem(p)));
}

async function deletePost(post) {
    if (!window.confirm('Excluir o post "' + post.title + '"? Essa ação não pode ser desfeita.')) return;

    try {
        await PostsAPI.remove(post.id);
        listStatus.classList.add('ok');
        listStatus.textContent = 'Post excluído.';
        renderPosts();
    } catch (err) {
        console.error('[ADMIN-BLOG] Erro ao excluir:', err);
        listStatus.classList.remove('ok');
        listStatus.textContent = 'Não foi possível excluir o post agora.';
    }
}

$('resetPostsBtn').addEventListener('click', async () => {
    const confirmed = window.confirm(
        'Tem certeza? Isso vai apagar TODOS os posts publicados por você. Essa ação não pode ser desfeita.'
    );
    if (!confirmed) return;

    try {
        await PostsAPI.clearAll();
        listStatus.classList.add('ok');
        listStatus.textContent = 'Posts apagados. O blog foi resetado.';
        renderPosts();
    } catch (err) {
        console.error('[ADMIN-BLOG] Erro ao limpar posts:', err);
        listStatus.classList.remove('ok');
        listStatus.textContent = 'Não foi possível apagar os posts agora.';
    }
});

/* ==========================================================
    Upload da foto do post
    ========================================================== */
const imageInput = $('newImage');
const uploadBox = $('uploadBox');
const uploadError = $('uploadError');
const uploadPreview = $('uploadPreview');
const previewImg = $('previewImg');

let uploadedFileDataUrl = null; // JPEG já redimensionado (data URL)

const MAX_SIZE_MB = 15;       // limite do arquivo ORIGINAL escolhido pela pessoa
const MAX_DIMENSION = 1600;   // maior lado da imagem, depois de redimensionada
const JPEG_QUALITY = 0.82;    // qualidade da compressão (0 a 1)

/* Monta o conteúdo da caixa de upload sem innerHTML (o nome do arquivo vem do usuário). */
function setUploadBox(icon, title, small) {
    uploadBox.querySelectorAll('.upload-icon, .upload-text').forEach(n => n.remove());

    const ic = document.createElement('span');
    ic.className = 'upload-icon';
    ic.textContent = icon;

    const text = document.createElement('span');
    text.className = 'upload-text';
    const strong = document.createElement('strong');
    strong.textContent = title;
    text.appendChild(strong);

    if (small) {
        const sm = document.createElement('small');
        sm.textContent = small;
        text.appendChild(sm);
    }

    uploadBox.append(ic, text);
}

const UPLOAD_IDLE = ['＋', 'Enviar foto do post', 'JPG, PNG ou WEBP · arraste o arquivo aqui ou clique para escolher'];

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;

                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
            };

            img.onerror = () => reject(new Error('Não consegui processar essa imagem.'));
            img.src = reader.result;
        };

        reader.onerror = () => reject(new Error('Não consegui ler essa imagem.'));
        reader.readAsDataURL(file);
    });
}

function clearImage() {
    uploadedFileDataUrl = null;
    imageInput.value = '';
    uploadPreview.hidden = true;
    previewImg.removeAttribute('src');
    uploadBox.classList.remove('has-file');
    setUploadBox(...UPLOAD_IDLE);
}

function showPreview(file) {
    uploadError.textContent = '';
    setUploadBox('⏳', 'Preparando a imagem…');

    compressImage(file)
        .then(dataUrl => {
            uploadedFileDataUrl = dataUrl;
            previewImg.src = dataUrl;
            uploadPreview.hidden = false;

            const approxKB = Math.round((dataUrl.length * 0.75) / 1024);
            uploadBox.classList.add('has-file');
            setUploadBox('✓', file.name, '~' + approxKB + ' KB depois de otimizada · clique para trocar a foto');
        })
        .catch(err => {
            clearImage();
            uploadError.textContent = err.message || 'Não consegui processar essa imagem, tente outra.';
        });
}

function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        uploadError.textContent = 'Escolha um arquivo de imagem (JPG, PNG ou WEBP).';
        return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        uploadError.textContent = 'A imagem é muito grande. Envie um arquivo de até ' + MAX_SIZE_MB + ' MB.';
        return;
    }

    showPreview(file);
}

imageInput.addEventListener('change', () => handleFile(imageInput.files[0]));

['dragenter', 'dragover'].forEach(evt =>
    uploadBox.addEventListener(evt, e => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    })
);

['dragleave', 'drop'].forEach(evt =>
    uploadBox.addEventListener(evt, e => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
    })
);

uploadBox.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
$('removeImage').addEventListener('click', clearImage);

/* ---------- Contador do resumo ---------- */
const excerptField = $('newExcerpt');
excerptField.addEventListener('input', () => {
    $('excerptCount').textContent = excerptField.value.length + ' / ' + excerptField.maxLength;
});

/* ==========================================================
    Publicar
    ========================================================== */
const publishBtn = $('publishBtn');
const publishStatus = $('publishStatus');

function setPublishStatus(text, ok) {
    publishStatus.textContent = text;
    publishStatus.classList.toggle('ok', !!ok);
}

publishBtn.addEventListener('click', async () => {
    const title = $('newTitle').value.trim();
    const excerpt = excerptField.value.trim();
    const content = $('newContent').value.trim();

    if (!uploadedFileDataUrl) {
        uploadError.textContent = 'Envie a foto do post antes de publicar.';
        uploadBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    if (!title || !excerpt) {
        setPublishStatus('Preencha título e resumo para publicar.', false);
        return;
    }

    publishBtn.disabled = true;
    setPublishStatus('Publicando…', true);

    try {
        await PostsAPI.create({
            title,
            cat: $('newCat').value,
            excerpt,
            content,
            imageDataUrl: uploadedFileDataUrl
        });
    } catch (err) {
        publishBtn.disabled = false;
        setPublishStatus('Não foi possível publicar agora: ' + (err.message || 'tente novamente.'), false);
        return;
    }

    publishBtn.disabled = false;

    /* limpa o formulário */
    $('newTitle').value = '';
    excerptField.value = '';
    $('newContent').value = '';
    $('excerptCount').textContent = '0 / ' + excerptField.maxLength;
    clearImage();

    setPublishStatus('Publicado no blog! ♡', true);
    renderPosts();
});

/* ---------- Início ---------- */
$('year').textContent = new Date().getFullYear();

adminUser = await azRequireAdmin(); // sem login → conta.html; não-admin → página dela
if (adminUser) {
    if (!adminUser.id_usuario) {
        alert('Não encontramos seu cadastro de administradora. Saia e entre novamente.');
    } else {
        $('adminApp').hidden = false;
        renderPosts();
    }
}