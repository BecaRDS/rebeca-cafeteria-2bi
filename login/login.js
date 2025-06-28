// Configurações
const USUARIOS_KEY = 'usuarios';
const TOKEN_RECUPERACAO_KEY = 'tokenRecuperacao';
const API_BASE_URL = 'http://localhost:3000';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de login inicializado');
    
    const usuarioLogado = sessionStorage.getItem('usuario');
    const redirect = getRedirectUrl();
    const forceLogin = getForceLoginParam();
    
    // Só redireciona automaticamente se não for um logout forçado ou acesso manual
    if (usuarioLogado && redirect !== 'manual' && !forceLogin) {
        try {
            const userData = JSON.parse(usuarioLogado);
            console.log('✅ Usuário já logado, redirecionando...', userData.email);
            redirecionarUsuario(userData, redirect);
            return;
        } catch (error) {
            console.error('❌ Erro ao analisar dados do usuário:', error);
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
    
    // Testar conectividade com a API
    testarConectividadeAPI();
});

// Função para testar conectividade com a API
async function testarConectividadeAPI() {
    try {
        console.log('🔍 Testando conectividade com a API...');
        const response = await fetch(`${API_BASE_URL}/administrators`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API conectada com sucesso. Administradores encontrados:', data.length);
            return true;
        } else {
            console.error('❌ Erro na API:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao conectar com a API:', error.message);
        console.log('🔧 Verifique se o servidor está rodando em http://localhost:3000');
        return false;
    }
}

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

// Função principal de login otimizada
async function fazerLogin(e) {
    e.preventDefault();
    
    const emailElement = document.getElementById('email');
    const senhaElement = document.getElementById('senha');
    
    if (!emailElement || !senhaElement) {
        return mostrarMensagem('Elementos do formulário não encontrados', 'error');
    }

    const email = emailElement.value.trim();
    const senha = senhaElement.value;

    console.log('🚀 Iniciando login para:', email);

    // Validações básicas
    if (!email || !senha) {
        return mostrarMensagem('Por favor, preencha todos os campos', 'error');
    }

    if (!validarEmail(email)) {
        return mostrarMensagem('Por favor, insira um email válido', 'error');
    }

    // Mostrar loading
    mostrarMensagem('Verificando credenciais...', 'info');

    try {
        // Primeiro: Tentar autenticação via API (administradores)
        const isAdminAuth = await tentarAutenticacaoAdmin(email, senha);
        if (isAdminAuth) {
            return; // Login realizado com sucesso
        }

        // Segundo: Verificar usuários locais (clientes)
        const isClientAuth = tentarAutenticacaoLocal(email, senha);
        if (isClientAuth) {
            return; // Login realizado com sucesso
        }

        // Se chegou até aqui, credenciais inválidas
        console.log('❌ Credenciais inválidas para todos os métodos');
        mostrarMensagem('Email ou senha incorretos', 'error');
        
    } catch (error) {
        console.error('❌ Erro geral no login:', error);
        mostrarMensagem('Erro ao realizar login. Tente novamente.', 'error');
    }
}

async function tentarAutenticacaoAdmin(email, senha) {
    try {
        console.log('🔍 Tentando autenticação de administrador...', { email, senha });
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        console.log('Resposta da API:', {
            status: response.status,
            ok: response.ok
        });

        if (response.ok) {
            const authResult = await response.json();
            console.log('✅ Resultado da autenticação:', authResult);
            
            if (authResult.success && authResult.user) {
                const userData = {
                    id: authResult.user.id,
                    email: authResult.user.email,
                    tipo: authResult.user.tipo
                };
                
                sessionStorage.setItem('usuario', JSON.stringify(userData));
                mostrarMensagem('Login de administrador realizado com sucesso!', 'success');
                
                const redirect = getRedirectUrl();
                setTimeout(() => redirecionarUsuario(userData, redirect), 1000);
                return true;
            }
        }
        
        // Se chegou aqui, a autenticação falhou
        const errorData = await response.json().catch(() => null);
        console.log('❌ Falha na autenticação:', errorData || response.statusText);
        return false;
        
    } catch (error) {
        console.error('❌ Erro na autenticação admin:', error);
        return false;
    }
}


// Função para tentar autenticação local (clientes)
function tentarAutenticacaoLocal(email, senha) {
    try {
        console.log('🔍 Verificando usuários locais...');
        const usuariosLocais = obterUsuarios();
        console.log('👥 Usuários locais encontrados:', usuariosLocais.length);
        
        const usuarioLocal = usuariosLocais.find(u => 
            u.email === email && u.senha === senha
        );
        
        if (usuarioLocal) {
            console.log('✅ Cliente local autenticado:', usuarioLocal.email);
            const userData = { 
                email: usuarioLocal.email, 
                tipo: usuarioLocal.tipo || 'cliente' 
            };
            
            sessionStorage.setItem('usuario', JSON.stringify(userData));
            mostrarMensagem('Login realizado com sucesso!', 'success');
            
            const redirect = getRedirectUrl();
            setTimeout(() => redirecionarUsuario(userData, redirect), 1000);
            return true;
        }
        
        console.log('❌ Cliente local não encontrado');
        return false;
        
    } catch (error) {
        console.error('❌ Erro na autenticação local:', error);
        return false;
    }
}

function redirecionarUsuario(usuario, redirectUrl = '../menu/menu.html') {
    if (!usuario || !usuario.email) {
        console.error('Dados do usuário inválidos para redirecionamento');
        return;
    }
    console.log('🚀 Redirecionando usuário para:', redirectUrl);
    window.location.href = redirectUrl;
}

// Função para criar conta
async function criarConta() {
    if (typeof Swal === 'undefined') {
        alert('Biblioteca SweetAlert2 não carregada. Verifique a conexão com a internet.');
        return;
    }

    const { value: formValues } = await Swal.fire({
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
    });

    if (formValues) {
        const { email, senha } = formValues;
        
        try {
            // Verificar se é email de administrador
            const isAdminEmail = await verificarEmailAdmin(email);
            if (isAdminEmail) {
                return Swal.fire('Erro', 'Este email já está reservado para administradores', 'error');
            }

            // Verificar se já existe localmente
            const usuarios = obterUsuarios();
            if (usuarios.find(u => u.email === email)) {
                return Swal.fire('Erro', 'Este email já está cadastrado', 'error');
            }

            // Criar conta
            usuarios.push({ email, senha, tipo: 'cliente' });
            salvarUsuarios(usuarios);
            Swal.fire('Sucesso', 'Conta criada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            Swal.fire('Erro', 'Erro ao verificar dados. Tente novamente.', 'error');
        }
    }
}

// Função para verificar se email é de administrador
async function verificarEmailAdmin(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/administrators`);
        if (response.ok) {
            const administradores = await response.json();
            return administradores.some(admin => admin.email === email);
        }
    } catch (error) {
        console.error('Erro ao verificar administradores:', error);
    }
    return false;
}

// Função esqueci senha
async function esqueciSenha() {
    if (typeof Swal === 'undefined') {
        alert('Biblioteca SweetAlert2 não carregada.');
        return;
    }

    const { value: email } = await Swal.fire({
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
    });

    if (email) {
        try {
            // Verificar se é email de administrador
            const isAdminEmail = await verificarEmailAdmin(email);
            if (isAdminEmail) {
                return Swal.fire('Erro', 'Não é possível recuperar senha de administrador por este método', 'error');
            }

            // Verificar se existe localmente
            const usuarios = obterUsuarios();
            const usuario = usuarios.find(u => u.email === email);

            if (!usuario) {
                return Swal.fire('Erro', 'Nenhuma conta encontrada com este email', 'error');
            }

            // Gerar token
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const validade = Date.now() + 300000; // 5 minutos

            localStorage.setItem(TOKEN_RECUPERACAO_KEY, JSON.stringify({ email, token, validade }));

            await Swal.fire({
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
            
        } catch (error) {
            console.error('Erro ao processar recuperação:', error);
            Swal.fire('Erro', 'Erro ao processar solicitação. Tente novamente.', 'error');
        }
    }
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
    
    const tokenElement = document.getElementById('token');
    const novaSenhaElement = document.getElementById('novaSenha');
    
    if (tokenElement) tokenElement.value = '';
    if (novaSenhaElement) novaSenhaElement.value = '';
    
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