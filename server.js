const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public")); // sua pasta principal

// Caminho dos arquivos JSON
const produtosPath = path.join(__dirname, "Js", "produtos.json");
const favoritosPath = path.join(__dirname, "Js", "favoritos.json");

// ================================
// 1. Carregar produtos
// ================================
app.get("/api/produtos", (req, res) => {
    try {
        const data = fs.readFileSync(produtosPath, "utf-8");
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ erro: "Erro ao ler produtos.json" });
    }
});

// ================================
// 2. Carregar favoritos
// ================================
app.get("/api/favoritos", (req, res) => {
    try {
        const data = fs.readFileSync(favoritosPath, "utf-8");
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ erro: "Erro ao ler favoritos.json" });
    }
});

// ================================
// 3. Adicionar um favorito (POST)
// ================================
app.post("/api/favoritos", (req, res) => {
    try {
        const favoritos = JSON.parse(fs.readFileSync(favoritosPath, "utf-8"));

        favoritos.push({
            produtoId: req.body.produtoId,
            data: new Date().toISOString()
        });

        fs.writeFileSync(favoritosPath, JSON.stringify(favoritos, null, 2));

        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao salvar favorito" });
    }
});

// ================================
// 4. Remover favoritos por ID
// ================================
app.delete("/api/favoritos/:id", (req, res) => {
    try {
        const produtoId = req.params.id;
        let favoritos = JSON.parse(fs.readFileSync(favoritosPath, "utf-8"));

        favoritos = favoritos.filter(f => f.produtoId !== produtoId);

        fs.writeFileSync(favoritosPath, JSON.stringify(favoritos, null, 2));

        res.json({ sucesso: true });
    } catch {
        res.status(500).json({ erro: "Erro ao remover favorito" });
    }
});

// ================================
// Rodar servidor no Replit
// ================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
