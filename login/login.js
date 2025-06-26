// Configurações
const USUARIOS_KEY = 'usuarios';
const TOKEN_RECUPERACAO_KEY = 'tokenRecuperacao';
const API_BASE_URL = 'http://localhost:3000';

// Administradores hardcoded (baseado no CSV)
const ADMINS_HARDCODED = [
    { email: 'rebeca@cafeteria.com', senha: 'admin123', tipo: 'gerente' },
    { email: 'cliente1@cafeteria.com', senha: '1234567', tipo: 'gerente' },
    { email: 'cliente@cafeteria.com', senha: '1234567', tipo: 'gerente' }
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = sessionStorage.getItem('usuario');
    const redirect = getRedirectUrl();
    const forceLogin = getForceLoginParam();
    
    // Só redireciona automaticamente se não for um logout forçado ou acesso manual
    if (usuarioLogado && redirect !== 'manual' && !forceLogin) {
        try {
            redirecionarUsuario(JSON.parse(usuarioLogado), redirect);
        } catch (error) {
            console.error('Erro ao analisar dados do usuário:', error);
            sessionStorage.removeItem('usuario');
        }
    }

    // Event listeners
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', fazerLogin);
    }

    // Esconder seção de recuperação por padrão
    const recuperacaoSection = document.getElementById('recuperacaoSenha');
    if (recuperacaoSection) {
        recuperacaoSection.style.display = 'none';
    }
});

// Função para obter URL de redirecionamento
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect') || '../menu/menu.html';
}

// Função para verificar se é um logout forçado
function getForceLoginParam() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('logout') === 'true' || urlParams.get('force') === 'true';
}

// Função principal de login - SIMPLIFICADA
async function fazerLogin(e) {
    e.preventDefault();
    
    const emailElement = document.getElementById('email');
    const senhaElement = document.getElementById('senha');
    
    if (!emailElement || !senhaElement) {
        return mostrarMensagem('Elementos do formulário não encontrados', 'error');
    }

    const email = emailElement.value.trim();
    const senha = senhaElement.value;

    if (!email || !senha) {
        return mostrarMensagem('Por favor, preencha todos os campos', 'error');
    }

    if (!validarEmail(email)) {
        return mostrarMensagem('Por favor, insira um email válido', 'error');
    }

    try {
        // 1. Primeiro verificar administradores hardcoded
        const adminEncontrado = ADMINS_HARDCODED.find(admin => 
            admin.email === email && admin.senha === senha
        );

        if (adminEncontrado) {
            const userData = { 
                email: adminEncontrado.email, 
                tipo: adminEncontrado.tipo 
            };
            sessionStorage.setItem('usuario', JSON.stringify(userData));
            mostrarMensagem('Login de administrador realizado com sucesso!', 'success');
            const redirect = getRedirectUrl();
            setTimeout(() => redirecionarUsuario(userData, redirect), 1000);
            return;
        }

        // 2. Se não é admin, verificar usuários locais (clientes)
        const usuariosLocais = obterUsuarios();
        const usuarioLocal = usuariosLocais.find(u => 
            u.email === email && u.senha === senha
        );
        
        if (usuarioLocal) {
            const userData = { 
                email: usuarioLocal.email, 
                tipo: usuarioLocal.tipo || 'cliente' 
            };
            sessionStorage.setItem('usuario', JSON.stringify(userData));
            mostrarMensagem('Login realizado com sucesso!', 'success');
            const redirect = getRedirectUrl();
            setTimeout(() => redirecionarUsuario(userData, redirect), 1000);
            return;
        }

        // 3. Se chegou até aqui, credenciais inválidas
        mostrarMensagem('Email ou senha incorretos', 'error');
        
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarMensagem('Erro ao realizar login. Tente novamente.', 'error');
    }
}

function redirecionarUsuario(usuario, redirectUrl = '../menu/menu.html') {
    if (!usuario || !usuario.email) {
        console.error('Dados do usuário inválidos para redirecionamento');
        return;
    }
    window.location.href = redirectUrl;
}

