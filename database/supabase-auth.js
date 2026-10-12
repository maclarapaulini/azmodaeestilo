    import { supabase } from '../database/supaBase.js';

console.log('[AUTH] Arquivo carregado.');

const $ = (id) => document.getElementById(id);

const cadastroForm = $('cadastroForm');
const loginForm = $('loginForm');

// ---------------- CADASTRO ----------------

if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        console.group('[CADASTRO] Criando conta');

        const status = $('cadastroStatus');
        const botao = cadastroForm.querySelector('button[type="submit"]');

        const nome = $('cadNome').value.trim();
        const username = $('cadUsername').value.trim();
        const email = $('cadEmail').value.trim().toLowerCase();
        const telefone = $('cadTelefone').value.trim();
        const cpf = $('cadCpf').value.trim();
        const senha = $('cadSenha').value;
        const senha2 = $('cadSenha2').value;

        status.textContent = '';

        if (!nome || !username || !email || !telefone || !cpf) {
            status.textContent = 'Preencha todos os campos.';
            console.warn('[CADASTRO] Existem campos vazios.');
            console.groupEnd();
            return;
        }

        if (username.length < 3) {
            status.textContent =
                'O usuário deve ter pelo menos 3 caracteres.';
            console.warn('[CADASTRO] Usuário inválido.');
            console.groupEnd();
            return;
        }

        if (senha.length < 6) {
            status.textContent =
                'A senha deve ter pelo menos 6 caracteres.';
            console.warn('[CADASTRO] Senha muito curta.');
            console.groupEnd();
            return;
        }

        if (senha !== senha2) {
            status.textContent = 'As senhas não coincidem.';
            console.warn('[CADASTRO] Senhas diferentes.');
            console.groupEnd();
            return;
        }

        if (cpf.replace(/\D/g, '').length !== 11) {
            status.textContent = 'Confira o CPF informado.';
            console.warn('[CADASTRO] CPF inválido.');
            console.groupEnd();
            return;
        }

        if (telefone.replace(/\D/g, '').length < 10) {
            status.textContent = 'Confira o telefone informado.';
            console.warn('[CADASTRO] Telefone inválido.');
            console.groupEnd();
            return;
        }

        if (botao) botao.disabled = true;

        try {
            console.log('[CADASTRO] Enviando dados ao Supabase Auth...');

            const { data, error } = await supabase.auth.signUp({
                email,
                password: senha,
                options: {
                    data: {
                        nome,
                        username,
                        telefone,
                        cpf
                    }
                }
            });

            if (error) {
                console.error('[CADASTRO] Erro do Supabase:', {
                    message: error.message,
                    code: error.code ?? null,
                    status: error.status ?? null
                });

                throw error;
            }

            if (!data.user) {
                throw new Error(
                    'O Supabase não retornou o usuário criado.'
                );
            }

            console.log('[CADASTRO] Usuário criado:', data.user.id);
            console.log(
                '[CADASTRO] Sessão criada:',
                Boolean(data.session)
            );

            if (data.session) {
                status.textContent =
                    'Cadastro realizado! Redirecionando para seu perfil...';

                console.log('[CADASTRO] Redirecionando para perfil.html.');

                window.location.href = 'perfil.html';
                return;
            }

            // Se não houver sessão, não fingimos que o login foi concluído.
            console.error(
                '[CADASTRO] A conta foi criada, mas nenhuma sessão foi retornada. ' +
                'Confira se a confirmação de e-mail está desativada no Supabase.'
            );

            status.textContent =
                'A conta foi criada, mas o login automático não foi iniciado. ' +
                'Confira as configurações de autenticação do projeto.';
        } catch (error) {
            console.error('[CADASTRO] Falha ao criar conta:', error);

            status.textContent =
                `Não foi possível criar a conta: ${error.message || 'erro inesperado'}`;
        } finally {
            if (botao) botao.disabled = false;
            console.groupEnd();
        }
    });
} else {
    console.error('[AUTH] Formulário cadastroForm não encontrado.');
}

// ---------------- LOGIN ----------------

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        console.group('[LOGIN] Entrando na conta');

        const status = $('loginStatus');
        const botao = loginForm.querySelector('button[type="submit"]');

        const email = $('loginIdentifier').value.trim().toLowerCase();
        const senha = $('loginPassword').value;

        status.textContent = '';

        if (!email || !senha) {
            status.textContent = 'Informe o e-mail e a senha.';
            console.warn('[LOGIN] Campos obrigatórios vazios.');
            console.groupEnd();
            return;
        }

        if (botao) botao.disabled = true;

        try {
            console.log('[LOGIN] Autenticando no Supabase...');

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: senha
            });

            if (error) {
                console.error('[LOGIN] Erro do Supabase:', {
                    message: error.message,
                    code: error.code ?? null,
                    status: error.status ?? null
                });

                throw error;
            }

            console.log('[LOGIN] Autenticação concluída:', data.user.id);

            status.textContent = 'Login realizado! Redirecionando...';
            window.location.href = 'perfil.html';
        } catch (error) {
            console.error('[LOGIN] Falha no login:', error);

            status.textContent =
                'Não foi possível entrar. Confira seu e-mail e sua senha.';
        } finally {
            if (botao) botao.disabled = false;
            console.groupEnd();
        }
    });
} else {
    console.error('[AUTH] Formulário loginForm não encontrado.');
}

console.log('[AUTH] Eventos de cadastro e login registrados.');