// Carregar produtos da API e renderizar no menu
fetch('http://localhost:3000/products')
  .then(res => res.json())
  .then(produtos => {
    const container = document.getElementById('menu-container');

    produtos.forEach(produto => {
      const item = document.createElement('div');
      item.className = 'menu-item';

      item.innerHTML = `
        <img src="http://localhost:3000/img/${produto.imagem}" alt="${produto.nome}">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao}</p>
        <p><strong>R$ ${produto.preco.toFixed(2)}</strong></p>
        <button class="botao" onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome}')">Adicionar ao Carrinho</button>
      `;

      container.appendChild(item);
    });
  })
  .catch(error => {
    console.error('Erro ao carregar produtos:', error);
  });

// Função para adicionar produto ao carrinho
function adicionarAoCarrinho(id, nome) {
  const usuario = sessionStorage.getItem('usuario');

  if (!usuario) {
    window.location.href = '../login/login.html';
    return;
  }

  // Recupera carrinho existente ou inicia um novo
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};

  // Atualiza a quantidade
  if (carrinho[id]) {
    carrinho[id].quantidade += 1;
  } else {
    carrinho[id] = { id, nome, quantidade: 1 };
  }

  sessionStorage.setItem('carrinho', JSON.stringify(carrinho));

  alert(`Produto "${nome}" adicionado ao carrinho! Você já tem ${carrinho[id].quantidade} unidade(s) de "${nome}" no carrinho.`);
}
