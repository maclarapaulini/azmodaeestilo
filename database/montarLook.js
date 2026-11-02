// database/montarLook.js

import { supabase } from './supaBase.js';
import { azRequireAdmin } from './perfilAuth.js';

const isAdminUser = await azRequireAdmin();

if (!isAdminUser) {
    throw new Error('Acesso restrito à administradora.');
}

document.getElementById('adminApp').hidden = false;

/* ==========================================================
   CONFIGURAÇÕES
========================================================== */

const $ = id => document.getElementById(id);

const LABELS = {
    parte_cima: 'Parte de Cima',
    parte_baixo: 'Parte de Baixo',
    parte_unica: 'Peça Única',
    sapato: 'Sapatos'
};

const MODES = {
    tradicional: ['parte_cima', 'parte_baixo', 'sapato'],
    unica: ['parte_unica', 'sapato']
};

const MODE_LABELS = {
    tradicional: 'Tradicional',
    unica: 'Peça única'
};

const EMPTY_TEXT = {
    parte_cima: 'Esta cliente ainda não cadastrou blusas, camisas ou casacos.',
    parte_baixo: 'Esta cliente ainda não cadastrou calças, saias ou shorts.',
    parte_unica: 'Esta cliente ainda não cadastrou vestidos ou macacões.',
    sapato: 'Esta cliente ainda não cadastrou sapatos, tênis ou sandálias.'
};

const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
).matches;

let adminUser = null;
let selectedClientId = null;

let allItems = [];
let byCategory = {};

let currentMode = 'tradicional';
let editingLookId = null;

let savedLooks = [];

const carousels = {};

/* ==========================================================
   AUTENTICAÇÃO E USUÁRIO ADMINISTRADOR
========================================================== */

async function getAdminUser() {
    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('Você precisa estar autenticada para acessar esta tela.');
    }

    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, tipo_usuario')
        .eq('auth_user_id', user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data || data.tipo_usuario !== 'administradora') {
        throw new Error('Apenas administradoras podem montar looks.');
    }

    return data;
}

/* ==========================================================
   CLIENTES
========================================================== */

async function loadClients() {
    const select = $('clientSelect');

    select.innerHTML = '<option value="">Selecione uma cliente</option>';

    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome')
        .eq('tipo_usuario', 'cliente')
        .order('nome', { ascending: true });

    if (error) throw error;

    data.forEach(client => {
        const option = document.createElement('option');

        option.value = client.id_usuario;
        option.textContent = client.nome;

        select.appendChild(option);
    });
}

$('clientSelect').addEventListener('change', async event => {
    const clientId = event.target.value;

    selectedClientId = clientId || null;

    resetEditor();
    allItems = [];
    initializeCategories();
    refreshCarousels();

    if (!selectedClientId) {
        savedLooks = [];
        renderSavedLooks();
        setStatus('Selecione uma cliente para visualizar as peças.');
        return;
    }

    try {
        setStatus('Carregando guarda-roupa da cliente...');

        await loadClientWardrobe();
        await loadSavedLooks();

        setStatus('Guarda-roupa carregado. Escolha as peças para montar o look.');
    } catch (error) {
        console.error('Erro ao carregar dados da cliente:', error);
        setStatus('Não foi possível carregar os dados da cliente.', true);
    }
});

/* ==========================================================
   CATEGORIAS E PEÇAS
========================================================== */

