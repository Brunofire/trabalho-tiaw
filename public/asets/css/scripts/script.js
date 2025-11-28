const API_URL = "http://localhost:3000";

async function buscarDados() {
    try {
        const response = await fetch(`${API_URL}/produtos`);

        if (!response.ok) {
            throw new Error(`Erro HTTP ao buscar produtos: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error("Falha ao carregar produtos do JSON Server:", error);

        try {
            const response = await fetch('../Js/produtos.json');
            if (!response.ok) throw new Error('Fallback também falhou');
            return await response.json();

        } catch (fallbackError) {
            console.error("Falha CRÍTICA ao carregar produtos:", fallbackError);
            return null;
        }
    }
}

// --------------- Detalhes ----------------
function verDetalhes(produto) {
    localStorage.setItem("produtoSelecionado", JSON.stringify(produto));
    window.location.href = "detalhesproduto.html";
}

// --------------- Montar página -------------
function montarPaginaHome(dadosParaRenderizar) {
    const containerLista = document.getElementById('lista-produtos');
    const noResultsDiv = document.getElementById('noResults');

    if (!containerLista || !noResultsDiv) return;

    if (dadosParaRenderizar.length === 0) {
        containerLista.innerHTML = '';
        noResultsDiv.style.display = 'block';
        return;
    }

    noResultsDiv.style.display = 'none';

    containerLista.innerHTML = dadosParaRenderizar.map(item => {
        const caminhoImagem = `../images/${item.imagem}`;

        return `
            <div class="col-12 col-md-6 col-lg-3 mb-4">
                <div class="card h-100">
                    <img src="${caminhoImagem}" class="card-img-top" alt="${item.nome}"
                         style="height: 200px; object-fit: contain; padding: 10px;">

                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${item.nome}</h5>

                        <button class="btn btn-outline-danger fav-btn mt-1"
                            onclick="toggleFavorito('${item.id}')">
                            ❤️ Favoritar
                        </button>

                        <h6><s>R$ ${item.PrecoOriginal.toFixed(2)}</s></h6>
                        <h5><strong>R$ ${item.PrecoComDesconto.toFixed(2)}</strong></h5>
                        <h6 style="color:#6d1e0d"><strong>${item.DataValidade}</strong></h6>

                        <button onclick="verDetalhes(${JSON.stringify(item).replace(/"/g, '&quot;')})"
                                style="background-color: #6d1e0d; border-color: white;"
                                class="btn btn-primary mt-auto">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --------------- Página carregada ----------
document.addEventListener('DOMContentLoaded', async () => {
    const loadingDiv = document.getElementById('loading');
    const containerLista = document.getElementById('lista-produtos');
    const filtroCategoria = document.getElementById('categoryFilter');
    const btnMaisProximos = document.getElementById('btnMaisProximos');
    const btnMostrarTodos = document.getElementById('btnMostrarTodos');

    if (loadingDiv) loadingDiv.style.display = 'block';

    const dados = await buscarDados();

    if (loadingDiv) loadingDiv.style.display = 'none';

    if (!dados) {
        if (containerLista)
            containerLista.innerHTML = '<div class="alert alert-danger text-center">Erro ao carregar produtos.</div>';
        return;
    }

    // Criar categorias
    const categorias = [...new Set(dados.map(item => item.categoria))];

    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filtroCategoria.appendChild(option);
    });

    filtroCategoria.addEventListener('change', () => {
        const categoriaSelecionada = filtroCategoria.value;

        let dadosFiltrados =
            categoriaSelecionada === 'todos'
                ? dados
                : dados.filter(item => item.categoria === categoriaSelecionada);

        montarPaginaHome(dadosFiltrados);
    });

    // 🔸 Mais próximos de vencer
    if (btnMaisProximos) {
        btnMaisProximos.addEventListener('click', () => {
            const ordenados = [...dados].sort((a, b) => {
                const dataA = converterData(a.DataValidade);
                const dataB = converterData(b.DataValidade);
                return dataA - dataB;
            });

            const proximos = ordenados.slice(0, 10);

            montarPaginaHome(proximos);

            btnMostrarTodos.style.display = 'inline-block';
            btnMaisProximos.style.display = 'none';
        });
    }

    if (btnMostrarTodos) {
        btnMostrarTodos.addEventListener('click', () => {
            montarPaginaHome(dados);
            btnMostrarTodos.style.display = 'none';
            btnMaisProximos.style.display = 'inline-block';
        });
    }

    montarPaginaHome(dados);

    carregarRankingFavoritos(); // <<<<<<<<<< ADICIONADO
});

// ---------------- Auxiliar ---------------
function converterData(dataString) {
    const [dia, mes, ano] = dataString.split('/');
    return new Date(ano, mes - 1, dia);
}

window.verDetalhes = verDetalhes;

// =======================================================
// 🔥 SISTEMA DE FAVORITAÇÃO + RANKING 100% FUNCIONAL 🔥
// =======================================================

// Simulando usuário logado (fixo)
const usuarioAtual = 1;

// Alternar favorito
async function toggleFavorito(produtoId) {
    try {
        const response = await fetch(`${API_URL}/votos`);
        const votos = await response.json();

        const votoExistente = votos.find(v => v.produtoId == produtoId && v.usuarioId == usuarioAtual);

        if (votoExistente) {
            // desfavorita
            await fetch(`${API_URL}/votos/${votoExistente.id}`, { method: "DELETE" });

        } else {
            // favoritar
            await fetch(`${API_URL}/votos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuarioId: usuarioAtual,
                    produtoId: produtoId,
                    data: Date.now()
                })
            });
        }

        carregarRankingFavoritos();

    } catch (error) {
        console.error("Erro ao favoritar:", error);
    }
}

// -------- Ranking lateral --------
async function carregarRankingFavoritos() {
    try {
        const produtos = await (await fetch(`${API_URL}/produtos`)).json();

        const lista = document.getElementById("ranking-favoritos");
        if (!lista) return;

        lista.innerHTML = "";

        produtos
            .sort((a, b) => b.votos - a.votos)
            .forEach((p, index) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <strong>${index + 1}º</strong> - ${p.nome}<br>
                    <small>${p.loja}</small><br>
                    <span class="badge bg-danger">${p.votos} votos</span>
                `;
                lista.appendChild(li);
            });

    } catch (error) {
        console.error("Erro ao carregar ranking:", error);
    }
}

