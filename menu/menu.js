// Carregar produtos da API e renderizar no menu
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se é gerente para mostrar os botões específicos
    try {
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
        if (usuarioLogado && usuarioLogado.tipo === 'gerente') {
            document.getElementById('gerente-botoes').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao verificar status do gerente:', error);
    }

    // Carregar produtos e renderizar no menu
    try {
        const res = await fetch('http://localhost:3000/products');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const produtos = await res.json();
        renderizarMenu(produtos);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        // Mostrar mensagem de erro para o usuário
        const container = document.getElementById('menu-container');
        if (container) {
            container.innerHTML = '<p>Erro ao carregar produtos. Verifique se o servidor está rodando.</p>';
        }
    }
});

// Função para renderizar os produtos no menu
function renderizarMenu(produtos) {
    const container = document.getElementById('menu-container');
    if (!container) {
        console.error('Elemento #menu-container não encontrado.');
        return;
    }

    // Limpar container antes de adicionar produtos
    container.innerHTML = '';

    produtos.forEach(produto => {
        const item = document.createElement('div');
        item.className = 'menu-item';

        item.innerHTML = `
            <img src="http://localhost:3000/img/${produto.imagem}" alt="${produto.nome}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBuw6NvIGVuY29udHJhZGE8L3RleHQ+PC9zdmc+'">
            <h3>${produto.nome}</h3>
            <p>${produto.descricao}</p>
            <p><strong>R$ ${produto.preco.toFixed(2)}</strong></p>
            <button class="botao" onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome.replace(/'/g, "\\'")}')">Adicionar ao Carrinho</button>
        `;

        container.appendChild(item);
    });
}

// Função para adicionar produto ao carrinho
function adicionarAoCarrinho(id, nome) {
    try {
        const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};

        if (carrinho[id]) {
            carrinho[id].quantidade += 1;
        } else {
            carrinho[id] = { id, nome, quantidade: 1 };
        }

        sessionStorage.setItem('carrinho', JSON.stringify(carrinho));

        alert(`Produto "${nome}" adicionado ao carrinho! Você já tem ${carrinho[id].quantidade} unidade(s) de "${nome}" no carrinho.`);
    } catch (error) {
        console.error('Erro ao adicionar produto ao carrinho:', error);
        alert('Ocorreu um erro ao adicionar o produto ao carrinho. Por favor, tente novamente.');
    }
}