function initializeCategories() {
    byCategory = {
        parte_cima: [],
        parte_baixo: [],
        parte_unica: [],
        sapato: []
    };
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function identifyCategory(categoryId) {
    const categories = {
        1: 'parte_cima',
        2: 'parte_baixo',
        3: 'parte_unica',
        4: 'sapato'
    };

    return categories[Number(categoryId)] || null;
}

async function loadClientWardrobe() {
    initializeCategories();

    const { data, error } = await supabase
        .from('pecas_roupa')
        .select(`
            id_peca,
            id_cliente,
            id_categoria,
            nome_peca,
            tamanho,
            cor,
            marca,
            descricao,
            categorias_pecas (
                id_categoria,
                nome_categoria
            ),
            peca_imagens (
                url_imagem
            )
        `)
        .eq('id_cliente', selectedClientId);

    if (error) throw error;

    console.log('[Montar Look] Peças retornadas:', data);

    allItems = (data || []).map(piece => {
        const category = identifyCategory(piece.id_categoria);

        const image = piece.peca_imagens?.[0]?.url_imagem || '';

        return {
            id: piece.id_peca,
            name: piece.nome_peca,
            category,
            categoryName: piece.categorias_pecas?.nome_categoria || '',
            image,
            color: piece.cor,
            size: piece.tamanho,
            brand: piece.marca,
            description: piece.descricao
        };
    }).filter(piece => piece.category && byCategory[piece.category]);

    allItems.forEach(item => {
        byCategory[item.category].push(item);
    });

    console.log('[Montar Look] Peças separadas por categoria:', byCategory);

    refreshCarousels();
}

function findItem(id) {
    return allItems.find(item => String(item.id) === String(id)) || null;
}

/* ==========================================================
   CARROSSÉIS
========================================================== */

function createCarousel(section) {
    const cat = section.dataset.cat;

    const viewport = section.querySelector('.lk-viewport');
    const prevBtn = section.querySelector('.lk-prev');
    const nextBtn = section.querySelector('.lk-next');
    const countEl = section.querySelector('.lk-count');

    let items = [];
    let index = 0;

    function buildSlide() {
        const slide = document.createElement('div');
        slide.className = 'lk-slide';

        if (!items.length) {
            slide.classList.add('lk-empty');

            slide.innerHTML = `
                <span class="lk-empty-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28"
                        fill="none" stroke="currentColor" stroke-width="1.7"
                        stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M12 7a2.5 2.5 0 1 0-2.5-2.5"/>
                        <path d="M12 7v2.5L3.5 16a1.5 1.5 0 0 0 1 2.7h15a1.5 1.5 0 0 0 1-2.7L12 9.5"/>
                    </svg>
                </span>
                <strong>Nenhuma peça encontrada</strong>
                <p></p>
            `;

            slide.querySelector('p').textContent = EMPTY_TEXT[cat];

            return slide;
        }

        const item = items[index];

        const img = document.createElement('img');

        img.src = item.image || './images/sem-imagem.png';
        img.alt = item.name || LABELS[cat];
        img.draggable = false;

        slide.appendChild(img);

        const info = document.createElement('div');
        info.className = 'lk-piece-info';

        const name = document.createElement('strong');
        name.textContent = item.name || LABELS[cat];

        info.appendChild(name);

        if (item.color) {
            const color = document.createElement('small');
            color.textContent = item.color;
            info.appendChild(color);
        }

        slide.appendChild(info);

        return slide;
    }

    function updateControls() {
        countEl.textContent = items.length
            ? `${index + 1} / ${items.length}`
            : '';

        const disabled = items.length < 2;

        prevBtn.disabled = disabled;
        nextBtn.disabled = disabled;
    }

    function show(direction = 0) {
        const slides = viewport.querySelectorAll('.lk-slide');
        const old = slides[slides.length - 1] || null;

        slides.forEach(slide => {
            if (slide !== old) slide.remove();
        });

        const slide = buildSlide();

        if (old && direction && !reducedMotion) {
            old.classList.add(direction > 0 ? 'out-next' : 'out-prev');
            slide.classList.add(direction > 0 ? 'in-next' : 'in-prev');

            setTimeout(() => old.remove(), 450);
        } else if (old) {
            old.remove();
        }

        viewport.appendChild(slide);
        updateControls();
    }

    function next() {
        if (items.length < 2) return;

        index = (index + 1) % items.length;
        show(1);
    }

    function prev() {
        if (items.length < 2) return;

        index = (index - 1 + items.length) % items.length;
        show(-1);
    }

    function shuffle() {
        if (items.length < 2) return;

        let newIndex;

        do {
            newIndex = Math.floor(Math.random() * items.length);
        } while (newIndex === index);

        index = newIndex;
        show(1);
    }

    function goTo(id) {
        const newIndex = items.findIndex(
            item => String(item.id) === String(id)
        );

        if (newIndex < 0) return;

        index = newIndex;
        show(0);
    }

    function setItems(list) {
        const currentId = items[index]?.id;

        items = list || [];

        const keepIndex = items.findIndex(
            item => String(item.id) === String(currentId)
        );

        index = keepIndex >= 0 ? keepIndex : 0;

        show(0);
    }

    function current() {
        return items[index] || null;
    }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    viewport.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            prev();
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            next();
        }
    });

    let touchX = null;

    viewport.addEventListener('touchstart', event => {
        touchX = event.touches[0].clientX;
    }, { passive: true });

    viewport.addEventListener('touchend', event => {
        if (touchX === null) return;

        const dx = event.changedTouches[0].clientX - touchX;

        touchX = null;

        if (Math.abs(dx) > 40) {
            dx < 0 ? next() : prev();
        }
    });

    return {
        setItems,
        current,
        shuffle,
        goTo,
        section
    };
}

