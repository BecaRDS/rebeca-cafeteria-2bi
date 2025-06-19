// Configuração
const CSV_FILE_NAME = 'administradores.csv';
let gerentes = [];

document.addEventListener("DOMContentLoaded", async () => {
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

    // Função para inicializar a aplicação
    async function initializeApp() {
        try {
            // Verifica se existe dados salvos no arquivo
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
                    Nenhum gerente cadastrado. Use o botão "Carregar CSV" para importar dados existentes ou comece cadastrando um novo gerente.
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
                reader.onload = function(e) {
                    try {
                        parseCSVContent(e.target.result);
                        loadAdministrators();
                        showSuccess(`Arquivo ${file.name} carregado com sucesso! ${gerentes.filter(g => g.tipo === 'gerente').length} gerentes encontrados.`);
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
            gerentes = [];
            return;
        }

        // Verifica se tem cabeçalho correto
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        if (!headers.includes('email') || !headers.includes('senha') || !headers.includes('tipo')) {
            throw new Error('Arquivo CSV deve conter as colunas: email, senha, tipo');
        }

        // Carrega dados
        gerentes = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 3 && values[0].trim()) { // Ignora linhas vazias
                gerentes.push({
                    id: i, // ID baseado na linha
                    email: values[0].trim(),
                    senha: values[1].trim(),
                    tipo: values[2].trim()
                });
            }
        }

        console.log(`${gerentes.length} registros carregados do CSV`);
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
            // Escapa vírgulas e aspas nos dados
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

    // Função para carregar e exibir gerentes
    async function loadAdministrators() {
        try {
            adminTableBody.innerHTML = "<tr><td colspan='4' class='loading'>Carregando...</td></tr>";
            
            const administrators = gerentes.filter(admin => admin.tipo === 'gerente');
            
            if (administrators.length === 0) {
                adminTableBody.innerHTML = "<tr><td colspan='4' class='loading'>Nenhum gerente cadastrado</td></tr>";
                return;
            }
            
            adminTableBody.innerHTML = "";
            administrators.forEach(admin => {
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

    // Função para verificar se email já existe
    function emailJaExiste(email, excludeId = null) {
        return gerentes.some(g => g.email.toLowerCase() === email.toLowerCase() && g.id !== excludeId);
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

        if (emailJaExiste(email, id ? parseInt(id) : null)) {
            alert("Este email já está cadastrado. Use um email diferente.");
            return;
        }

        try {
            if (id) {
                // Atualizar gerente existente
                const index = gerentes.findIndex(g => g.id === parseInt(id));
                if (index !== -1) {
                    gerentes[index] = { 
                        id: parseInt(id), 
                        email: email, 
                        senha: senha, 
                        tipo: tipo 
                    };
                    showSuccess("Gerente atualizado com sucesso! Lembre-se de baixar o CSV atualizado.");
                }
            } else {
                // Adicionar novo gerente
                const newId = gerentes.length > 0 ? Math.max(...gerentes.map(g => g.id)) + 1 : 1;
                gerentes.push({ 
                    id: newId, 
                    email: email, 
                    senha: senha, 
                    tipo: tipo 
                });
                showSuccess("Gerente adicionado com sucesso! Lembre-se de baixar o CSV atualizado.");
            }

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
            senhaInput.value = gerente.senha;
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
                const index = gerentes.findIndex(g => g.id === id);
                if (index !== -1) {
                    const gerenteRemovido = gerentes[index];
                    gerentes.splice(index, 1);
                    
                    // Reordena IDs
                    gerentes.forEach((gerente, index) => {
                        gerente.id = index + 1;
                    });
                    
                    showSuccess(`Gerente ${gerenteRemovido.email} excluído com sucesso! Lembre-se de baixar o CSV atualizado.`);
                    await loadAdministrators();
                }
            } catch (error) {
                console.error("Erro ao excluir gerente:", error);
                alert(`Erro ao excluir gerente: ${error.message}`);
            }
        }
    };

    // Função para criar CSV modelo
    window.criarCSVModelo = function() {
        const csvContent = 'email,senha,tipo\nadmin@exemplo.com,123456,gerente\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_administradores.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Arquivo modelo CSV baixado! Edite-o e use "Carregar CSV" para importar.');
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
    if (gerentes.length > 0) {
        const sair = confirm("Você tem dados não salvos. Deseja baixar o CSV antes de sair?");
        if (sair) {
            baixarCSV();
        }
    }
    window.location.href = '../menu/menu.html';
}