function criarConta() {
    // Verificar se SweetAlert2 está disponível
    if (typeof Swal === 'undefined') {
        alert('Biblioteca SweetAlert2 não carregada. Verifique a conexão com a internet.');
        return;
    }

    Swal.fire({
        title: 'Criar Nova Conta',
        html:
            '<input id="swal-email" class="swal2-input" placeholder="Email" type="email">' +
            '<input id="swal-senha" type="password" class="swal2-input" placeholder="Senha">' +
            '<input id="swal-confirmar" type="password" class="swal2-input" placeholder="Confirmar Senha">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Criar Conta',
        cancelButtonText: 'Cancelar',
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
            
            // Verificar se email já existe nos admins
            const isAdminEmail = ADMINS_HARDCODED.some(admin => admin.email === email);
            if (isAdminEmail) {
                return Swal.fire('Erro', 'Este email já está reservado para administradores', 'error');
            }

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
    if (typeof Swal === 'undefined') {
        alert('Biblioteca SweetAlert2 não carregada.');
        return;
    }

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
            
            // Verificar se é email de admin
            const isAdminEmail = ADMINS_HARDCODED.some(admin => admin.email === email);
            if (isAdminEmail) {
                return Swal.fire('Erro', 'Não é possível recuperar senha de administrador por este método', 'error');
            }

            const usuarios = obterUsuarios();
            const usuario = usuarios.find(u => u.email === email);

            if (!usuario) {
                return Swal.fire('Erro', 'Nenhuma conta encontrada com este email', 'error');
            }

            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const validade = Date.now() + 300000; // 5 minutos

            localStorage.setItem(TOKEN_RECUPERACAO_KEY, JSON.stringify({ email, token, validade }));

            Swal.fire({
                title: 'Token de Recuperação',
                html: `Token gerado para <strong>${email}</strong><br><br><strong>Token:</strong> ${token}<br><small>Válido por 5 minutos</small>`,
                icon: 'info',
                confirmButtonText: 'Entendi'
            });

            // Mostrar seção de recuperação
            const recuperacaoSection = document.getElementById('recuperacaoSenha');
            const formLogin = document.getElementById('form-login');
            
            if (recuperacaoSection && formLogin) {
                recuperacaoSection.style.display = 'block';
                formLogin.style.display = 'none';
            }
        }
    });
}

function confirmarNovaSenha() {
    const tokenElement = document.getElementById('token');
    const novaSenhaElement = document.getElementById('novaSenha');
    
    if (!tokenElement || !novaSenhaElement) {
        return mostrarMensagem('Elementos do formulário não encontrados', 'error');
    }

    const tokenInserido = tokenElement.value.trim();
    const novaSenha = novaSenhaElement.value;

    if (!tokenInserido || !novaSenha) {
        return mostrarMensagem('Por favor, preencha todos os campos', 'error');
    }
    
    if (novaSenha.length < 6) {
        return mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
    }

    const tokenSalvo = JSON.parse(localStorage.getItem(TOKEN_RECUPERACAO_KEY) || 'null');
    
    if (!tokenSalvo || Date.now() > tokenSalvo.validade || tokenSalvo.token !== tokenInserido) {
        return mostrarMensagem('Token inválido, incorreto ou expirado', 'error');
    }

    const usuarios = obterUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email === tokenSalvo.email);

    if (usuarioIndex === -1) {
        return mostrarMensagem('Usuário não encontrado', 'error');
    }
    
    if (usuarios[usuarioIndex].senha === novaSenha) {
        return mostrarMensagem('A nova senha deve ser diferente da atual', 'error');
    }

    usuarios[usuarioIndex].senha = novaSenha;
    salvarUsuarios(usuarios);
    localStorage.removeItem(TOKEN_RECUPERACAO_KEY);

    mostrarMensagem('Senha alterada com sucesso!', 'success');
    
    setTimeout(() => {
        voltarParaLogin();
    }, 2000);
}

function voltarParaLogin() {
    const recuperacaoSection = document.getElementById('recuperacaoSenha');
    const formLogin = document.getElementById('form-login');
    
    if (recuperacaoSection && formLogin) {
        recuperacaoSection.style.display = 'none';
        formLogin.style.display = 'block';
    }
    
    // Limpar campos
    const tokenElement = document.getElementById('token');
    const novaSenhaElement = document.getElementById('novaSenha');
    
    if (tokenElement) tokenElement.value = '';
    if (novaSenhaElement) novaSenhaElement.value = '';
    
    // Remover token de recuperação
    localStorage.removeItem(TOKEN_RECUPERACAO_KEY);
}

// Funções auxiliares
function obterUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');
    } catch (error) {
        console.error('Erro ao obter usuários do localStorage:', error);
        return [];
    }
}

function salvarUsuarios(usuarios) {
    try {
        localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    } catch (error) {
        console.error('Erro ao salvar usuários no localStorage:', error);
    }
}

function mostrarMensagem(msg, tipo = 'info') {
    const element = document.getElementById('msg-status');
    if (!element) {
        console.warn('Elemento msg-status não encontrado');
        return;
    }

    element.textContent = msg;
    element.className = `status-message ${tipo}`;
    element.style.display = 'block';

    if (tipo !== 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
            element.style.display = 'none';
        }, 5000);
    }
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function togglePassword() {
    const senhaInput = document.getElementById('senha');
    const toggleIcon = document.querySelector('.toggle-password i');
    
    if (!senhaInput || !toggleIcon) {
        console.warn('Elementos para toggle de senha não encontrados');
        return;
    }

    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        senhaInput.type = 'password';
        toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Funções globais para outras páginas
function logout() {
    sessionStorage.removeItem('usuario');
    window.location.href = '../login/login.html?logout=true';
}

function verificarLogin() {
    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) {
        window.location.href = '../login/login.html?force=true';
        return null;
    }
    
    try {
        return JSON.parse(usuario);
    } catch (error) {
        console.error('Erro ao analisar dados do usuário:', error);
        sessionStorage.removeItem('usuario');
        window.location.href = '../login/login.html?force=true';
        return null;
    }
}