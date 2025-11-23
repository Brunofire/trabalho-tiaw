
const API_URL = "/api";
const USER_ID = 1; // ID de usuário fixo para simular um usuário logado.

/* ----------------------------- BUSCAR DADOS ----------------------------- */

async function buscarDados( ) {
    try {
        // Busca produtos e favoritos em paralelo
        const [produtosResponse, favoritosResponse] = await Promise.all([
            fetch(`${API_URL}/produtos`),
            fetch(`${API_URL}/favoritos?usuarioId=${USER_ID}`)
        ]);

        if (!produtosResponse.ok) {
            throw new Error(`Erro HTTP ao buscar produtos: ${produtosResponse.status}`);
        }
        if (!favoritosResponse.ok) {
            throw new Error(`Erro HTTP ao buscar favoritos: ${favoritosResponse.status}`);
        }

        const produtos = await produtosResponse.json();
        const favoritos = await favoritosResponse.json();

        // Mapeia os favoritos para um Set para consulta rápida
        const favoritosSet = new Set(favoritos.map(fav => fav.produtoId));

        // Adiciona a propriedade 'isFavorito' a cada produto
        const produtosComFavorito = produtos.map(produto => ({
            ...produto,
            isFavorito: favoritosSet.has(produto.id)
        }));

        return produtosComFavorito;

    } catch (error) {
        console.error("Falha ao carregar produtos do JSON Server:", error);

        // Fallback para arquivo local (mantido do seu código original)
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

/* ------------------------ SALVAR PRODUTO DETALHES ----------------------- */

function verDetalhes(produto) {
    localStorage.setItem("produtoSelecionado", JSON.stringify(produto));
    window.location.href = "detalhesproduto.html";
}

/* ---------------------- FAVORITAÇÃO COM JSON SERVER --------------------------- */

async function alternarFavorito(produtoId, isFavorito) {
    const btn = document.querySelector(`.btn-favoritar[data-id="${produtoId}"]`);
    if (btn) btn.disabled = true; // Desabilita o botão para evitar cliques múltiplos

    try {
        if (isFavorito) {
            // Desfavoritar: Encontrar o registro e deletar
            const response = await fetch(`${API_URL}/favoritos?produtoId=${produtoId}&usuarioId=${USER_ID}`);
            const favoritos = await response.json();

            if (favoritos.length > 0) {
                const favId = favoritos[0].id;
                await fetch(`${API_URL}/favoritos/${favId}`, {
                    method: 'DELETE'
                });
            }
            
            if (btn) {
                btn.innerHTML = '⭐ Favoritar';
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-outline-warning');
            }

        } else {
            // Favoritar: Criar um novo registro
            const novoFavorito = {
                produtoId: produtoId,
                usuarioId: USER_ID
            };

            await fetch(`${API_URL}/favoritos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoFavorito)
            });

            if (btn) {
                btn.innerHTML = '⭐ Favoritado (Desfazer)';
                btn.classList.remove('btn-outline-warning');
                btn.classList.add('btn-warning');
            }
        }
        
        // Atualiza o ranking após a alteração
        await atualizarRanking();

    } catch (error) {
        console.error("Erro ao alternar favorito:", error);
        alert("Não foi possível atualizar os favoritos. Verifique se o JSON Server está rodando.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function configurarFavoritar(produtos) {
    const botoesFav = document.querySelectorAll(".btn-favoritar");

    botoesFav.forEach(btn => {
        // Remove listeners antigos para evitar duplicação
        btn.replaceWith(btn.cloneNode(true));
    });

    const novosBotoesFav = document.querySelectorAll(".btn-favoritar");

    novosBotoesFav.forEach(btn => {
        const produtoId = parseInt(btn.dataset.id);
        const produto = produtos.find(p => p.id === produtoId);
        
        if (produto) {
            // Configura o estado inicial do botão
            if (produto.isFavorito) {
                btn.innerHTML = '⭐ Favoritado (Desfazer)';
                btn.classList.remove('btn-outline-warning');
                btn.classList.add('btn-warning');
            } else {
                btn.innerHTML = '⭐ Favoritar';
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-outline-warning');
            }

            // Adiciona o novo listener
            btn.addEventListener("click", () => {
                // Passa o estado atual para a função de alternância
                const isFavorito = btn.classList.contains('btn-warning');
                alternarFavorito(produtoId, isFavorito);
            });
        }
    });
}

/* -------------------------- RANKING DE FAVORITOS ------------------------- */

async function atualizarRanking() {
    const lista = document.getElementById("ranking-favoritos");
    if (!lista) return;

    try {
        // 1. Busca todos os favoritos
        const response = await fetch(`${API_URL}/favoritos`);
        if (!response.ok) throw new Error('Falha ao buscar favoritos para ranking');
        const todosFavoritos = await response.json();

        // 2. Conta a frequência de cada produtoId
        const contagem = todosFavoritos.reduce((acc, fav) => {
            acc[fav.produtoId] = (acc[fav.produtoId] || 0) + 1;
            return acc;
        }, {});

        // 3. Converte para array e ordena
        const ranking = Object.entries(contagem)
            .map(([produtoId, count]) => ({ produtoId: parseInt(produtoId), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5

        // 4. Busca os nomes dos produtos (se necessário, para simplificar, vamos usar apenas o ID)
        // Por enquanto, vamos usar apenas o ID e a contagem.

        lista.innerHTML = ranking.length === 0
            ? "<li>Nenhum produto favoritado ainda.</li>"
            : ranking.map(item => `<li>Produto #${item.produtoId} — ⭐ ${item.count} favorito(s)</li>`).join("");

    } catch (error) {
        console.error("Erro ao atualizar ranking:", error);
        lista.innerHTML = "<li>Erro ao carregar ranking.</li>";
    }
}

/* ----------------------------- MONTAR PAGINA ----------------------------- */

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
        
        // Define o estilo inicial do botão
        const btnClass = item.isFavorito ? 'btn-warning' : 'btn-outline-warning';
        const btnText = item.isFavorito ? '⭐ Favoritado (Desfazer)' : '⭐ Favoritar';

        return `
            <div class="col-12 col-md-6 col-lg-3 mb-4">
                <div class="card h-100 product-card">
                    <img src="${caminhoImagem}" class="card-img-top" alt="${item.nome}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${item.nome}</h5>
                        <h6><s>R$ ${item.PrecoOriginal.toFixed(2)}</s></h6>
                        <h5><strong>R$ ${item.PrecoComDesconto.toFixed(2)}</strong></h5>
                        <h6 style="color:#6d1e0d"><strong>${item.DataValidade}</strong></h6>

                        <button class="btn ${btnClass} mb-2 btn-favoritar" data-id="${item.id}">
                            ${btnText}
                        </button>

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

    // Passa a lista completa de produtos para configurar os listeners
    configurarFavoritar(dadosParaRenderizar);
}

/* ----------------------- CONVERSÃO DE DATA ------------------------ */

function converterData(dataString) {
    const [dia, mes, ano] = dataString.split('/');
    return new Date(ano, mes - 1, dia);
}

/* ------------------------- INICIO DO SISTEMA ------------------------- */

document.addEventListener('DOMContentLoaded', async () => {

    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'block';

    const dados = await buscarDados();
    if (loadingDiv) loadingDiv.style.display = 'none';

    if (!dados) {
        document.getElementById('lista-produtos').innerHTML =
            '<div class="alert alert-danger text-center">Erro ao carregar produtos.</div>';
        return;
    }

    // Armazena os dados originais globalmente para uso nos filtros
    window.todosOsProdutos = dados;

    const filtroCategoria = document.getElementById('categoryFilter');
    const btnMaisProximos = document.getElementById('btnMaisProximos');
    const btnMostrarTodos = document.getElementById('btnMostrarTodos');

    /* Criar categorias no SELECT */
    const categorias = [...new Set(dados.map(item => item.categoria))];

    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filtroCategoria.appendChild(option);
    });

    /* FILTRO POR CATEGORIA */
    filtroCategoria.addEventListener('change', () => {
        const categoriaSelecionada = filtroCategoria.value;
        const filtrados = categoriaSelecionada === 'todos'
            ? window.todosOsProdutos
            : window.todosOsProdutos.filter(item => item.categoria === categoriaSelecionada);

        montarPaginaHome(filtrados);
    });

    /* PRODUTOS MAIS PRÓXIMOS DE VENCER */
    if (btnMaisProximos) {
        btnMaisProximos.addEventListener('click', () => {
            const ordenados = [...window.todosOsProdutos].sort((a, b) => {
                return converterData(a.DataValidade) - converterData(b.DataValidade);
            });

            montarPaginaHome(ordenados.slice(0, 10));
            btnMaisProximos.style.display = 'none';
            btnMostrarTodos.style.display = 'inline-block';
        });
    }

    /* MOSTRAR TODOS */
    if (btnMostrarTodos) {
        btnMostrarTodos.addEventListener('click', () => {
            montarPaginaHome(window.todosOsProdutos);
            btnMostrarTodos.style.display = 'none';
            btnMaisProximos.style.display = 'inline-block';
        });
    }

    /* ATUALIZAR RANKING AO CARREGAR */
    await atualizarRanking();

    /* MOSTRAR TODOS AO INICIAR */
    montarPaginaHome(dados);
});

/* Tornar função global */
window.verDetalhes = verDetalhes;
window.alternarFavorito = alternarFavorito; // Expor para debug, se necessário
