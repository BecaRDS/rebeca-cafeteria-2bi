const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const CSV_FILE = 'produtos.csv';
const ADMIN_CSV_FILE = 'administradores.csv';

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'img');
        // Cria a pasta img se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Gera um nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Aceita apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    }
});

// ✅ Expor a pasta de imagens publicamente
app.use('/img', express.static(path.join(__dirname, 'img')));

app.use(cors());
app.use(bodyParser.json());

let products = [];
let administrators = [];
let nextId = 1;
let nextAdminId = 1;

// Modificar a função loadDataFromCSV
function loadDataFromCSV() {
    try {
        const filePath = path.join(__dirname, CSV_FILE);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length === 0) {
                products = [];
                return;
            }

            const headers = lines[0].split(',');
            products = lines.slice(1).map((line, index) => {
                const values = parseCSVLine(line);
                return {
                    id: index + 1,
                    nome: values[0]?.trim() || '',
                    preco: parseFloat(values[1]) || 0,
                    imagem: values[2]?.trim() || '',
                    descricao: values.slice(3).join(',').replace(/"/g, '').trim()
                };
            });

            nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        } else {
            fs.writeFileSync(filePath, 'nome,preco,imagem,descricao\n');
            products = [];
        }
    } catch (error) {
        console.error('Erro ao carregar o CSV:', error);
        products = [];
    }
}

// Adicionar função auxiliar para parse de linhas CSV
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

// No server.js, modificar as funções de save
function saveDataToCSV() {
    try {
        const filePath = path.join(__dirname, CSV_FILE);
        let csvData = 'nome,preco,imagem,descricao\n';
        products.forEach(p => {
            const descricaoFormatada = `"${p.descricao.replace(/"/g, '""')}"`;
            csvData += `${p.nome},${p.preco},${p.imagem},${descricaoFormatada}\n`;
        });
        fs.writeFileSync(filePath, csvData);
    } catch (error) {
        console.error('Erro ao salvar o CSV:', error);
    }
}

// Modificar a função saveAdministratorsToCSV para garantir o caminho correto
function saveAdministratorsToCSV() {
    try {
        let csvData = 'email,senha,tipo\n';
        administrators.forEach(admin => {
            csvData += `${admin.email},${admin.senha},${admin.tipo}\n`;
        });
        fs.writeFileSync(path.join(__dirname, ADMIN_CSV_FILE), csvData);
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

// Nova rota para upload de imagem
app.post('/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma imagem foi enviada' });
        }

        res.json({
            message: 'Imagem enviada com sucesso',
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

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
    saveDataToCSV(); // Salva imediatamente no CSV
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

    // Se a imagem mudou, remove a imagem antiga
    const oldProduct = products[index];
    if (oldProduct.imagem !== imagem && oldProduct.imagem && !oldProduct.imagem.startsWith('http')) {
        const oldImagePath = path.join(__dirname, 'img', oldProduct.imagem);
        if (fs.existsSync(oldImagePath)) {
            try {
                fs.unlinkSync(oldImagePath);
            } catch (error) {
                console.error('Erro ao deletar imagem antiga:', error);
            }
        }
    }

    const updatedProduct = {
        id,
        nome,
        preco: parseFloat(preco),
        imagem,
        descricao
    };

    products[index] = updatedProduct;
    saveDataToCSV(); // Salva imediatamente no CSV
    res.json(updatedProduct);
});

app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Remove a imagem do produto se for local
    const product = products[index];
    if (product.imagem && !product.imagem.startsWith('http')) {
        const imagePath = path.join(__dirname, 'img', product.imagem);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (error) {
                console.error('Erro ao deletar imagem:', error);
            }
        }
    }

    products.splice(index, 1);
    saveDataToCSV(); // Salva imediatamente no CSV
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
    saveAdministratorsToCSV(); // Salva imediatamente no CSV
    
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
    saveAdministratorsToCSV(); // Salva imediatamente no CSV
    
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
    saveAdministratorsToCSV(); // Salva imediatamente no CSV
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