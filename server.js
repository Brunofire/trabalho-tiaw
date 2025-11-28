import express from "express";
import cors from "cors";
import { readFile } from "fs/promises";

const app = express();
app.use(cors());

const PORT = 3000;

// Função para ler db.json
async function carregarDB() {
  const data = await readFile("./db/db.json", "utf8");
  return JSON.parse(data);
}

/* ====================  PRODUTOS + VOTOS  ==================== */

app.get("/api/produtos", async (req, res) => {
  try {
    const db = await carregarDB();

    const produtos = db.produtos;
    const votos = db.votos;

    // Conta votos por produtoId
    const mapaVotos = votos.reduce((acc, v) => {
      acc[v.produtoId] = (acc[v.produtoId] || 0) + 1;
      return acc;
    }, {});

    // Acrescenta o total de votos em cada produto
    const produtosComVotos = produtos.map((p) => ({
      ...p,
      votos: mapaVotos[p.id] || 0,
    }));

    res.json(produtosComVotos);

  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    res.status(500).json({ error: "Erro interno ao carregar produtos" });
  }
});

/* ====================  FAVORITOS  ==================== */

app.get("/api/favoritos", async (req, res) => {
  try {
    const db = await carregarDB();
    res.json(db.favoritos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar favoritos" });
  }
});

app.post("/api/favoritos", express.json(), async (req, res) => {
  res.json({ status: "ok (mock para JSON server real)" });
});

/* ==========================  INICIAR SERVER ========================== */

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));