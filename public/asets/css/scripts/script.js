const API_URL = "http://localhost:3333";
const USER_ID = 1;

/* --------------------- BUSCAR DADOS --------------------- */
async function buscarDados() {
    try {
        const [produtosRes, votosRes] = await Promise.all([
            fetch(`${API_URL}/produtos`),
            fetch(`${API_URL}/votos`)
        ]);

        if (!produtosRes.ok || !votosRes.ok) throw new Error("Erro ao buscar dados.");

        const produtos = await produtosRes.json();
        const votos = await votosRes.json();

        const mapaVotos = votos.reduce((acc, v) => {
            acc[v.produtoId] = (acc[v.produtoId] || 0) + 1;
            return acc;
        }, {});

        const meusVotos = new Set(
            votos
                .filter(v => Number(v.pessoaId) === USER_ID)
                .map(v => Number(v.produtoId))
        );

        return {
            produtos: produtos.map(p => ({
                ...p,
                votos: mapaVotos[p.id] || 0,
                isVotado: meusVotos.has(p.id)
            }))
        };

    } catch (err) {
        console.error(err);
        return null;
    }
}

/* --------------------- MONTAR CARDS --------------------- */
function montarPaginaHome(produtos) {
    const container = document.getElementById('lista-produtos');
    const noResults = document.getElementById('noResults');

    if (!produtos || produtos.length === 0) {
        container.innerHTML = "";
        noResults.style.display = "block";
        return;
    }

    noResults.style.display = "none";

    container.innerHTML = produtos.map(item => {
        const caminhoImagem = `/public/asets/css/img/${item.imagem}`;

        return `
            <div class="col-12 col-md-6 col-lg-3 mb-4">
                <div class="card h-100">
                    <img src="${caminhoImagem}" class="card-img-top" alt="${item.nome}"
                        style="height:200px; object-fit:contain; padding:10px;">
                    
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${item.nome}</h5>
                        <h6><small>Loja/Mercado: ${item.loja || item.mercado || item.categoria}</small></h6>

                        <p><s>R$ ${Number(item.PrecoOriginal).toFixed(2)}</s></p>
                        <p><strong>R$ ${Number(item.PrecoComDesconto).toFixed(2)}</strong></p>
                        <p><small>Validade: ${item.DataValidade}</small></p>

                        <button class="btn ${item.isVotado ? "btn-warning" : "btn-outline-warning"} 
                            mb-2 btn-favoritar" 
                            data-id="${item.id}">
                            ${item.isVotado ? "⭐ Favoritado (Desfazer)" : "⭐ Favoritar"}
                        </button>

                        <button onclick="verDetalhes(${JSON.stringify(item).replace(/"/g, '&quot;')})"
                            class="btn btn-primary mt-auto" 
                            style="background-color:#6d1e0d; border:none;">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    configurarBotoesFavoritar();
}

/* ----------------- HANDLER ÚNICO DE CLICK ----------------- */
async function handleFavoritoClick(event) {
    const btn = event.currentTarget;
    const produtoId = Number(btn.dataset.id);

    btn.disabled = true;
    try {
        await toggleFavorito(produtoId);
    } catch (err) {
        console.error("Erro no toggleFavorito:", err);
        alert("Erro ao atualizar voto.");
    } finally {
        btn.disabled = false;
    }
}

/* ----------------- CONFIGURAR BOTÕES DE FAVORITAR ----------------- */
function configurarBotoesFavoritar() {
    const botoes = document.querySelectorAll('.btn-favoritar');

    botoes.forEach(btn => {
        btn.removeEventListener('click', handleFavoritoClick);
        btn.addEventListener('click', handleFavoritoClick);
    });
}

/* ----------------- FUNÇÃO TOGGLE (Votar/Desvotar) ----------------- */
async function toggleFavorito(produtoId) {
    const queryUrl = `${API_URL}/votos?produtoId=${produtoId}&pessoaId=${USER_ID}`;
    const res = await fetch(queryUrl);

    if (!res.ok) throw new Error("Falha ao consultar voto atual");

    const encontrados = await res.json();

    if (encontrados.length > 0) {
        const voteId = encontrados[0].id;
        const delRes = await fetch(`${API_URL}/votos/${voteId}`, { method: 'DELETE' });
        if (!delRes.ok) throw new Error("Falha ao deletar voto");
    } else {
        const novo = { pessoaId: USER_ID, produtoId };
        const postRes = await fetch(`${API_URL}/votos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novo)
        });
        if (!postRes.ok) throw new Error("Falha ao criar voto");
    }

    await atualizarTelaAposVoto();
}

/* ------------- Atualiza UI: produtos + ranking -------------- */
async function atualizarTelaAposVoto() {
    const dados = await buscarDados();
    if (!dados) return;

    montarPaginaHome(dados.produtos);
    renderizarRankingLateral(dados.produtos);
}

/* ----------------- RENDERIZA RANKING LATERAL ----------------- */
function renderizarRankingLateral(produtosEnriquecidos) {
    const lista = document.getElementById('ranking-favoritos');
    if (!lista) return;

    const ranking = [...produtosEnriquecidos].sort((a, b) => b.votos - a.votos);

    lista.innerHTML = '';

    ranking.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${p.nome}</strong><br>
            <small>Loja: ${p.loja || p.mercado || p.categoria}</small><br>
            <span style="color:gold">⭐ ${p.votos} votos</span>
        `;
        lista.appendChild(li);
    });
}

/* -------------------- INÍCIO -------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'block';

    const dados = await buscarDados();

    if (loadingDiv) loadingDiv.style.display = 'none';

    if (!dados) {
        const c = document.getElementById('lista-produtos');
        if (c) c.innerHTML = '<div class="alert alert-danger text-center">Erro ao carregar produtos.</div>';
        return;
    }

    montarPaginaHome(dados.produtos);
    renderizarRankingLateral(dados.produtos);

    const filtroCategoria = document.getElementById('categoryFilter');
    if (filtroCategoria) {
        const categorias = [...new Set(dados.produtos.map(p => p.categoria))];
        categorias.forEach(cat => {
            if (!Array.from(filtroCategoria.options).some(o => o.value === cat)) {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                filtroCategoria.appendChild(option);
            }
        });

        filtroCategoria.addEventListener('change', async () => {
            const categoriaSelecionada = filtroCategoria.value;

            const novosDados = await buscarDados();

            const filtrados = categoriaSelecionada === 'todos'
                ? novosDados.produtos
                : novosDados.produtos.filter(item => item.categoria === categoriaSelecionada);

            montarPaginaHome(filtrados);
            renderizarRankingLateral(filtrados);
        });
    }
});
