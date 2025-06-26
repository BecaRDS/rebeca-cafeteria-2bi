let produtos = [];

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar se o usuário é gerente antes de tudo
    if (!verificarPermissaoGerente()) {
        alert('Acesso negado! Apenas gerentes podem acessar esta página.');
        window.location.href = '../menu/menu.html';
        return;
    }

    const produtoForm = document.getElementById("produto-form");
    const produtoIdInput = document.getElementById("produto-id");
    const nomeInput = document.getElementById("nome");
    const descricaoInput = document.getElementById("descricao");
    const precoInput = document.getElementById("preco");
    const imagemInput = document.getElementById("imagem");
    const imagemUrlInput = document.getElementById("imagem-url");
    const imageFileInput = document.getElementById("image-file");
    const imagePreview = document.getElementById("image-preview");
    const uploadProgress = document.getElementById("upload-progress");
    const produtoTableBody = document.querySelector("#produto-table tbody");
    const saveButton = produtoForm.querySelector("button[type='submit']");
    const cancelButton = document.getElementById("cancel-edit");
    
    // Botões de toggle
    const uploadToggle = document.getElementById("upload-toggle");
    const urlToggle = document.getElementById("url-toggle");
    const fileContainer = document.querySelector(".file-input-container");
    const urlContainer = document.querySelector(".url-input-container");

    await loadProdutos();
    showFileInstructions();
    setupImageUpload();

    // ============================
    // FUNÇÕES GERAIS
    // ============================

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

    async function loadProdutos() {
        try {
            produtoTableBody.innerHTML = "<tr><td colspan='6' class='loading'>Carregando produtos...</td></tr>";
            
            const response = await fetch("http://localhost:3000/products");
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            produtos = await response.json();
            atualizarTabela();
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            produtoTableBody.innerHTML = `<tr><td colspan="6" class="error">Erro ao carregar produtos: ${error.message}</td></tr>`;
        }
    }

    function showFileInstructions() {
        if (produtos.length === 0) {
            produtoTableBody.innerHTML = `
                <tr><td colspan='6' class='loading'>
                    Nenhum produto cadastrado. Use o formulário acima para cadastrar novos produtos.
                </td></tr>
            `;
        }
    }

    function atualizarTabela() {
        produtoTableBody.innerHTML = "";

        if (produtos.length === 0) {
            produtoTableBody.innerHTML = "<tr><td colspan='6' class='loading'>Nenhum produto cadastrado</td></tr>";
            return;
        }

        produtos.forEach(produto => {
            const row = document.createElement("tr");

            // Determina o src da imagem
            let imageSrc;
            if (produto.imagem.startsWith('http')) {
                imageSrc = produto.imagem;
            } else {
                imageSrc = `http://localhost:3000/img/${produto.imagem}`;
            }

            row.innerHTML = `
                <td>${produto.id}</td>
                <td>${produto.nome}</td>
                <td>${produto.descricao}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td><img src="${imageSrc}" alt="${produto.nome}" class="produto-imagem" onerror="this.src='https://via.placeholder.com/50x50?text=Sem+Imagem'"></td>
                <td>
                    <button class="edit" onclick="editarProduto(${produto.id})">✏️</button>
                    <button class="delete" onclick="excluirProduto(${produto.id})">🗑️</button>
                </td>
            `;

            produtoTableBody.appendChild(row);
        });
    }

    function validarURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function resetForm() {
        produtoForm.reset();
        produtoIdInput.value = "";
        imagemInput.value = "";
        imagemUrlInput.value = "";
        imagePreview.style.display = "none";
        saveButton.textContent = "Salvar Produto";
        cancelButton.style.display = "none";
        
        // Reset para upload mode
        uploadToggle.classList.add("active");
        urlToggle.classList.remove("active");
        fileContainer.classList.add("active");
        urlContainer.classList.remove("active");
    }

    // ============================
    // CONFIGURAÇÃO DE UPLOAD DE IMAGEM
    // ============================

    function setupImageUpload() {
        // Toggle entre upload e URL
        uploadToggle.addEventListener("click", () => {
            uploadToggle.classList.add("active");
            urlToggle.classList.remove("active");
            fileContainer.classList.add("active");
            urlContainer.classList.remove("active");
            imagemInput.value = "";
            imagemUrlInput.value = "";
            imagePreview.style.display = "none";
        });

        urlToggle.addEventListener("click", () => {
            urlToggle.classList.add("active");
            uploadToggle.classList.remove("active");
            urlContainer.classList.add("active");
            fileContainer.classList.remove("active");
            imagemInput.value = "";
            imageFileInput.value = "";
            imagePreview.style.display = "none";
        });

        // Upload de arquivo
        imageFileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione apenas arquivos de imagem.');
                imageFileInput.value = "";
                return;
            }

            // Validar tamanho (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                imageFileInput.value = "";
                return;
            }

            try {
                uploadProgress.style.display = "inline";
                
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('http://localhost:3000/upload-image', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Erro no upload da imagem');
                }

                const result = await response.json();
                
                // Definir o valor do campo imagem
                imagemInput.value = result.filename;
                
                // Mostrar preview
                imagePreview.src = `http://localhost:3000/img/${result.filename}`;
                imagePreview.style.display = "block";
                
                uploadProgress.style.display = "none";
                
            } catch (error) {
                console.error('Erro no upload:', error);
                alert('Erro ao fazer upload da imagem: ' + error.message);
                uploadProgress.style.display = "none";
                imageFileInput.value = "";
            }
        });

        // URL da imagem
        imagemUrlInput.addEventListener("blur", () => {
            const url = imagemUrlInput.value.trim();
            if (url && validarURL(url)) {
                imagemInput.value = url;
                imagePreview.src = url;
                imagePreview.style.display = "block";
            } else if (url) {
                alert('Por favor, digite uma URL válida.');
                imagemUrlInput.value = "";
                imagemInput.value = "";
                imagePreview.style.display = "none";
            }
        });
    }

    // ============================
    // FORMULÁRIO DE PRODUTO
    // ============================

    produtoForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = nomeInput.value.trim();
        const descricao = descricaoInput.value.trim();
        const preco = parseFloat(precoInput.value);
        const imagem = imagemInput.value.trim();
        const produtoId = produtoIdInput.value;

        // Validações
        if (!nome || !descricao || !preco || !imagem) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        if (preco <= 0) {
            alert("O preço deve ser maior que zero.");
            return;
        }

        const produtoData = {
            nome,
            descricao,
            preco,
            imagem
        };

        try {
            let response;
            if (produtoId) {
                // Editar produto existente
                response = await fetch(`http://localhost:3000/products/${produtoId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(produtoData)
                });
            } else {
                // Criar novo produto
                response = await fetch('http://localhost:3000/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(produtoData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar produto');
            }

            const savedProduct = await response.json();
            
            if (produtoId) {
                // Atualizar produto na lista
                const index = produtos.findIndex(p => p.id === parseInt(produtoId));
                if (index !== -1) {
                    produtos[index] = savedProduct;
                }
                alert("Produto atualizado com sucesso!");
            } else {
                // Adicionar novo produto à lista
                produtos.push(savedProduct);
                alert("Produto criado com sucesso!");
            }

            resetForm();
            atualizarTabela();

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto: ' + error.message);
        }
    });

    // Botão cancelar edição
    cancelButton.addEventListener("click", () => {
        resetForm();
    });

    // ============================
    // FUNÇÕES GLOBAIS (chamadas pelos botões da tabela)
    // ============================

    window.editarProduto = (id) => {
        const produto = produtos.find(p => p.id === id);
        if (!produto) {
            alert("Produto não encontrado!");
            return;
        }

        // Preencher o formulário
        produtoIdInput.value = produto.id;
        nomeInput.value = produto.nome;
        descricaoInput.value = produto.descricao;
        precoInput.value = produto.preco;
        
        // Configurar imagem
        if (produto.imagem.startsWith('http')) {
            // É uma URL
            urlToggle.click(); // Ativa o modo URL
            imagemUrlInput.value = produto.imagem;
            imagemInput.value = produto.imagem;
            imagePreview.src = produto.imagem;
            imagePreview.style.display = "block";
        } else {
            // É um arquivo local
            uploadToggle.click(); // Ativa o modo upload
            imagemInput.value = produto.imagem;
            imagePreview.src = `http://localhost:3000/img/${produto.imagem}`;
            imagePreview.style.display = "block";
        }

        // Atualizar interface
        saveButton.textContent = "Atualizar Produto";
        cancelButton.style.display = "inline-block";

        // Scroll para o formulário
        document.querySelector('.form-container').scrollIntoView({ 
            behavior: 'smooth' 
        });
    };

    window.excluirProduto = async (id) => {
        const produto = produtos.find(p => p.id === id);
        if (!produto) {
            alert("Produto não encontrado!");
            return;
        }

        const confirmacao = confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?`);
        if (!confirmacao) return;

        try {
            const response = await fetch(`http://localhost:3000/products/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao excluir produto');
            }

            // Remover da lista local
            produtos = produtos.filter(p => p.id !== id);
            atualizarTabela();
            
            alert("Produto excluído com sucesso!");

        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            alert('Erro ao excluir produto: ' + error.message);
        }
    };

    // ============================
    // FUNÇÕES DE CSV
    // ============================

    window.carregarCSV = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim() !== '');
                
                if (lines.length < 2) {
                    alert('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados.');
                    return;
                }

                const confirmacao = confirm('Isso irá substituir todos os produtos atuais. Deseja continuar?');
                if (!confirmacao) return;

                // Parse do CSV
                const header = lines[0].split(',');
                const newProducts = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length >= 4) {
                        const produto = {
                            nome: values[0]?.trim() || '',
                            preco: parseFloat(values[1]) || 0,
                            imagem: values[2]?.trim() || '',
                            descricao: values.slice(3).join(',').replace(/"/g, '').trim()
                        };
                        
                        if (produto.nome && produto.preco > 0) {
                            newProducts.push(produto);
                        }
                    }
                }

                if (newProducts.length === 0) {
                    alert('Nenhum produto válido encontrado no arquivo CSV.');
                    return;
                }

                // Enviar produtos para o servidor
                for (const produto of newProducts) {
                    try {
                        const response = await fetch('http://localhost:3000/products', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(produto)
                        });

                        if (!response.ok) {
                            console.error(`Erro ao criar produto ${produto.nome}`);
                        }
                    } catch (error) {
                        console.error(`Erro ao criar produto ${produto.nome}:`, error);
                    }
                }

                // Recarregar lista
                await loadProdutos();
                alert(`${newProducts.length} produtos carregados com sucesso!`);

            } catch (error) {
                console.error('Erro ao processar CSV:', error);
                alert('Erro ao processar arquivo CSV: ' + error.message);
            }
        };
        input.click();
    };

    window.baixarCSV = () => {
        if (produtos.length === 0) {
            alert('Não há produtos para exportar.');
            return;
        }

        let csvContent = 'nome,preco,imagem,descricao\n';
        produtos.forEach(produto => {
            const descricaoFormatada = `"${produto.descricao.replace(/"/g, '""')}"`;
            csvContent += `${produto.nome},${produto.preco},${produto.imagem},${descricaoFormatada}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'produtos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Função auxiliar para parse de CSV
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

    // ============================
    // FUNÇÃO DE NAVEGAÇÃO
    // ============================

    window.voltarAoMenu = () => {
        window.location.href = '../menu/menu.html';
    };
});