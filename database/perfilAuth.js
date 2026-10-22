import { supabase } from './supaBase.js';

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
        id: session.user.id,
        nome: perfil.nome,
        username: perfil.username,
        email: perfil.email,
        telefone: perfil.telefone,
        cpf: perfil.cpf,
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

    const { data, error } = await supabase
        .from('usuarios')
        .update(fields)
        .eq('auth_user_id', session.user.id)
        .select()
        .single();

    if (error) {
        console.error('[AUTH] Erro ao atualizar usuário:', error);
        return null;
    }

    return data;
}