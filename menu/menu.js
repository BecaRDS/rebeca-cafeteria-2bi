// Array com objetos que representam os cafés disponíveis no menu
const cafes = [
  { nome: "Café Expresso", preco: 5, imagem: "cafeExpresso.jpg", descricao: "Intenso e encorpado, o expresso é o clássico do café." },
  { nome: "Café com Leite", preco: 6, imagem: "cafeComLeite.jpg", descricao: "Mistura perfeita de café expresso com leite cremoso." },
  { nome: "Capuccino", preco: 7, imagem: "capuccino.jpg", descricao: "Café expresso com espuma de leite e toque de canela." },
  { nome: "Mocha", preco: 8, imagem: "mocha.jpg", descricao: "Café expresso com chocolate e leite vaporizado." },
  { nome: "Macchiato", preco: 7.5, imagem: "macchiato.jpg", descricao: "Café expresso com uma leve camada de leite vaporizado." },
  { nome: "Latte", preco: 6.5, imagem: "latte.jpg", descricao: "Café suave com bastante leite vaporizado." },
  { nome: "Café Gelado", preco: 6, imagem: "cafeGelado.jpg", descricao: "Refrescante café gelado, perfeito para os dias quentes." },
  { nome: "Café Caramelo", preco: 7.5, imagem: "cafeCaramelo.jpg", descricao: "Doce e suave, o café com caramelo conquista os paladares." },
  { nome: "Café Baunilha", preco: 7, imagem: "cafeBaunilha.jpg", descricao: "Sabor delicado de baunilha misturado ao expresso." },
  { nome: "Café Chocolate", preco: 8, imagem: "cafeChocolate.jpg", descricao: "Café expresso com chocolate quente e leite vaporizado." },
  { nome: "Café com Chantilly", preco: 8.5, imagem: "cafeChantilly.jpg", descricao: "Café doce com uma camada generosa de chantilly." },
  { nome: "Café com Canela", preco: 6.5, imagem: "cafeCanela.jpg", descricao: "Café com um toque especial de canela." },
  { nome: "Café com Leite Condensado", preco: 7.5, imagem: "cafeLeiteCondensado.jpg", descricao: "Café adocicado com leite condensado, um verdadeiro prazer." },
  { nome: "Café Vegano", preco: 7, imagem: "cafeVegano.jpg", descricao: "Café preparado com leite vegetal, para todos os gostos." },
  { nome: "Café Especial da Casa", preco: 9, imagem: "cafeEspecial.jpg", descricao: "A especialidade da casa com um sabor único e diferenciado." }
];

// Função para adicionar um item ao carrinho
function adicionarCarrinho(item, preco) {
  // Recupera o carrinho atual do localStorage ou inicia um novo objeto
  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || {};

  // Se o item ainda não estiver no carrinho, cria o registro com quantidade 0
  if (!carrinho[item]) {
    carrinho[item] = { quantidade: 0, preco };
  }

  // Incrementa a quantidade do item no carrinho
  carrinho[item].quantidade++;

  // Atualiza o carrinho no localStorage
  localStorage.setItem('carrinho', JSON.stringify(carrinho));

  // Calcula o total de itens no carrinho e armazena no localStorage
  let total = Object.values(carrinho).reduce((sum, i) => sum + i.quantidade, 0);
  localStorage.setItem('quantidadeTotal', total);

  // Exibe um alerta ao usuário com a quantidade atual do item
  alert(`${item} adicionado ao carrinho! Agora você tem ${carrinho[item].quantidade} unidade(s) desse item.`);
}

// Quando a página terminar de carregar, executa este código
window.onload = () => {
  const container = document.getElementById('menu-container'); // Container principal do menu
  const botaoVoltar = container.querySelector('.botao'); // Seleciona o botão de voltar para inserir os itens antes dele

  // Para cada café do array, cria uma seção HTML correspondente
  cafes.forEach(cafe => {
    const section = document.createElement('section'); // Cria uma nova <section>
    section.className = 'menu-item'; // Adiciona classe para estilo

    // Define o conteúdo HTML da seção com imagem, nome, descrição, preço e botão
    section.innerHTML = `
      <img src="imagens/${cafe.imagem}" alt="${cafe.nome}">
      <div>
        <h3>${cafe.nome}</h3>
        <p>${cafe.descricao}</p>
        <p>R$${cafe.preco.toFixed(2).replace('.', ',')}</p> <!-- Preço com vírgula -->
      </div>
      <button class="botao" onclick="adicionarCarrinho('${cafe.nome}', ${cafe.preco})">Adicionar</button>
    `;

    // Insere a nova seção antes do botão de voltar
    container.insertBefore(section, botaoVoltar);
  });
};
