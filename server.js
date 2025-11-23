const express = require('express');
const path = require('path');
const jsonServer = require('json-server');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configura a pasta 'public' para servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Configura o JSON Server (API)
// O JSON Server lê o db.json que está dentro da pasta 'db'
const router = jsonServer.router(path.join(__dirname, 'db', 'db.json'));
const middlewares = jsonServer.defaults();

// O JSON Server será acessível através do prefixo /api
// Ex: http://localhost:3000/api/produtos
app.use('/api', middlewares, router );

// 3. Força a abertura do homepage.html na raiz '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}. Acesse a aba Webview.`);
  console.log(`API JSON Server disponível em http://localhost:${PORT}/api` );
});
