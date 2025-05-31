// Configurações
const USUARIOS_KEY = 'usuarios';
const TOKEN_RECUPERACAO_KEY = 'tokenRecuperacao';
const GERENTE_EMAIL = 'rebeca@cafeteria.com';
const GERENTE_SENHA = 'admin123';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já está logado
    const usuarioLogado = sessionStorage.getItem('usuario');
    if (usuarioLogado) {
        redirecionarUsuario(JSON.parse(usuarioLogado));
    }

    // Configurar formulário de login
    const formLogin = document.getElementById('form-login');
    formLogin.addEventListener('submit', fazerLogin);

    // Esconder container de recuperação inicialmente
    document.getElementById('recuperacaoSenha').style.display = 'none';
});

// Função para fazer login
function fazerLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        mostrarMensagem('Por favor, preencha todos os campos', 'error');
        return;
    }

    // Verifica se é login de gerente
    if (email === GERENTE_EMAIL && senha === GERENTE_SENHA) {
        const usuario = { email, tipo: 'gerente' };
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
        mostrarMensagem('Login como gerente realizado!', 'success');
        setTimeout(() => redirecionarUsuario(usuario), 1000);
        return;
    }

    // Verifica login de cliente normal
    const usuarios = obterUsuarios();
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
        mostrarMensagem('Login realizado com sucesso!', 'success');
        setTimeout(() => redirecionarUsuario(usuario), 1000);
    } else {
        mostrarMensagem('Email ou senha incorretos', 'error');
    }
}

// Redirecionar usuário para o menu principal
function redirecionarUsuario(usuario) {
    // Todos os usuários são redirecionados para o menu principal
    // As opções específicas do gerente são controladas pelo menu.html
    window.location.href = '../menu/menu.html';
}

// Criar nova conta
function criarConta() {
    Swal.fire({
        title: 'Criar Nova Conta',
        html:
            '<input id="swal-email" class="swal2-input" placeholder="Email">' +
            '<input id="swal-senha" type="password" class="swal2-input" placeholder="Senha">' +
            '<input id="swal-confirmar" type="password" class="swal2-input" placeholder="Confirmar Senha">',
        focusConfirm: false,
        preConfirm: () => {
            const email = document.getElementById('swal-email').value.trim();
            const senha = document.getElementById('swal-senha').value;
            const confirmar = document.getElementById('swal-confirmar').value;

            if (!email || !senha || !confirmar) {
                Swal.showValidationMessage('Todos os campos são obrigatórios');
                return false;
            }

            if (!validarEmail(email)) {
                Swal.showValidationMessage('Por favor, insira um email válido');
                return false;
            }

            if (senha !== confirmar) {
                Swal.showValidationMessage('As senhas não coincidem');
                return false;
            }

            if (senha.length < 6) {
                Swal.showValidationMessage('A senha deve ter pelo menos 6 caracteres');
                return false;
            }

            return { email, senha };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { email, senha } = result.value;
            const usuarios = obterUsuarios();

            if (usuarios.find(u => u.email === email)) {
                Swal.fire('Erro', 'Este email já está cadastrado', 'error');
                return;
            }

            usuarios.push({ email, senha, tipo: 'cliente' });
            salvarUsuarios(usuarios);
            Swal.fire('Sucesso', 'Conta criada com sucesso!', 'success');
        }
    });
}


// Esqueci a senha - Versão Corrigida
function esqueciSenha() {
    Swal.fire({
        title: 'Recuperar Senha',
        input: 'email',
        inputPlaceholder: 'Digite seu email cadastrado',
        showCancelButton: true,
        confirmButtonText: 'Enviar Token',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Por favor, digite seu email';
            }
            if (!validarEmail(value)) {
                return 'Por favor, insira um email válido';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const email = result.value;
            const usuarios = obterUsuarios();
            const usuario = usuarios.find(u => u.email === email);

            if (!usuario) {
                Swal.fire('Erro', 'Nenhuma conta encontrada com este email', 'error');
                return;
            }

            // Gerar token numérico de 6 dígitos
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const validade = Date.now() + 300000; // 5 minutos em milissegundos

            // Armazenar token no localStorage
            localStorage.setItem(TOKEN_RECUPERACAO_KEY, JSON.stringify({
                email: email,
                token: token,
                validade: validade
            }));

            // Mostrar o token (em produção, enviaria por email)
            Swal.fire({
                title: 'Token de Recuperação',
                html: `Um token foi gerado para <strong>${email}</strong><br><br>
                       <strong>Token:</strong> ${token}<br><br>
                       <small>Você pode usá-lo nos próximos 5 minutos</small>`,
                icon: 'info'
            });

            // Mostrar o formulário de recuperação
            document.getElementById('recuperacaoSenha').style.display = 'block';
            document.getElementById('form-login').style.display = 'none';
        }
    });
}

