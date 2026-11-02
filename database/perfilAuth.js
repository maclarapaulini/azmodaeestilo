import { supabase } from './supaBase.js';

// ---------------------------------------------------------------
// Página inicial de cada tipo de usuário (coluna tipo_usuario)
// ---------------------------------------------------------------
const PAGINAS_POR_TIPO = {
    cliente: 'montar-look.html',
    administradora: 'montar-look.html', // valor real aceito pelo CHECK da tabela
    admin: 'montar-look.html'           // TODO: troque se a admin tiver outra página
};
const PAGINA_PADRAO = 'perfil.html';

/** Retorna 'cliente', 'admin' ou null (sem sessão / sem linha em usuarios). */
export async function azGetTipoUsuario(session) {
    if (!session) return null;

    const { data, error } = await supabase
        .from('usuarios')
        .select('tipo_usuario')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

    if (error) {
        console.error('[AUTH] Erro ao buscar tipo_usuario:', error);
        return null;
    }

    return data?.tipo_usuario || null;
}

/** Retorna a página para onde o usuário deve ir, conforme o tipo. */
export function azGetPaginaInicial(tipo) {
    return PAGINAS_POR_TIPO[tipo] || PAGINA_PADRAO;
}

/** Atalho: busca o tipo e redireciona. Use após login/cadastro com sessão. */
export async function azRedirecionarPorTipo(session) {
    const tipo = await azGetTipoUsuario(session);
    window.location.href = azGetPaginaInicial(tipo);
}

// ---------------------------------------------------------------

export async function azGetCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    const { data: perfil, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

    if (error) {
        console.error('[AUTH] Erro ao buscar perfil:', error);
        return null;
    }

    return {
        id: session.user.id,            // UUID do Supabase Auth
        id_usuario: perfil.id_usuario,  // id inteiro da tabela usuarios (FKs)
        nome: perfil.nome,
        username: perfil.username,
        email: perfil.email,
        telefone: perfil.telefone,
        cpf: perfil.cpf,
        tipo_usuario: perfil.tipo_usuario,
        measurements: perfil.measurements || null
    };
}

export async function azRequireAuth() {
    const user = await azGetCurrentUser();

    if (!user) {
        console.warn('[AUTH] Sem sessão ativa, redirecionando para conta.html.');
        window.location.href = 'conta.html';
        return null;
    }

    return user;
}

export async function azLogout() {
    await supabase.auth.signOut();
}

export async function azUpdateCurrentUser(fields) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Segurança: nunca permite alterar o tipo de usuário por aqui.
    // (Proteja também a coluna com RLS/trigger no Supabase.)
    const { tipo_usuario, ...camposPermitidos } = fields;

    const { data, error } = await supabase
        .from('usuarios')
        .update(camposPermitidos)
        .eq('auth_user_id', session.user.id)
        .select()
        .single();

    if (error) {
        console.error('[AUTH] Erro ao atualizar usuário:', error);
        return null;
    }

    return data;
}