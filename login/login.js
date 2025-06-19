// Configurações
const USUARIOS_KEY = 'usuarios';
const TOKEN_RECUPERACAO_KEY = 'tokenRecuperacao';
const GERENTE_EMAIL = 'rebeca@cafeteria.com';
const GERENTE_SENHA = 'admin123';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = sessionStorage.getItem('usuario');
    const redirect = getRedirectUrl();
    const forceLogin = getForceLoginParam();
    
    // Só redireciona automaticamente se não for um logout forçado ou acesso manual
    if (usuarioLogado && redirect !== 'manual' && !forceLogin) {
        redirecionarUsuario(JSON.parse(usuarioLogado), redirect);
    }

    document.getElementById('form-login').addEventListener('submit', fazerLogin);
    document.getElementById('recuperacaoSenha').style.display = 'none';
});

// Função para obter URL de redirecionamento da query string
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect') || '../menu/menu.html';
}

// Função para verificar se é um logout forçado ou acesso manual ao login
function getForceLoginParam() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('logout') === 'true' || urlParams.get('force') === 'true';
}

function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) return mostrarMensagem('Por favor, preencha todos os campos', 'error');

    if (email === GERENTE_EMAIL && senha === GERENTE_SENHA) {
        const usuario = { email, tipo: 'gerente' };
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
        mostrarMensagem('Login como gerente realizado!', 'success');
        const redirect = getRedirectUrl();
        return setTimeout(() => redirecionarUsuario(usuario, redirect), 1000);
    }

    const usuarios = obterUsuarios();
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
        mostrarMensagem('Login realizado com sucesso!', 'success');
        const redirect = getRedirectUrl();
        setTimeout(() => redirecionarUsuario(usuario, redirect), 1000);
    } else {
        mostrarMensagem('Email ou senha incorretos', 'error');
    }
}

function redirecionarUsuario(usuario, redirectUrl = '../menu/menu.html') {
    window.location.href = redirectUrl;
}

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

            if (!email || !senha || !confirmar) return Swal.showValidationMessage('Todos os campos são obrigatórios');
            if (!validarEmail(email)) return Swal.showValidationMessage('Por favor, insira um email válido');
            if (senha !== confirmar) return Swal.showValidationMessage('As senhas não coincidem');
            if (senha.length < 6) return Swal.showValidationMessage('A senha deve ter pelo menos 6 caracteres');

            return { email, senha };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { email, senha } = result.value;
            const usuarios = obterUsuarios();

            if (usuarios.find(u => u.email === email)) {
                return Swal.fire('Erro', 'Este email já está cadastrado', 'error');
            }

            usuarios.push({ email, senha, tipo: 'cliente' });
            salvarUsuarios(usuarios);
            Swal.fire('Sucesso', 'Conta criada com sucesso!', 'success');
        }
    });
}

function esqueciSenha() {
    Swal.fire({
        title: 'Recuperar Senha',
        input: 'email',
        inputPlaceholder: 'Digite seu email cadastrado',
        showCancelButton: true,
        confirmButtonText: 'Enviar Token',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'Por favor, digite seu email';
            if (!validarEmail(value)) return 'Por favor, insira um email válido';
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const email = result.value;
            const usuarios = obterUsuarios();
            const usuario = usuarios.find(u => u.email === email);

            if (!usuario) return Swal.fire('Erro', 'Nenhuma conta encontrada com este email', 'error');

            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const validade = Date.now() + 300000;

            localStorage.setItem(TOKEN_RECUPERACAO_KEY, JSON.stringify({ email, token, validade }));

            Swal.fire({
                title: 'Token de Recuperação',
                html: `Token gerado para <strong>${email}</strong><br><br><strong>Token:</strong> ${token}<br><small>Válido por 5 minutos</small>`,
                icon: 'info'
            });

            document.getElementById('recuperacaoSenha').style.display = 'block';
            document.getElementById('form-login').style.display = 'none';
        }
    });
}

function confirmarNovaSenha() {
    const tokenInserido = document.getElementById('token').value.trim();
    const novaSenha = document.getElementById('novaSenha').value;

    if (!tokenInserido || !novaSenha) return mostrarMensagem('Por favor, preencha todos os campos', 'error');
    if (novaSenha.length < 6) return mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');

    const tokenSalvo = JSON.parse(localStorage.getItem(TOKEN_RECUPERACAO_KEY));
    if (!tokenSalvo || Date.now() > tokenSalvo.validade || tokenSalvo.token !== tokenInserido)
        return mostrarMensagem('Token inválido, incorreto ou expirado', 'error');

    const usuarios = obterUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email === tokenSalvo.email);

    if (usuarioIndex === -1) return mostrarMensagem('Usuário não encontrado', 'error');
    if (usuarios[usuarioIndex].senha === novaSenha) return mostrarMensagem('A nova senha deve ser diferente da atual', 'error');

    usuarios[usuarioIndex].senha = novaSenha;
    salvarUsuarios(usuarios);
    localStorage.removeItem(TOKEN_RECUPERACAO_KEY);

    mostrarMensagem('Senha alterada com sucesso!', 'success');
    setTimeout(() => {
        document.getElementById('recuperacaoSenha').style.display = 'none';
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('token').value = '';
        document.getElementById('novaSenha').value = '';
    }, 2000);
}

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
            if (!email || !senha) return Swal.showValidationMessage('Por favor, preencha todos os campos');
            return { email, senha };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { email, senha } = result.value;
            if (email === GERENTE_EMAIL && senha === GERENTE_SENHA) {
                sessionStorage.setItem('usuario', JSON.stringify({ email, tipo: 'gerente' }));
                const redirect = getRedirectUrl();
                Swal.fire('Sucesso', 'Login como gerente realizado!', 'success').then(() => {
                    window.location.href = redirect;
                });
            } else {
                Swal.fire('Erro', 'Credenciais de gerente inválidas', 'error');
            }
        }
    });
}

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