
import { supabase } from './supaBase.js';

const formulario = document.getElementById('cadastroForm');

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

        alert(
            'Cadastro realizado! Verifique seu e-mail, ' +
            'caso a confirmacao esteja habilitada.'
        );

        formulario.reset();

        // Opcional: redirecione para o login
        // window.location.href = '../login.html';

    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        alert('Nao foi possivel realizar o cadastro: ' + error.message);
    }
});