// Confirmar nova senha - Versão Corrigida
function confirmarNovaSenha() {
    const tokenInserido = document.getElementById('token').value.trim();
    const novaSenha = document.getElementById('novaSenha').value;

    // Validações básicas
    if (!tokenInserido || !novaSenha) {
        mostrarMensagem('Por favor, preencha todos os campos', 'error');
        return;
    }

    if (novaSenha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    // Recuperar dados do token
    const tokenSalvo = JSON.parse(localStorage.getItem(TOKEN_RECUPERACAO_KEY));
    
    // Verificar se o token existe e está válido
    if (!tokenSalvo) {
        mostrarMensagem('Token inválido ou expirado', 'error');
        return;
    }

    if (Date.now() > tokenSalvo.validade) {
        mostrarMensagem('Token expirado. Solicite um novo.', 'error');
        localStorage.removeItem(TOKEN_RECUPERACAO_KEY);
        return;
    }

    if (tokenSalvo.token !== tokenInserido) {
        mostrarMensagem('Token incorreto', 'error');
        return;
    }

    // Atualizar a senha do usuário
    const usuarios = obterUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email === tokenSalvo.email);

    if (usuarioIndex === -1) {
        mostrarMensagem('Usuário não encontrado', 'error');
        return;
    }

    // Verificar se a nova senha é diferente da atual
    if (usuarios[usuarioIndex].senha === novaSenha) {
        mostrarMensagem('A nova senha deve ser diferente da atual', 'error');
        return;
    }

    // Atualizar a senha
    usuarios[usuarioIndex].senha = novaSenha;
    salvarUsuarios(usuarios);
    
    // Limpar o token usado
    localStorage.removeItem(TOKEN_RECUPERACAO_KEY);

    // Feedback e reset do formulário
    mostrarMensagem('Senha alterada com sucesso!', 'success');
    
    setTimeout(() => {
        document.getElementById('recuperacaoSenha').style.display = 'none';
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('token').value = '';
        document.getElementById('novaSenha').value = '';
    }, 2000);
}


// Entrar como gerente (função mantida para compatibilidade)
function entrarComoGerente() {
    Swal.fire({
        title: 'Acesso Gerente',
        html:
            '<input id="swal-email" class="swal2-input" placeholder="Email" value="rebeca@cafeteria.com">' +
            '<input id="swal-senha" type="password" class="swal2-input" placeholder="Senha">',
        focusConfirm: false,
        preConfirm: () => {
            const email = document.getElementById('swal-email').value.trim();
            const senha = document.getElementById('swal-senha').value;

            if (!email || !senha) {
                Swal.showValidationMessage('Por favor, preencha todos os campos');
                return false;
            }

            return { email, senha };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { email, senha } = result.value;
            
            if (email === GERENTE_EMAIL && senha === GERENTE_SENHA) {
                sessionStorage.setItem('usuario', JSON.stringify({ 
                    email, 
                    tipo: 'gerente' 
                }));
                Swal.fire('Sucesso', 'Login como gerente realizado!', 'success')
                    .then(() => {
                        window.location.href = '../menu/menu.html';
                    });
            } else {
                Swal.fire('Erro', 'Credenciais de gerente inválidas', 'error');
            }
        }
    });
}

// Utilitários
function obterUsuarios() {
    return JSON.parse(localStorage.getItem(USUARIOS_KEY)) || [];
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
}

function mostrarMensagem(msg, tipo = 'info') {
    const element = document.getElementById('msg-status');
    element.textContent = msg;
    element.className = `status-message ${tipo}`;
    
    // Esconder mensagem após 5 segundos (exceto para sucesso)
    if (tipo !== 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 5000);
    }
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function togglePassword() {
    const senhaInput = document.getElementById('senha');
    const toggleIcon = document.querySelector('.toggle-password i');
    
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        senhaInput.type = 'password';
        toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}