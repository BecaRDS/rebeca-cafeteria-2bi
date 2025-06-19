const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express(); // ✅ app é criado aqui
const PORT = 3000;
const CSV_FILE = 'produtos.csv';
const ADMIN_CSV_FILE = 'administradores.csv';

// ✅ Expor a pasta de imagens publicamente
app.use('/img', express.static(path.join(__dirname, 'img')));

app.use(cors());
app.use(bodyParser.json());

let products = [];
let administrators = [];
let nextId = 1;
let nextAdminId = 1;

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

// Carrega administradores do CSV
function loadAdministratorsFromCSV() {
    try {
        if (fs.existsSync(ADMIN_CSV_FILE)) {
            const data = fs.readFileSync(ADMIN_CSV_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(','); // email,senha,tipo

            administrators = lines.slice(1).map((line, index) => {
                const [email, senha, tipo] = line.split(',');
                return {
                    id: index + 1,
                    email: email.trim(),
                    senha: senha.trim(),
                    tipo: tipo.trim()
                };
            });

            nextAdminId = administrators.length + 1;
            console.log('Administradores carregados do CSV com sucesso!');
        } else {
            fs.writeFileSync(ADMIN_CSV_FILE, 'email,senha,tipo\n');
            console.log('Arquivo CSV de administradores criado.');
        }
    } catch (error) {
        console.error('Erro ao carregar o CSV de administradores:', error);
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

// Salva administradores no CSV
function saveAdministratorsToCSV() {
    try {
        let csvData = 'email,senha,tipo\n';
        administrators.forEach(admin => {
            csvData += `${admin.email},${admin.senha},${admin.tipo}\n`;
        });
        fs.writeFileSync(ADMIN_CSV_FILE, csvData);
        console.log('Administradores salvos no CSV.');
    } catch (error) {
        console.error('Erro ao salvar o CSV de administradores:', error);
    }
}

// Salvamento automático a cada 1 minuto
function setupAutoSave() {
    setInterval(() => {
        saveDataToCSV();
        saveAdministratorsToCSV();
    }, 60000);
}

loadDataFromCSV();
loadAdministratorsFromCSV();
setupAutoSave();

// Rotas da API - Produtos

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

// Rotas da API - Administradores

app.get('/administrators', (req, res) => {
    // Retorna administradores sem a senha por segurança
    const adminsWithoutPassword = administrators.map(admin => ({
        id: admin.id,
        email: admin.email,
        tipo: admin.tipo
    }));
    res.json(adminsWithoutPassword);
});

app.get('/administrators/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const admin = administrators.find(a => a.id === id);
    if (admin) {
        // Retorna sem a senha por segurança
        res.json({
            id: admin.id,
            email: admin.email,
            tipo: admin.tipo
        });
    } else {
        res.status(404).json({ message: 'Administrador não encontrado' });
    }
});

app.post('/administrators', (req, res) => {
    const { email, senha, tipo } = req.body;

    if (!email || !senha || !tipo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o email já existe
    const existingAdmin = administrators.find(a => a.email === email);
    if (existingAdmin) {
        return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const newAdmin = {
        id: nextAdminId++,
        email,
        senha,
        tipo
    };

    administrators.push(newAdmin);
    
    // Retorna sem a senha por segurança
    res.status(201).json({
        id: newAdmin.id,
        email: newAdmin.email,
        tipo: newAdmin.tipo
    });
});

app.put('/administrators/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { email, senha, tipo } = req.body;
    const index = administrators.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Administrador não encontrado' });
    }

    if (!email || !senha || !tipo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o email já existe em outro administrador
    const existingAdmin = administrators.find(a => a.email === email && a.id !== id);
    if (existingAdmin) {
        return res.status(400).json({ message: 'Email já cadastrado para outro administrador' });
    }

    const updatedAdmin = {
        id,
        email,
        senha,
        tipo
    };

    administrators[index] = updatedAdmin;
    
    // Retorna sem a senha por segurança
    res.json({
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        tipo: updatedAdmin.tipo
    });
});

app.delete('/administrators/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = administrators.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Administrador não encontrado' });
    }

    // Verificar se não é o último gerente
    const admin = administrators[index];
    if (admin.tipo === 'gerente') {
        const gerentesCount = administrators.filter(a => a.tipo === 'gerente').length;
        if (gerentesCount <= 1) {
            return res.status(400).json({ message: 'Não é possível excluir o último gerente' });
        }
    }

    administrators.splice(index, 1);
    res.status(204).send();
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    saveDataToCSV();
    saveAdministratorsToCSV();
    process.exit();
});

