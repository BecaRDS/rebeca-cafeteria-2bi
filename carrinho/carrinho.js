// Seleciona a div onde os itens do carrinho serão exibidos
const div = document.getElementById('itensCarrinho');

// Recupera o carrinho do localStorage ou inicializa como objeto vazio
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || {};

// Inicializa o valor total da compra
let valorTotal = 0;

/**
 * Função responsável por calcular e atualizar o valor total do carrinho
 * Também atualiza o localStorage com os dados atualizados
 */
function atualizarValorTotal() {
  let novoTotal = 0;

  // Percorre cada item do carrinho e acumula o total
  for (let item in carrinho) {
    novoTotal += carrinho[item].quantidade * carrinho[item].preco;
  }

  // Atualiza o texto do total na página
  document.getElementById('valorTotal').textContent = `Valor total da compra: R$ ${novoTotal.toFixed(2)}`;

  // Salva o carrinho atualizado no localStorage
  localStorage.setItem('carrinho', JSON.stringify(carrinho));

  // Atualiza a quantidade total de itens
  localStorage.setItem('quantidadeTotal', Object.values(carrinho).reduce((s, i) => s + i.quantidade, 0));

  // Salva o valor total no localStorage (ESSENCIAL para uso posterior no pagamento)
  localStorage.setItem('valorTotal', novoTotal.toFixed(2));
}

/**
 * Função que altera a quantidade de um item específico no carrinho
 * Se a nova quantidade for 0 ou menor, o item é removido
 * Depois atualiza o carrinho na tela e o total
 */
function alterarQuantidade(item, novaQuantidade) {
  novaQuantidade = parseInt(novaQuantidade);

  if (novaQuantidade <= 0) {
    // Remove o item do carrinho se a quantidade for 0 ou negativa
    delete carrinho[item];
  } else {
    // Atualiza a quantidade do item
    carrinho[item].quantidade = novaQuantidade;
  }

  // Reexibe os itens do carrinho atualizados
  renderizarCarrinho();

  // Atualiza o valor total da compra
  atualizarValorTotal();
}

/**
 * Função que monta e exibe os itens do carrinho na página
 */
function renderizarCarrinho() {
  div.innerHTML = ''; // Limpa o conteúdo atual da div

  // Verifica se o carrinho está vazio
  if (Object.keys(carrinho).length === 0) {
    div.innerHTML = '<p>Seu carrinho está vazio.</p>';
  } else {
    // Para cada item, cria um bloco HTML com nome, preço e campo de quantidade
    for (let item in carrinho) {
      div.innerHTML += `
        <div class="item-carrinho">
          <span><strong>${item}</strong></span>
          <span>Preço: R$ ${carrinho[item].preco.toFixed(2)}</span>
          <label>
            Quantidade:
            <input type="number" min="0" value="${carrinho[item].quantidade}" 
              onchange="alterarQuantidade('${item}', this.value)" />
          </label>
        </div>
      `;
    }
  }
}

// Chama a função para mostrar os itens quando a página carregar
renderizarCarrinho();

// Calcula e exibe o valor total na página
atualizarValorTotal();

// Esta linha é redundante aqui (já é tratada em `atualizarValorTotal()`), pode ser removida se quiser evitar confusão:
// localStorage.setItem('valorTotal', total.toFixed(2)); // <-- Pode ser excluída com segurança
