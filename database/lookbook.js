
import { supabase } from './supaBase.js';
import { azGetCurrentUser } from './perfilAuth.js';

const MODES = {
    tradicional: ['cima', 'baixo', 'calcados'],
    unica: ['inteira', 'calcados']
};

const CATEGORIAS = {
    1: 'cima',
    2: 'baixo',
    3: 'inteira',
    4: 'calcados'
};

/**
 * Busca os looks atribuídos ao cliente autenticado.
 */
export async function carregarLooksDoCliente() {
    // Verifica o usuário autenticado e recupera seu cadastro.
    const usuario = await azGetCurrentUser();

    if (!usuario) {
        throw new Error('Nenhum usuário autenticado.');
    }

    if (usuario.tipo_usuario !== 'cliente') {
        throw new Error('O Lookbook está disponível apenas para clientes.');
    }

    // Busca somente os looks associados ao cliente.
    const { data, error } = await supabase
        .from('looks')
        .select(`
            id_look,
            id_cliente,
            nome_look,
            descricao,
            data_criacao,
            look_pecas (
                id_peca,
                pecas_roupa (
                    id_peca,
                    nome_peca,
                    tamanho,
                    cor,
                    marca,
                    descricao,
                    id_categoria,
                    peca_imagens (
                        url_imagem
                    )
                )
            )
        `)
        .eq('id_cliente', usuario.id_usuario)
        .order('data_criacao', { ascending: false });

    if (error) {
        console.error('Erro ao buscar looks:', error);
        throw error;
    }

    return (data || []).map((look, index) => {
        const pecas = (look.look_pecas || [])
            .map(relacao => relacao.pecas_roupa)
            .filter(Boolean);

        // Organiza as peças conforme suas categorias.
        const pecasPorCategoria = {};

        pecas.forEach(peca => {
            const categoria = CATEGORIAS[Number(peca.id_categoria)];

            if (!categoria) return;

            const imagens = peca.peca_imagens || [];
            const imagem = imagens[0]?.url_imagem || '';

            pecasPorCategoria[categoria] = {
                id: peca.id_peca,
                name: peca.nome_peca,
                size: peca.tamanho,
                color: peca.cor,
                brand: peca.marca,
                description: peca.descricao,
                image: imagem
            };
        });

        // Looks com peça única usam o modo "unica".
        const mode = pecasPorCategoria.inteira
            ? 'unica'
            : 'tradicional';

        const categoriasDoLook = MODES[mode];

        const pieces = categoriasDoLook.map(cat => ({
            cat,
            item: pecasPorCategoria[cat] || null
        }));

        return {
            id: look.id_look,
            mode,
            createdAt: look.data_criacao
                ? new Date(look.data_criacao).getTime()
                : 0,
            title: (look.nome_look || '').trim() || `Look nº ${index + 1}`,
            occasion: '',
            climate: '',
            tips: (look.descricao || '').trim(),
            pieces
        };
    });
}
