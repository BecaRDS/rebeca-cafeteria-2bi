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

// Configuração do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'img');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Apenas imagens são permitidas.'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Middlewares
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(bodyParser.json());
app.use('/img', express.static(path.join(__dirname, 'img')));

// Variáveis globais
let products = [];
let administrators = [];
let nextId = 1;
let nextAdminId = 1;

function loadAdministratorsFromCSV() {
    const filePath = path.join(__dirname, ADMIN_CSV_FILE);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'email,senha,tipo\n');
        return;
    }
    
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    if (lines.length <= 1) return;

    administrators = lines.slice(1).map((line, i) => {
        const [email, senha, tipo] = line.split(',').map(field => field.trim());
        return {
            id: i + 1,
            email: email || '',
            senha: senha || '',
            tipo: tipo || 'funcionario'
        };
    }).filter(a => a.email && a.senha);
    
    nextAdminId = administrators.length > 0 ? Math.max(...administrators.map(a => a.id)) + 1 : 1;
    console.log('Administradores carregados:', administrators); // Log para depuração
}

// Carregar produtos
function loadDataFromCSV() {
    const filePath = path.join(__dirname, CSV_FILE);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'nome,preco,imagem,descricao\n');
        return;
    }
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    if (lines.length <= 1) return;

    products = lines.slice(1).map((line, i) => {
        const values = parseCSVLine(line);
        return {
            id: i + 1,
            nome: values[0] || '',
            preco: parseFloat(values[1]) || 0,
            imagem: values[2] || '',
            descricao: values.slice(3).join(',').replace(/"/g, '')
        };
    });
    nextId = products.length + 1;
}

// Salvamento
function saveDataToCSV() {
    const filePath = path.join(__dirname, CSV_FILE);
    const csv = 'nome,preco,imagem,descricao\n' + products.map(p =>
        `${p.nome},${p.preco},${p.imagem},"${p.descricao.replace(/"/g, '""')}"`
    ).join('\n');
    fs.writeFileSync(filePath, csv);
}

function saveAdministratorsToCSV() {
    const filePath = path.join(__dirname, ADMIN_CSV_FILE);
    const csv = 'email,senha,tipo\n' + administrators.map(a =>
        `${a.email},${a.senha},${a.tipo}`
    ).join('\n');
    fs.writeFileSync(filePath, csv);
}

// Auto-save
setInterval(() => {
    if (products.length || administrators.length) {
        saveDataToCSV();
        saveAdministratorsToCSV();
        console.log('🔄 Auto-save concluído');
    }
}, 60000);

// Inicialização
loadDataFromCSV();
loadAdministratorsFromCSV();

// ========== Rotas de Produtos ==========
app.get('/products', (req, res) => res.json(products));

app.get('/products/:id', (req, res) => {
    const produto = products.find(p => p.id === parseInt(req.params.id));
    produto ? res.json(produto) : res.status(404).json({ message: 'Produto não encontrado' });
});

app.post('/products', (req, res) => {
    const { nome, preco, imagem, descricao } = req.body;
    if (!nome || preco === undefined || !imagem || !descricao)
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });

    const novo = { id: nextId++, nome, preco: parseFloat(preco), imagem, descricao };
    products.push(novo);
    saveDataToCSV();
    res.status(201).json(novo);
});

app.put('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, preco, imagem, descricao } = req.body;
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ message: 'Produto não encontrado' });

    const oldImage = products[index].imagem;
    if (oldImage !== imagem && oldImage && !oldImage.startsWith('http')) {
        const pathToDelete = path.join(__dirname, 'img', oldImage);
        if (fs.existsSync(pathToDelete)) fs.unlinkSync(pathToDelete);
    }

    products[index] = { id, nome, preco: parseFloat(preco), imagem, descricao };
    saveDataToCSV();
    res.json(products[index]);
});

app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ message: 'Produto não encontrado' });

    const imagem = products[index].imagem;
    if (imagem && !imagem.startsWith('http')) {
        const pathToDelete = path.join(__dirname, 'img', imagem);
        if (fs.existsSync(pathToDelete)) fs.unlinkSync(pathToDelete);
    }

    products.splice(index, 1);
    saveDataToCSV();
    res.status(204).send();
});

// ========== Rotas de Administradores ==========
app.get('/administrators', (req, res) => {
    const lista = administrators.map(({ id, email, tipo }) => ({ id, email, tipo }));
    res.json(lista);
});

app.post('/administrators', (req, res) => {
    const { email, senha, tipo } = req.body;
    if (!email || !senha || !tipo)
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });

    if (administrators.find(a => a.email === email))
        return res.status(400).json({ message: 'Email já cadastrado' });

    const novo = { id: nextAdminId++, email, senha, tipo };
    administrators.push(novo);
    saveAdministratorsToCSV();
    res.status(201).json({ id: novo.id, email: novo.email, tipo: novo.tipo });
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login:', { email, senha });
    console.log('Administradores cadastrados:', administrators); // Log para depuração
    
    if (!email || !senha) return res.status(400).json({ message: 'Email e senha obrigatórios' });

    const admin = administrators.find(a => a.email === email && a.senha === senha);
    if (!admin) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });

    res.json({
        success: true,
        user: {
            id: admin.id,
            email: admin.email,
            tipo: admin.tipo
        }
    });
});

// ========== Upload ==========
app.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    res.json({
        message: 'Upload concluído',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
});

// ========== Health Check ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        hora: new Date().toISOString(),
        produtos: products.length,
        administradores: administrators.length
    });
});

// ========== Middleware de Erro ==========
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Imagem excede 5MB.' });
    }
    console.error('Erro no servidor:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
});

// ========== Inicialização ==========
app.listen(PORT, () => {
    console.log('🚀 Servidor rodando em http://localhost:' + PORT);
});
