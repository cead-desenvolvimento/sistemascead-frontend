document.addEventListener("DOMContentLoaded", function () {
    // --- Elements
    const formFormacao = document.getElementById("form-formacao");
    const formacaoFiltro = document.getElementById("formacaoFiltro");
    const formacaoSelect = document.getElementById("formacao");
    const listaFormacoes = document.getElementById("lista-formacoes");
    const statusMessage = document.getElementById("status-message");
    const inicioInput = document.getElementById("inicio");
    const fimInput = document.getElementById("fim");
    const btnSubmit = document.getElementById("btn-submit");
    const btnSubmitSpinner = btnSubmit.querySelector(".spinner-border");
    const btnSubmitLabel = btnSubmit.querySelector(".btn-label");
    const proximoPassoBtn = document.getElementById("proximo-passo");
    const alertaInscricao = document.getElementById("alerta-inscricao");
    const voltarIndexBtn = document.getElementById("voltar-index");
    const listaVazia = document.getElementById("lista-vazia");
    const listaLoading = document.getElementById("lista-loading");

    // --- Helpers
    function setStatus(html, type = "info") {
        if (!html) {
            statusMessage.innerHTML = "";
            return;
        }
        const cls =
            type === "success"
                ? "alert-success"
                : type === "warning"
                ? "alert-warning"
                : type === "danger"
                ? "alert-danger"
                : "alert-secondary";
        statusMessage.innerHTML = `<div class="alert ${cls} py-2 mb-2">${html}</div>`;
    }

    function setSubmitting(isSubmitting) {
        btnSubmit.disabled = isSubmitting;
        btnSubmitSpinner.classList.toggle("d-none", !isSubmitting);
        btnSubmitLabel.classList.toggle("d-none", isSubmitting);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
    }

    function authHeaders() {
        const headers = { "Content-Type": "application/json" };
        const csrf = getCookie("csrftoken");
        if (csrf) headers["X-CSRFToken"] = csrf;
        return headers;
    }

    function ymd(date) {
        return date.toISOString().split("T")[0];
    }

    function formatBr(yyyy_mm_dd) {
        if (!yyyy_mm_dd) return "";
        const [y, m, d] = yyyy_mm_dd.split("-");
        return `${d}/${m}/${y}`;
    }

    function toggleProximo(count) {
        proximoPassoBtn.disabled = !(count > 0);
    }

    function limparTabela() {
        listaFormacoes.innerHTML = "";
    }

    function addLinhaTabela({ id, titulacao, formacao, inicio, fim }) {
        const tr = document.createElement("tr");

        const tdTit = document.createElement("td");
        tdTit.textContent = titulacao ?? "";

        const tdCur = document.createElement("td");
        tdCur.textContent = formacao ?? "";

        const tdIni = document.createElement("td");
        tdIni.textContent = formatBr(inicio);

        const tdFim = document.createElement("td");
        tdFim.textContent = formatBr(fim);

        const tdAcoes = document.createElement("td");
        tdAcoes.className = "text-end";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-danger btn-sm";
        btn.innerHTML = '<i class="bi bi-trash"></i> Remover';
        btn.addEventListener("click", () => removerFormacao(id, tr));
        tdAcoes.appendChild(btn);

        tr.append(tdTit, tdCur, tdIni, tdFim, tdAcoes);
        listaFormacoes.appendChild(tr);
    }

    // --- Initial date constraints
    const today = new Date();
    const todayStr = ymd(today);
    inicioInput.max = todayStr;
    fimInput.max = todayStr;

    inicioInput.addEventListener("change", () => {
        if (inicioInput.value) {
            fimInput.min = inicioInput.value;
        } else {
            fimInput.removeAttribute("min");
        }
        // Se fim for menor que início, limpa
        if (
            fimInput.value &&
            inicioInput.value &&
            fimInput.value < inicioInput.value
        ) {
            fimInput.value = "";
        }
    });

    fimInput.addEventListener("change", () => {
        if (fimInput.value) {
            inicioInput.max = fimInput.value;
        } else {
            inicioInput.max = todayStr;
        }
        if (
            fimInput.value &&
            inicioInput.value &&
            fimInput.value < inicioInput.value
        ) {
            setStatus(
                "A data de conclusão não pode ser anterior à data de início.",
                "warning"
            );
            fimInput.focus();
        } else {
            setStatus("");
        }
    });

    // --- Backend calls
    function verificarAlertaInscricao() {
        fetch("/backend/inscricao/alerta_inscricao/", {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                if (data?.alerta_inscricao) {
                    alertaInscricao.innerHTML = `<strong>Atenção:</strong> ${data.alerta_inscricao}`;
                    alertaInscricao.classList.remove("d-none");
                } else {
                    alertaInscricao.classList.add("d-none");
                }
            })
            .catch(() => {
                /* silencioso */
            });
    }

    function carregarFormacoesDisponiveis(filtro = "") {
        formacaoSelect.disabled = true;
        formacaoSelect.innerHTML =
            "<option disabled selected>Carregando…</option>";

        const url = `/backend/inscricao/listar_formacao/?termo=${encodeURIComponent(
            filtro
        )}`;
        fetch(url, {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                formacaoSelect.innerHTML = "";
                const lista = data?.formacoes_disponiveis ?? [];

                if (lista.length === 0) {
                    const op = document.createElement("option");
                    op.textContent = "Nenhuma formação encontrada";
                    op.disabled = true;
                    op.selected = true;
                    formacaoSelect.appendChild(op);
                    formacaoSelect.disabled = true;
                } else {
                    const placeholder = document.createElement("option");
                    placeholder.value = "";
                    placeholder.textContent = "Selecione…";
                    placeholder.disabled = true;
                    placeholder.selected = true;
                    formacaoSelect.appendChild(placeholder);

                    for (const f of lista) {
                        const op = document.createElement("option");
                        op.value = f.id;
                        const titulacao =
                            f.cm_titulacao__nome || "Sem Titulação";
                        const nomeCurso = f.nome || "Sem Nome";
                        op.textContent = `${titulacao} - ${nomeCurso}`;
                        formacaoSelect.appendChild(op);
                    }
                    formacaoSelect.disabled = false;
                }
            })
            .catch(() => {
                setStatus("Erro ao carregar formações disponíveis.", "danger");
                formacaoSelect.innerHTML =
                    "<option disabled selected>Erro ao carregar</option>";
                formacaoSelect.disabled = true;
            });
    }

    function carregarFormacoesCadastradas() {
        listaLoading.classList.remove("d-none");
        limparTabela();
        listaVazia.classList.add("d-none");

        fetch("/backend/inscricao/listar_pessoa_formacao/", {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                const lista = data?.pessoa_formacoes ?? [];
                if (lista.length === 0) {
                    listaVazia.classList.remove("d-none");
                } else {
                    for (const f of lista) addLinhaTabela(f);
                }
                toggleProximo(lista.length);
            })
            .catch(() => {
                setStatus("Erro ao carregar formações cadastradas.", "danger");
            })
            .finally(() => {
                listaLoading.classList.add("d-none");
            });
    }

    function criarBodyFormacao(formacaoId, inicio, fim) {
        return JSON.stringify({
            ed_pessoa_formacao_id: formacaoId,
            inicio,
            fim,
        });
    }

    function adicionarFormacao(event) {
        event.preventDefault();
        setStatus("");

        // HTML5 validation
        if (!formFormacao.checkValidity()) {
            formFormacao.classList.add("was-validated");
            return;
        }

        const formacaoId = formacaoSelect.value;
        const inicio = inicioInput.value;
        const fim = fimInput.value;

        if (!formacaoId || !inicio || !fim) {
            setStatus("Preencha todos os campos.", "warning");
            return;
        }
        if (fim < inicio) {
            setStatus(
                "A data de conclusão não pode ser anterior à data de início.",
                "warning"
            );
            return;
        }

        setSubmitting(true);

        fetch("/backend/inscricao/listar_pessoa_formacao/", {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: criarBodyFormacao(formacaoId, inicio, fim),
        })
            .then((r) => r.json())
            .then((data) => {
                // Atualiza a lista sem recarregar
                carregarFormacoesCadastradas();
                // Limpa campos
                formFormacao.reset();
                formFormacao.classList.remove("was-validated");
                setStatus("Formação adicionada com sucesso.", "success");
            })
            .catch(() => {
                setStatus("Erro ao adicionar formação.", "danger");
            })
            .finally(() => setSubmitting(false));
    }

    function removerFormacao(id, rowEl) {
        if (!id) return;
        if (!confirm("Remover esta formação?")) return;

        fetch(`/backend/inscricao/listar_pessoa_formacao/${id}/`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                // Remove linha otimisticamente
                if (rowEl && rowEl.parentElement) {
                    rowEl.parentElement.removeChild(rowEl);
                }
                const countRestante =
                    listaFormacoes.querySelectorAll("tr").length;
                if (countRestante === 0) {
                    listaVazia.classList.remove("d-none");
                }
                toggleProximo(countRestante);
                setStatus(
                    data?.message || "Formação removida com sucesso.",
                    "success"
                );
            })
            .catch(() => {
                setStatus("Erro ao remover formação.", "danger");
            });
    }

    // --- Navegação
    proximoPassoBtn.addEventListener("click", () => {
        if (proximoPassoBtn.disabled) return;
        window.location.href = "campos.html";
    });

    voltarIndexBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // --- Busca com debounce
    let debounceTimer = null;
    formacaoFiltro.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const termo = this.value.trim();
        debounceTimer = setTimeout(() => {
            carregarFormacoesDisponiveis(termo);
        }, 300);
    });

    // --- Submit
    formFormacao.addEventListener("submit", adicionarFormacao);

    // --- Inicialização
    verificarAlertaInscricao();
    carregarFormacoesDisponiveis();
    carregarFormacoesCadastradas();
});