document.querySelectorAll('.lk-section').forEach(section => {
    carousels[section.dataset.cat] = createCarousel(section);
});

function refreshCarousels() {
    Object.keys(carousels).forEach(category => {
        carousels[category].setItems(byCategory[category] || []);
    });
}

/* ==========================================================
   MODOS DE VISUALIZAÇÃO
========================================================== */

const modeButtons = document.querySelectorAll('.lk-mode');

function applyMode(mode) {
    if (!MODES[mode]) return;

    currentMode = mode;

    modeButtons.forEach(button => {
        const active = button.dataset.mode === mode;

        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });

    Object.keys(carousels).forEach(category => {
        const visible = MODES[mode].includes(category);
        const section = carousels[category].section;

        section.hidden = !visible;

        if (visible && !reducedMotion) {
            section.classList.remove('lk-reveal');
            void section.offsetWidth;
            section.classList.add('lk-reveal');
        }
    });
}

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        applyMode(button.dataset.mode);
        setStatus('');
    });
});

/* ==========================================================
   STATUS E CAMPOS
========================================================== */

const statusEl = $('lookStatus');
const titleInput = $('lookTitle');
const tipsInput = $('lookTips');
const saveButton = $('saveLookBtn');
const cancelEditButton = $('cancelEditBtn');

function setStatus(message, isError = false) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', Boolean(isError));
}

function updateTipsCount() {
    $('tipsCount').textContent =
        `${tipsInput.value.length} / ${tipsInput.maxLength}`;
}

tipsInput.addEventListener('input', updateTipsCount);

/* ==========================================================
   SURPREENDA-ME
========================================================== */

const shuffleButton = $('shuffleBtn');

if (shuffleButton) {
    shuffleButton.addEventListener('click', () => {
        if (!selectedClientId) {
            setStatus('Selecione uma cliente primeiro.', true);
            return;
        }

        let changed = false;

        MODES[currentMode].forEach(category => {
            if (byCategory[category].length > 1) {
                carousels[category].shuffle();
                changed = true;
            }
        });

        setStatus(
            changed
                ? ''
                : 'A cliente precisa ter mais peças cadastradas para variar as combinações.',
            !changed
        );
    });
}

/* ==========================================================
   PEÇAS SELECIONADAS
========================================================== */

function getSelectedPieces() {
    const pieces = {};
    const missing = [];

    MODES[currentMode].forEach(category => {
        const current = carousels[category].current();

        if (current) {
            pieces[category] = current.id;
        } else {
            missing.push(LABELS[category]);
        }
    });

    return { pieces, missing };
}

/* ==========================================================
   SALVAR E EDITAR LOOK
========================================================== */

