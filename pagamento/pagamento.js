document.addEventListener("DOMContentLoaded", () => {
  carregarTotalCarrinho();
});

function carregarTotalCarrinho() {
  // Calcula o total baseado no carrinho em sessionStorage
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  
  if (Object.keys(carrinho).length === 0) {
    document.getElementById("resumoPagamento").innerHTML = `
      <p>Seu carrinho está vazio!</p>
      <button class="btn-voltar-menu" onclick="window.location.href=\'../menu/menu.html\'">Voltar ao Menu</button>
    `;
    return;
  }

  // Busca os produtos para calcular o total
  fetch('http://localhost:3000/products')
    .then(res => res.json())
    .then(produtos => {
      let total = 0;
      let itensHtml = '<h3>Resumo do Pedido:</h3>';
      
      Object.values(carrinho).forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
          const subtotal = produto.preco * item.quantidade;
          total += subtotal;
          itensHtml += `
            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <strong>${produto.nome}</strong><br>
              Quantidade: ${item.quantidade}<br>
              Preço unitário: R$ ${produto.preco.toFixed(2)}<br>
              Subtotal: R$ ${subtotal.toFixed(2)}
            </div>
          `;
        }
      });
      
      itensHtml += `<h3>Total: R$ ${total.toFixed(2)}</h3>`;
      document.getElementById("resumoPagamento").innerHTML = itensHtml;
    })
    .catch(err => {
      console.error("Erro ao carregar produtos:", err);
      document.getElementById("resumoPagamento").textContent = "Erro ao carregar resumo do pedido.";
    });
}

// Função para gerar QR Code de pagamento via PIX
function verificarPagamento() {
  const forma = document.getElementById("formaPagamento").value;

  if (forma === "Pix") {
    pagarPIX();
  } else {
    document.getElementById("qrcode-area").style.display = "none";
    document.getElementById("qrcode").innerHTML = "";
  }
}

function pagarPIX() {
  const forma = document.getElementById("formaPagamento").value;
  if (forma !== "Pix") {
    alert("Selecione a forma de pagamento como Pix para gerar o QR Code.");
    return;
  }

  // Calcula o valor baseado no carrinho em sessionStorage
  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  
  fetch('http://localhost:3000/products')
    .then(res => res.json())
    .then(produtos => {
      let valor = 0;
      
      Object.values(carrinho).forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
          valor += produto.preco * item.quantidade;
        }
      });

      const chavePix = '73378690968';
      const nomeRecebedor = 'Rebeca R. dos Santos';
      const cidade = 'SAO PAULO';
      const descricao = 'Pagamento Cafeteria';

      function format(id, value) {
        const size = value.length.toString().padStart(2, '0');
        return `${id}${size}${value}`;
      }

      const merchantAccount = format("00", "BR.GOV.BCB.PIX") +
                              format("01", chavePix) +
                              format("02", descricao);

      const payloadSemCRC =
        format("00", "01") +
        format("26", merchantAccount) +
        format("52", "0000") +
        format("53", "986") +
        format("54", valor.toFixed(2)) +
        format("58", "BR") +
        format("59", nomeRecebedor) +
        format("60", cidade) +
        format("62", format("05", "***")) +
        "6304";

      function crc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
          crc ^= str.charCodeAt(i) << 8;
          for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
              crc = (crc << 1) ^ 0x1021;
            } else {
              crc <<= 1;
            }
            crc &= 0xFFFF;
          }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
      }

      const payloadCompleto = payloadSemCRC + crc16(payloadSemCRC);

      const qrCodeDiv = document.getElementById("qrcode");
      qrCodeDiv.innerHTML = '';
      document.getElementById("qrcode-area").style.display = "block";

      new QRCode(qrCodeDiv, {
        text: payloadCompleto,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      const info = document.createElement("div");
      info.className = "nome-valor";
      info.innerHTML = `
        <p><strong>Nome:</strong> ${nomeRecebedor}</p>
        <p><strong>CPF/CNPJ (PIX):</strong> ${chavePix}</p>
        <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
      `;
      qrCodeDiv.appendChild(info);
    })
    .catch(err => {
      console.error("Erro ao gerar QR Code:", err);
      alert("Erro ao gerar QR Code.");
    });
}

// Função para finalizar compra (COM VERIFICAÇÃO DE LOGIN)
function finalizarCompra() {
  const usuario = sessionStorage.getItem('usuario');
  
  if (!usuario) {
    // Usuário não está logado, redireciona para login com parâmetro de redirect
    const redirectUrl = encodeURIComponent('../pagamento/pagamento.html');
    window.location.href = `../login/login.html?redirect=${redirectUrl}`;
    return;
  }

  const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
  
  if (Object.keys(carrinho).length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  const formaPagamento = document.getElementById("formaPagamento").value;
  
  if (!formaPagamento || formaPagamento === "Forma de pagamento") {
    alert("Por favor, selecione uma forma de pagamento!");
    return;
  }

  // Simula o processamento da compra
  alert("Compra finalizada com sucesso! Obrigado pela preferência 😊");
  
  // Limpa o carrinho
  sessionStorage.removeItem('carrinho');
  
  // Redireciona para o menu
  window.location.href = "../menu/menu.html";
}