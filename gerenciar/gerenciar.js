// Configuração
const CSV_FILE_NAME = 'administradores.csv';
let gerentes = [];

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar se o usuário é gerente antes de tudo
    if (!verificarPermissaoGerente()) {
        alert('Acesso negado! Apenas gerentes podem acessar esta página.');
        window.location.href = '../menu/menu.html';
        return;
    }

    // Elementos do DOM
    const adminForm = document.getElementById("admin-form");
    const adminIdInput = document.getElementById("admin-id");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const tipoInput = document.getElementById("tipo");
    const adminTableBody = document.querySelector("#admin-table tbody");
    const saveButton = adminForm.querySelector("button[type='submit']");
    const cancelButton = document.getElementById("cancel-edit");

    // Inicializar aplicação
    await initializeApp();

    // Função para verificar permissão de gerente
    function verificarPermissaoGerente() {
        try {
            const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
            return usuarioLogado && usuarioLogado.tipo === 'gerente';
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return false;
        }
    }

    // Função para inicializar a aplicação
    async function initializeApp() {
        try {
            await loadAdministrators();
            showFileInstructions();
        } catch (error) {
            console.error("Erro ao inicializar aplicação:", error);
            adminTableBody.innerHTML = `<tr><td colspan='4' class='error'>Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    // Função para mostrar instruções sobre o arquivo
    function showFileInstructions() {
        if (gerentes.length === 0) {
            adminTableBody.innerHTML = `
                <tr><td colspan='4' class='loading'>
                    Nenhum gerente cadastrado. Use o formulário acima para cadastrar novos gerentes.
                </td></tr>
            `;
        }
    }

    // Função para carregar CSV do input file
    window.carregarCSV = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        const administradoresCSV = parseCSVContent(e.target.result);
                        let adicionados = 0;

                        // Enviar cada administrador para a API
                        for (const admin of administradoresCSV) {
                            try {
                                const response = await fetch('http://localhost:3000/administrators', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(admin)
                                });

                                if (response.ok) {
                                    adicionados++;
                                } else {
                                    const errorData = await response.json();
                                    console.warn(`Erro ao adicionar ${admin.email}: ${errorData.message}`);
                                }
                            } catch (error) {
                                console.error(`Erro ao adicionar ${admin.email}:`, error);
                            }
                        }

                        await loadAdministrators();
                        showSuccess(`Arquivo ${file.name} processado! ${adicionados} de ${administradoresCSV.length} gerentes adicionados.`);
                    } catch (error) {
                        alert(`Erro ao ler arquivo CSV: ${error.message}`);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // Função para fazer parse do conteúdo CSV
    function parseCSVContent(content) {
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            throw new Error('Arquivo CSV vazio');
        }

        // Verifica se tem cabeçalho correto
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        if (!headers.includes('email') || !headers.includes('senha') || !headers.includes('tipo')) {
            throw new Error('Arquivo CSV deve conter as colunas: email, senha, tipo');
        }

        // Carrega dados
        const administradores = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 3 && values[0].trim()) {
                administradores.push({
                    email: values[0].trim(),
                    senha: values[1].trim(),
                    tipo: values[2].trim()
                });
            }
        }

        return administradores;
    }

    // Função para fazer parse de uma linha CSV (trata vírgulas dentro de aspas)
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // Função para baixar dados como CSV
    window.baixarCSV = function() {
        if (gerentes.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }

        let csvContent = 'email,senha,tipo\n';
        
        gerentes.forEach(gerente => {
            const email = gerente.email.includes(',') || gerente.email.includes('"') ? 
                `"${gerente.email.replace(/"/g, '""')}"` : gerente.email;
            const senha = gerente.senha.includes(',') || gerente.senha.includes('"') ? 
                `"${gerente.senha.replace(/"/g, '""')}"` : gerente.senha;
            const tipo = gerente.tipo.includes(',') || gerente.tipo.includes('"') ? 
                `"${gerente.tipo.replace(/"/g, '""')}"` : gerente.tipo;
            
            csvContent += `${email},${senha},${tipo}\n`;
        });

        // Cria e baixa o arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', CSV_FILE_NAME);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Arquivo CSV baixado com sucesso!');
    };

    // Função para carregar e exibir gerentes da API
    async function loadAdministrators() {
        try {
            adminTableBody.innerHTML = "<tr><td colspan='4' class='loading'>Carregando...</td></tr>";
            
            const response = await fetch('http://localhost:3000/administrators');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const administrators = await response.json();
            gerentes = administrators.filter(admin => admin.tipo === 'gerente');
            
            if (gerentes.length === 0) {
                adminTableBody.innerHTML = "<tr><td colspan='4' class='loading'>Nenhum gerente cadastrado</td></tr>";
                return;
            }
            
            adminTableBody.innerHTML = "";
            gerentes.forEach(admin => {
                const row = adminTableBody.insertRow();
                row.innerHTML = `
                    <td>${admin.id}</td>
                    <td>${admin.email}</td>
                    <td><span class="tipo-gerente">${admin.tipo}</span></td>
                    <td>
                        <button data-id="${admin.id}" class="edit" onclick="editarGerente(${admin.id})">Editar</button>
                        <button data-id="${admin.id}" class="delete" onclick="excluirGerente(${admin.id})">Excluir</button>
                    </td>
                `;
            });
            
        } catch (error) {
            console.error("Erro ao carregar gerentes:", error);
            adminTableBody.innerHTML = `<tr><td colspan='4' class='error'>Erro ao carregar gerentes: ${error.message}</td></tr>`;
        }
    }

    // Função para validar email
    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Função para adicionar ou atualizar um gerente
    adminForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = adminIdInput.value;
        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();
        const tipo = "gerente";

        // Validações
        if (!validarEmail(email)) {
            alert("Por favor, insira um email válido.");
            return;
        }

        if (!senha || senha.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        try {
            let response;
            
            if (id) {
                // Atualizar gerente existente
                response = await fetch(`http://localhost:3000/administrators/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha, tipo })
                });
            } else {
                // Adicionar novo gerente
                response = await fetch('http://localhost:3000/administrators', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha, tipo })
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar gerente');
            }

            const message = id ? "Gerente atualizado com sucesso!" : "Gerente adicionado com sucesso!";
            showSuccess(message);

            resetForm();
            await loadAdministrators();

        } catch (error) {
            console.error("Erro ao salvar gerente:", error);
            alert(`Erro ao salvar dados: ${error.message}`);
        }
    });

    // Função para resetar o formulário
    function resetForm() {
        adminForm.reset();
        adminIdInput.value = "";
        saveButton.textContent = "Salvar Gerente";
        cancelButton.style.display = "none";
    }

    // Função para cancelar edição
    cancelButton.addEventListener("click", () => {
        resetForm();
    });

    // Função para editar gerente (função global)
    window.editarGerente = function(id) {
        const gerente = gerentes.find(g => g.id === id);
        
        if (gerente) {
            adminIdInput.value = gerente.id;
            emailInput.value = gerente.email;
            senhaInput.value = gerente.senha || '';
            saveButton.textContent = "Atualizar Gerente";
            cancelButton.style.display = "inline-block";
            
            document.querySelector('.form-container').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    };

    // Função para excluir gerente (função global)
    window.excluirGerente = async function(id) {
        if (confirm("Tem certeza que deseja excluir este gerente?")) {
            try {
                const response = await fetch(`http://localhost:3000/administrators/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao excluir gerente');
                }
                
                showSuccess('Gerente excluído com sucesso!');
                await loadAdministrators();
                
            } catch (error) {
                console.error("Erro ao excluir gerente:", error);
                alert(`Erro ao excluir gerente: ${error.message}`);
            }
        }
    };
});

// Função para mostrar mensagem de sucesso
function showSuccess(message) {
    const existingSuccess = document.querySelector('.success');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.children[2]);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Função para voltar ao menu
function voltarAoMenu() {
    window.location.href = '../menu/menu.html';
}