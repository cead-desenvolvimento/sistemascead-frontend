// cota.js — escolha de cota (padrão novo)
document.addEventListener("DOMContentLoaded", () => {
    // --- elementos
    const alertaInscricao = document.getElementById("alerta-inscricao");
    const statusMessage = document.getElementById("status-message");

    const blocoEscolha = document.getElementById("bloco-escolha");
    const cotaSelect = document.getElementById("cota");
    const confirmarBtn = document.getElementById("confirmar-cota");

    const blocoMarcada = document.getElementById("bloco-marcada");
    const cotaMarcadaNome = document.getElementById("cota-marcada-nome");
    const removerBtn = document.getElementById("remover-cota");

    const proximoBtn = document.getElementById("proximo-passo");
    const voltarBtn = document.getElementById("voltar-index");

    let cotaMarcadaId = null;

    // --- helpers
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

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
    }
    function authHeaders() {
        const h = { "Content-Type": "application/json" };
        const csrf = getCookie("csrftoken");
        if (csrf) h["X-CSRFToken"] = csrf;
        return h;
    }
    function toggleNextEnabled() {
        proximoBtn.disabled = !(cotaMarcadaId !== null);
    }

    // --- backend
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

    function carregarCotas() {
        // estado inicial
        setStatus("");
        blocoMarcada.classList.add("d-none");
        blocoEscolha.classList.remove("d-none");
        cotaSelect.disabled = true;
        confirmarBtn.disabled = true;
        cotaSelect.innerHTML =
            "<option disabled selected>Carregando cotas…</option>";

        fetch("/backend/inscricao/cota/", {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                // se já tem cota marcada
                if (data?.cota_marcada) {
                    cotaMarcadaId = data.cota_marcada.id;
                    cotaMarcadaNome.textContent = data.cota_marcada.cota || "";
                    blocoEscolha.classList.add("d-none");
                    blocoMarcada.classList.remove("d-none");
                } else {
                    cotaMarcadaId = null;
                    blocoMarcada.classList.add("d-none");
                    blocoEscolha.classList.remove("d-none");

                    const lista = Array.isArray(data?.cotas_disponiveis)
                        ? data.cotas_disponiveis
                        : [];
                    cotaSelect.innerHTML = "";
                    const placeholder = document.createElement("option");
                    placeholder.value = "";
                    placeholder.disabled = true;
                    placeholder.selected = true;
                    placeholder.textContent = lista.length
                        ? "Selecione…"
                        : "Nenhuma cota disponível";
                    cotaSelect.appendChild(placeholder);

                    if (lista.length) {
                        for (const c of lista) {
                            const op = document.createElement("option");
                            op.value = c.id;
                            op.textContent = c.cota || `Cota #${c.id}`;
                            cotaSelect.appendChild(op);
                        }
                        cotaSelect.disabled = false;
                        confirmarBtn.disabled = false;
                    } else {
                        cotaSelect.disabled = true;
                        confirmarBtn.disabled = true;
                    }
                }
                toggleNextEnabled();
            })
            .catch(() => {
                setStatus("Erro ao buscar cotas.", "danger");
                cotaSelect.innerHTML =
                    "<option disabled selected>Erro ao carregar</option>";
                cotaSelect.disabled = true;
                confirmarBtn.disabled = true;
                toggleNextEnabled();
            });
    }

    function confirmarCota() {
        const cotaId = cotaSelect.value;
        if (!cotaId) {
            setStatus("Selecione uma cota antes de confirmar.", "warning");
            return;
        }

        const prev = confirmarBtn.innerHTML;
        confirmarBtn.disabled = true;
        confirmarBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando…';

        fetch("/backend/inscricao/cota/", {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ cota: cotaId }),
        })
            .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })))
            .then(({ ok, body }) => {
                if (!ok) {
                    const msg = body?.detail || "Erro ao confirmar cota.";
                    setStatus(msg, "danger");
                    return;
                }
                setStatus("Cota confirmada.", "success");
                carregarCotas();
            })
            .catch(() => setStatus("Erro ao confirmar cota.", "danger"))
            .finally(() => {
                confirmarBtn.innerHTML = prev;
                confirmarBtn.disabled = false;
            });
    }

    function removerCota() {
        if (!cotaMarcadaId) {
            setStatus("Nenhuma cota para remover.", "warning");
            return;
        }
        if (!confirm("Remover a cota selecionada?")) return;

        const prev = removerBtn.innerHTML;
        removerBtn.disabled = true;
        removerBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Removendo…';

        fetch(`/backend/inscricao/cota/${cotaMarcadaId}/`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })))
            .then(({ ok, body }) => {
                if (!ok) {
                    const msg = body?.detail || "Erro ao remover cota.";
                    setStatus(msg, "danger");
                    return;
                }
                setStatus(body?.message || "Cota removida.", "success");
                cotaMarcadaId = null;
                carregarCotas();
            })
            .catch(() => setStatus("Erro ao remover cota.", "danger"))
            .finally(() => {
                removerBtn.innerHTML = prev;
                removerBtn.disabled = false;
            });
    }

    // --- navegação
    proximoBtn.addEventListener("click", () => {
        if (proximoBtn.disabled) return;
        window.location.href = "formacao.html";
    });
    voltarBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    confirmarBtn.addEventListener("click", confirmarCota);
    removerBtn.addEventListener("click", removerCota);

    // --- init
    verificarAlertaInscricao();
    carregarCotas();
});