async function saveLook() {
    if (!selectedClientId) {
        setStatus('Selecione uma cliente antes de salvar o look.', true);
        return;
    }

    const title = titleInput.value.trim().replace(/\s+/g, ' ');
    const tips = tipsInput.value.trim();

    const { pieces, missing } = getSelectedPieces();

    if (missing.length) {
        setStatus(
            'Escolha uma peça para cada categoria: ' + missing.join(', ') + '.',
            true
        );
        return;
    }

    const pieceIds = Object.values(pieces);

    if (new Set(pieceIds.map(String)).size !== pieceIds.length) {
        setStatus('Selecione peças diferentes para compor o look.', true);
        return;
    }

    const lookName = title || 'Look sem nome';

    saveButton.disabled = true;
    setStatus(editingLookId ? 'Atualizando look...' : 'Salvando look...');

    try {
        let lookId = editingLookId;

        if (editingLookId) {
            // Atualiza as informações do look existente.
            const { error } = await supabase
                .from('looks')
                .update({
                    nome_look: lookName,
                    descricao: tips
                })
                .eq('id_look', editingLookId)
                .eq('id_cliente', selectedClientId);

            if (error) throw error;

            // Consulta as peças que já estavam relacionadas.
            const { data: currentRelations, error: relationError } =
                await supabase
                    .from('look_pecas')
                    .select('id_peca')
                    .eq('id_look', editingLookId);

            if (relationError) throw relationError;

            const oldIds = currentRelations.map(item => String(item.id_peca));
            const newIds = pieceIds.map(String);

            const idsToRemove = oldIds.filter(id => !newIds.includes(id));
            const idsToAdd = pieceIds.filter(id => !oldIds.includes(String(id)));

            // Remove somente as peças que deixaram de fazer parte do look.
            if (idsToRemove.length) {
                const { error: deleteError } = await supabase
                    .from('look_pecas')
                    .delete()
                    .eq('id_look', editingLookId)
                    .in('id_peca', idsToRemove);

                if (deleteError) throw deleteError;
            }

            // Adiciona somente as novas peças.
            if (idsToAdd.length) {
                const { error: insertError } = await supabase
                    .from('look_pecas')
                    .insert(
                        idsToAdd.map(id => ({
                            id_look: editingLookId,
                            id_peca: id
                        }))
                    );

                if (insertError) throw insertError;
            }
        } else {
            // Cria o registro principal do look.
            const { data: newLook, error: lookError } = await supabase
                .from('looks')
                .insert({
                    id_administradora: adminUser.id_usuario,
                    id_cliente: selectedClientId,
                    nome_look: lookName,
                    descricao: tips
                })
                .select('id_look')
                .single();

            if (lookError) throw lookError;

            lookId = newLook.id_look;

            // Cria as relações entre o look e as peças.
            const relations = pieceIds.map(pieceId => ({
                id_look: lookId,
                id_peca: pieceId
            }));

            const { error: piecesError } = await supabase
                .from('look_pecas')
                .insert(relations);

            if (piecesError) {
                // Evita deixar um look sem suas peças relacionadas.
                await supabase
                    .from('looks')
                    .delete()
                    .eq('id_look', lookId);

                throw piecesError;
            }
        }

        setStatus(
            editingLookId
                ? 'Look atualizado com sucesso! ✓'
                : 'Look salvo com sucesso! ✓'
        );

        resetEditor();
        await loadSavedLooks();

    } catch (error) {
        console.error('Erro ao salvar look:', error);

        setStatus(
            error.message || 'Não foi possível salvar o look.',
            true
        );
    } finally {
        saveButton.disabled = false;
    }
}

saveButton.addEventListener('click', saveLook);

/* ==========================================================
   CANCELAR EDIÇÃO / LIMPAR FORMULÁRIO
========================================================== */

