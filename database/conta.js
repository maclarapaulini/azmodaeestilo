import { supabase } from './supaBase.js';
import { azGetTipoUsuario, azGetPaginaInicial } from './perfilAuth.js';

// Redireciona conforme tipo_usuario (cliente/admin)
async function redirecionarPorTipo(session) {
    const tipo = await azGetTipoUsuario(session);
    window.location.href = azGetPaginaInicial(tipo);
}

// ======================= CADASTRO =======================
const formulario = document.getElementById('cadastroForm');

if (formulario) {
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmarSenha =
            document.getElementById('confirmarSenha').value;

        // Validacao dos campos
        if (!nome || !email || !senha || !confirmarSenha) {
            alert('Preencha todos os campos.');
            return;
        }

        if (senha !== confirmarSenha) {
            alert('As senhas nao coincidem.');
            return;
        }

        if (senha.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            // Cria a conta no Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome: nome
                    }
                }
            });

            if (error) {
                throw error;
            }

            if (!data.user) {
                throw new Error('Nao foi possivel criar a conta.');
            }

            formulario.reset();

            // Se a confirmação de e-mail estiver DESLIGADA, já vem sessão
            // e o usuário entra direto. Se estiver LIGADA, não há sessão.
            if (data.session) {
                await redirecionarPorTipo(data.session);
                return;
            }

            alert(
                'Cadastro realizado! Verifique seu e-mail para ' +
                'confirmar a conta e depois faça login.'
            );

        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            alert('Nao foi possivel realizar o cadastro: ' + error.message);
        }
    });
}

// ======================= LOGIN =======================
const formularioLogin = document.getElementById('loginForm');

if (formularioLogin) {
    formularioLogin.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const senha = document.getElementById('loginSenha').value;

        if (!email || !senha) {
            alert('Informe e-mail e senha.');
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (error) {
                throw error;
            }

            // Aqui entra o redirecionamento por tipo_usuario
            await redirecionarPorTipo(data.session);

        } catch (error) {
            console.error('Erro ao entrar:', error);
            alert('Nao foi possivel entrar: ' + error.message);
        }
    });
}