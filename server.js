const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express(); // ✅ app é criado aqui
const PORT = 3000;
const CSV_FILE = 'products.csv';

// ✅ Expor a pasta de imagens publicamente
app.use('/img', express.static(path.join(__dirname, 'img')));

app.use(cors());
app.use(bodyParser.json());

let products = [];
let nextId = 1;

// Carrega produtos do CSV
function loadDataFromCSV() {
    try {
        if (fs.existsSync(CSV_FILE)) {
            const data = fs.readFileSync(CSV_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(','); // nome,preco,imagem,descricao

            products = lines.slice(1).map((line, index) => {
                const [nome, preco, imagem, ...descricaoArr] = line.split(',');
                const descricao = descricaoArr.join(',').replace(/"/g, '').trim();
                return {
                    id: index + 1,
                    nome: nome.trim(),
                    preco: parseFloat(preco),
                    imagem: imagem.trim(),
                    descricao
                };
            });

            nextId = products.length + 1;
            console.log('Produtos carregados do CSV com sucesso!');
        } else {
            fs.writeFileSync(CSV_FILE, 'nome,preco,imagem,descricao\n');
            console.log('Arquivo CSV criado.');
        }
    } catch (error) {
        console.error('Erro ao carregar o CSV:', error);
    }
}

// Salva produtos no CSV
function saveDataToCSV() {
    try {
        let csvData = 'nome,preco,imagem,descricao\n';
        products.forEach(p => {
            const descricaoFormatada = `"${p.descricao.replace(/"/g, '""')}"`;
            csvData += `${p.nome},${p.preco},${p.imagem},${descricaoFormatada}\n`;
        });
        fs.writeFileSync(CSV_FILE, csvData);
        console.log('Produtos salvos no CSV.');
    } catch (error) {
        console.error('Erro ao salvar o CSV:', error);
    }
}

// Salvamento automático a cada 1 minuto
function setupAutoSave() {
    setInterval(() => {
        saveDataToCSV();
    }, 60000);
}

loadDataFromCSV();
setupAutoSave();

// Rotas da API

app.get('/products', (req, res) => {
    res.json(products);
});

app.get('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Produto não encontrado' });
    }
});

app.post('/products', (req, res) => {
    const { nome, preco, imagem, descricao } = req.body;

    if (!nome || preco === undefined || !imagem || !descricao) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    const newProduct = {
        id: nextId++,
        nome,
        preco: parseFloat(preco),
        imagem,
        descricao
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, preco, imagem, descricao } = req.body;
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Produto não encontrado' });
    }

    if (!nome || preco === undefined || !imagem || !descricao) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    const updatedProduct = {
        id,
        nome,
        preco: parseFloat(preco),
        imagem,
        descricao
    };

    products[index] = updatedProduct;
    res.json(updatedProduct);
});

app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Produto não encontrado' });
    }

    products.splice(index, 1);
    res.status(204).send();
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    saveDataToCSV();
    process.exit();
});