function resetEditor() {
    editingLookId = null;

    titleInput.value = '';
    tipsInput.value = '';

    updateTipsCount();

    saveButton.textContent = 'Salvar Look Combinado';
    cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener('click', () => {
    resetEditor();
    setStatus('Edição cancelada.');
});

/* ==========================================================
   LOOKS SALVOS
========================================================== */

async function loadSavedLooks() {
    if (!selectedClientId) {
        savedLooks = [];
        renderSavedLooks();
        return;
    }

    const { data: looks, error } = await supabase
        .from('looks')
        .select(`
            id_look,
            nome_look,
            descricao,
            data_criacao
        `)
        .eq('id_cliente', selectedClientId)
        .order('data_criacao', { ascending: false });

    if (error) throw error;

    if (!looks.length) {
        savedLooks = [];
        renderSavedLooks();
        return;
    }

    const lookIds = looks.map(look => look.id_look);

    const { data: relations, error: relationError } = await supabase
        .from('look_pecas')
        .select('id_look, id_peca')
        .in('id_look', lookIds);

    if (relationError) throw relationError;

    savedLooks = looks.map(look => ({
        ...look,
        pieces: (relations || [])
            .filter(relation => relation.id_look === look.id_look)
            .map(relation => relation.id_peca)
    }));

    renderSavedLooks();
}

function renderSavedLooks() {
    const savedEl = $('savedLooks');

    savedEl.innerHTML = '';

    if (!selectedClientId) {
        savedEl.innerHTML =
            '<p class="lk-saved-empty">Selecione uma cliente para visualizar os looks.</p>';
        return;
    }

    if (!savedLooks.length) {
        savedEl.innerHTML =
            '<p class="lk-saved-empty">Nenhum look salvo para esta cliente.</p>';
        return;
    }

    savedLooks.forEach(look => {
        const row = document.createElement('div');

        row.className = 'lk-look';
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute(
            'aria-label',
            'Editar look ' + look.nome_look
        );

        const thumbs = document.createElement('div');
        thumbs.className = 'lk-look-thumbs';

        look.pieces.forEach(pieceId => {
            const item = findItem(pieceId);

            const box = document.createElement('span');
            box.className = 'lk-thumb';

            if (item && item.image) {
                const img = document.createElement('img');

                img.src = item.image;
                img.alt = item.name || 'Peça do look';

                box.appendChild(img);
            }

            thumbs.appendChild(box);
        });

        const meta = document.createElement('span');
        meta.className = 'lk-look-meta';

        const name = document.createElement('span');
        name.className = 'lk-look-name';
        name.textContent = look.nome_look || 'Look sem nome';

        const description = document.createElement('span');
        description.className = 'lk-look-sub';
        description.textContent = look.descricao
            ? '✦ ' + look.descricao
            : 'Sem dica da stylist';

        meta.append(name, description);

        const del = document.createElement('button');

        del.type = 'button';
        del.className = 'lk-look-del';
        del.setAttribute('aria-label', 'Excluir look');
        del.textContent = '×';

        del.addEventListener('click', async event => {
            event.stopPropagation();
            await deleteLook(look.id_look);
        });

        const open = () => editLook(look);

        row.addEventListener('click', open);

        row.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });

        row.append(meta, del, thumbs);

        savedEl.appendChild(row);
    });
}

/* ==========================================================
   ABRIR LOOK PARA EDIÇÃO
========================================================== */

function editLook(look) {
    const selectedItems = look.pieces
        .map(findItem)
        .filter(Boolean);

    if (!selectedItems.length) {
        setStatus(
            'Não foi possível localizar as peças deste look no guarda-roupa da cliente.',
            true
        );
        return;
    }

    const hasUniquePiece = selectedItems.some(
        item => item.category === 'inteira'
    );

    const mode = hasUniquePiece ? 'unica' : 'tradicional';

    applyMode(mode);

    // Posiciona cada carrossel na peça que pertence ao look.
    selectedItems.forEach(item => {
        carousels[item.category]?.goTo(item.id);
    });

    editingLookId = look.id_look;

    titleInput.value = look.nome_look || '';
    tipsInput.value = look.descricao || '';

    updateTipsCount();

    saveButton.textContent = 'Salvar alterações';
    cancelEditButton.hidden = false;

    setStatus('Editando: ' + (look.nome_look || 'Look sem nome'));

    $('stage').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/* ==========================================================
   EXCLUIR LOOK
========================================================== */

async function deleteLook(lookId) {
    if (!confirm('Deseja realmente excluir este look?')) return;

    try {
        const { error } = await supabase
            .from('looks')
            .delete()
            .eq('id_look', lookId)
            .eq('id_cliente', selectedClientId);

        if (error) throw error;

        if (editingLookId === lookId) {
            resetEditor();
        }

        setStatus('Look excluído com sucesso!');

        await loadSavedLooks();

    } catch (error) {
        console.error('Erro ao excluir look:', error);
        setStatus('Não foi possível excluir o look.', true);
    }
}

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

async function init() {
    $('year').textContent = new Date().getFullYear();

    initializeCategories();
    refreshCarousels();

    applyMode('tradicional');
    updateTipsCount();

    try {
        adminUser = await getAdminUser();

        await loadClients();

        setStatus('Selecione uma cliente para começar a montar looks.');

    } catch (error) {
        console.error('Erro ao inicializar montador de looks:', error);

        setStatus(
            error.message || 'Não foi possível carregar a tela.',
            true
        );

        $('clientSelect').disabled = true;
        saveButton.disabled = true;
    }
}

init();