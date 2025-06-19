let produtos = [];

document.addEventListener("DOMContentLoaded", async () => {
    const produtoForm = document.getElementById("produto-form");
    const produtoIdInput = document.getElementById("produto-id");
    const nomeInput = document.getElementById("nome");
    const descricaoInput = document.getElementById("descricao");
    const precoInput = document.getElementById("preco");
    const imagemInput = document.getElementById("imagem");
    const produtoTableBody = document.querySelector("#produto-table tbody");
    const saveButton = produtoForm.querySelector("button[type='submit']");
    const cancelButton = document.getElementById("cancel-edit");

    await loadProdutos();
    showFileInstructions();

    // ============================
    // FUNÇÕES GERAIS
    // ============================

    async function loadProdutos() {
        try {
            const response = await fetch("http://localhost:3000/products");
            produtos = await response.json();
            atualizarTabela();
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            produtoTableBody.innerHTML = `<tr><td colspan="6" class="error">Erro ao carregar produtos</td></tr>`;
        }
    }

    function showFileInstructions() {
        if (produtos.length === 0) {
            produtoTableBody.innerHTML = `
                <tr><td colspan='6' class='loading'>
                    Nenhum produto cadastrado. Use o botão "Carregar CSV" para importar dados ou cadastre manualmente.
                </td></tr>
            `;
        }
    }

    function atualizarTabela() {
        produtoTableBody.innerHTML = "";

        produtos.forEach(produto => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${produto.id}</td>
                <td>${produto.nome}</td>
                <td>${produto.descricao}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td><img src="${produto.imagem}" class="produto-imagem"></td>
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

    function produtoJaExiste(nome, excludeId = null) {
        return produtos.some(p => p.nome.toLowerCase() === nome.toLowerCase() && p.id !== excludeId);
    }

    function resetForm() {
        produtoForm.reset();
        produtoIdInput.value = "";
        saveButton.textContent = "Salvar Produto";
        cancelButton.style.display = "none";
    }

    // ============================
    // EVENTOS
    // ============================

    produtoForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = produtoIdInput.value;
        const nome = nomeInput.value.trim();
        const descricao = descricaoInput.value.trim();
        const preco = parseFloat(precoInput.value);
        const imagem = imagemInput.value.trim();

        if (!nome || !descricao || isNaN(preco) || preco <= 0 || !imagem) {
            alert("Por favor, preencha todos os campos corretamente.");
            return;
        }

        if (!validarURL(imagem)) {
            alert("URL da imagem inválida.");
            return;
        }

        if (produtoJaExiste(nome, id ? parseInt(id) : null)) {
            alert("Já existe um produto com este nome.");
            return;
        }

        try {
            if (id) {
                // Atualizar produto
                const response = await fetch(`http://localhost:3000/products/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome, descricao, preco, imagem })
                });

                if (!response.ok) throw new Error("Erro ao atualizar produto.");

                showSuccess("Produto atualizado com sucesso!");
            } else {
                // Criar produto
                const response = await fetch("http://localhost:3000/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome, descricao, preco, imagem })
                });

                if (!response.ok) throw new Error("Erro ao adicionar produto.");

                showSuccess("Produto adicionado com sucesso!");
            }

            resetForm();
            await loadProdutos();

        } catch (error) {
            console.error(error);
            alert("Erro ao salvar produto.");
        }
    });

    cancelButton.addEventListener("click", resetForm);

    // ============================
    // FUNÇÕES GLOBAIS
    // ============================

    window.editarProduto = function (id) {
        const produto = produtos.find(p => p.id === id);
        if (produto) {
            produtoIdInput.value = produto.id;
            nomeInput.value = produto.nome;
            descricaoInput.value = produto.descricao;
            precoInput.value = produto.preco;
            imagemInput.value = produto.imagem;
            saveButton.textContent = "Atualizar Produto";
            cancelButton.style.display = "inline-block";

            document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.excluirProduto = async function (id) {
        if (!confirm("Deseja realmente excluir este produto?")) return;

        try {
            const response = await fetch(`http://localhost:3000/products/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Erro ao excluir.");

            showSuccess("Produto excluído com sucesso!");
            await loadProdutos();
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir produto.");
        }
    };

    // ============================
    // CSV (carregar e baixar)
    // ============================

    window.carregarCSV = function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';

        input.onchange = async function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const produtosCSV = parseCSVContent(e.target.result);
                    let enviados = 0;

                    for (const produto of produtosCSV) {
                        const response = await fetch('http://localhost:3000/products', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(produto)
                        });

                        if (response.ok) enviados++;
                    }

                    await loadProdutos();
                    showSuccess(`Arquivo ${file.name} carregado com sucesso! ${enviados} produtos enviados.`);

                } catch (error) {
                    alert(`Erro ao processar CSV: ${error.message}`);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    };

    function parseCSVContent(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        return lines.slice(1).map(line => {
            const [nome, preco, imagem, ...descArr] = line.split(',');
            const descricao = descArr.join(',').replace(/"/g, '').trim();
            return {
                nome: nome.trim(),
                preco: parseFloat(preco),
                imagem: imagem.trim(),
                descricao
            };
        });
    }

    window.baixarCSV = function () {
        if (produtos.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }

        let csvContent = 'nome,descricao,preco,imagem\n';
        produtos.forEach(produto => {
            const nome = `"${produto.nome.replace(/"/g, '""')}"`;
            const descricao = `"${produto.descricao.replace(/"/g, '""')}"`;
            const preco = produto.preco;
            const imagem = `"${produto.imagem.replace(/"/g, '""')}"`;
            csvContent += `${nome},${descricao},${preco},${imagem}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'produtos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Arquivo CSV baixado com sucesso!');
    };

    window.criarCSVModelo = function () {
        const csvContent = 'nome,descricao,preco,imagem\n' +
            'Café Expresso,"Café forte",5.5,https://via.placeholder.com/150\n' +
            'Capuccino,"Com leite",6.0,https://via.placeholder.com/150\n';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'modelo_produtos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Modelo CSV baixado com sucesso!');
    };
});

// ============================
// FUNÇÕES GLOBAIS EXTERNAS
// ============================

function showSuccess(message) {
    const existingSuccess = document.querySelector('.success');
    if (existingSuccess) existingSuccess.remove();

    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;

    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.children[2]);

    setTimeout(() => successDiv.remove(), 5000);
}

function voltarAoMenu() {
    window.location.href = '../menu/menu.html';
}

window.getProdutos = function () {
    return produtos;
};
