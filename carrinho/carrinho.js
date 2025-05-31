document.addEventListener("DOMContentLoaded", () => {
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  const itensCarrinho = document.getElementById('itensCarrinho');
  const valorTotal = document.getElementById('valorTotal');

  fetch('http://localhost:3000/products')
    .then(res => res.json())
    .then(produtos => {
      let total = 0;

      Object.values(carrinho).forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
          const subtotal = produto.preco * item.quantidade;
          total += subtotal;

          const div = document.createElement('div');
          div.className = 'item-carrinho';

          div.innerHTML = `
            <strong>${produto.nome}</strong><br>
            <span>Preço: R$ ${produto.preco.toFixed(2)}</span>
            <label>Quantidade:</label>
            <input type="number" value="${item.quantidade}" min="1" onchange="alterarQuantidade(${produto.id}, this.value)">
            <p>Subtotal: R$ ${(produto.preco * item.quantidade).toFixed(2)}</p>
          `;

          itensCarrinho.appendChild(div);
        }
      });

      valorTotal.innerText = `Total: R$ ${total.toFixed(2)}`;
      // Armazena o valor total no localStorage para ser usado na página de pagamento
      localStorage.setItem('valorTotal', total.toFixed(2));
    });
});

function alterarQuantidade(id, novaQtd) {
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  if (carrinho[id]) {
    carrinho[id].quantidade = parseInt(novaQtd);
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    location.reload(); // Atualiza os valores na tela
  }
}

function finalizarCompra() {
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  if (Object.keys(carrinho).length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }
  
  // Calcula o total novamente para garantir que está correto
  let total = 0;
  fetch('http://localhost:3000/products')
    .then(res => res.json())
    .then(produtos => {
      Object.values(carrinho).forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
          total += produto.preco * item.quantidade;
        }
      });
      
      // Armazena o valor total no localStorage para a página de pagamento
      localStorage.setItem('valorTotal', total.toFixed(2));
      
      // Redireciona para a página de pagamento
      window.location.href = '../pagamento/pagamento.html';
    });
}