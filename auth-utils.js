// Utilitário para gerenciar estado de autenticação em todas as páginas
// Arquivo: auth-utils.js

// Função para verificar se o usuário está logado
function isUserLoggedIn() {
    try {
        const usuario = sessionStorage.getItem('usuario');
        return usuario !== null && usuario !== undefined;
    } catch (error) {
        console.error('Erro ao verificar status de login:', error);
        return false;
    }
}

// Função para obter dados do usuário logado
function getLoggedUser() {
    try {
        const usuario = sessionStorage.getItem('usuario');
        return usuario ? JSON.parse(usuario) : null;
    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        return null;
    }
}

// Função para fazer logout
function logout() {
    try {
        sessionStorage.removeItem('usuario');
        // Atualizar interface após logout
        updateAuthUI();
        return true;
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return false;
    }
}

// Função para atualizar a interface baseada no status de autenticação
function updateAuthUI() {
    const isLoggedIn = isUserLoggedIn();
    
    // Esconder/mostrar botão de login
    const botaoLogin = document.getElementById('botao-login');
    if (botaoLogin) {
        botaoLogin.style.display = isLoggedIn ? 'none' : 'block';
    }
    
    // Esconder/mostrar botão de logout
    const botaoLogout = document.getElementById('botao-logout');
    if (botaoLogout) {
        botaoLogout.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    // Verificar se é gerente para mostrar botões específicos
    const usuario = getLoggedUser();
    const gerenteBotoes = document.getElementById('gerente-botoes');
    if (gerenteBotoes && usuario) {
        gerenteBotoes.style.display = usuario.tipo === 'gerente' ? 'block' : 'none';
    }
}

// Função para configurar eventos de logout
function setupLogoutButton() {
    const botaoLogout = document.getElementById('botao-logout');
    if (botaoLogout) {
        botaoLogout.addEventListener('click', () => {
            if (logout()) {
                alert('Você foi desconectado.');
                window.location.href = '../login/login.html';
            }
        });
    }
}

// Função para inicializar o sistema de autenticação em qualquer página
function initAuthSystem() {
    // Atualizar interface baseada no status atual
    updateAuthUI();
    
    // Configurar botão de logout
    setupLogoutButton();
    
    // Escutar mudanças no sessionStorage (para sincronizar entre abas)
    window.addEventListener('storage', (e) => {
        if (e.key === 'usuario') {
            updateAuthUI();
        }
    });
}

// Inicializar automaticamente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initAuthSystem);

