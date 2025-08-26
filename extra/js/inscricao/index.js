// index.js — lista editais/vagas e registra a vaga escolhida
document.addEventListener("DOMContentLoaded", () => {
    // elementos
    const elLista = document.getElementById("lista");
    const elStatus = document.getElementById("status");
    const elSubtitulo = document.getElementById("subtitulo");
    const btnVoltar = document.getElementById("btn-voltar");
    const btnReload = document.getElementById("btn-recarregar");

    // estado
    let etapa = "editais"; // "editais" | "vagas"
    let editalAtual = { ano: null, numero: null };

    // helpers
    function showStatus(msg, type = "danger") {
        elStatus.className = `alert alert-${type} mt-3`;
        elStatus.innerHTML = msg;
        elStatus.classList.remove("d-none");
    }
    function clearStatus() {
        elStatus.className = "alert d-none mt-3";
        elStatus.innerHTML = "";
    }
    function setLoading(texto = "Carregando…") {
        elLista.innerHTML = `
      <div class="text-center">
        <div class="spinner-border" role="status" aria-label="Carregando"></div>
        <p class="mt-2 mb-0">${texto}</p>
      </div>`;
        btnReload.classList.add("d-none");
        clearStatus();
    }
    function resetToEditais() {
        etapa = "editais";
        editalAtual = { ano: null, numero: null };
        elSubtitulo.textContent = "";
        btnVoltar.classList.add("d-none");
        carregarEditais();
    }
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
    }
    function authHeaders(json = false) {
        const h = {};
        if (json) h["Content-Type"] = "application/json";
        const csrf = getCookie("csrftoken");
        if (csrf) h["X-CSRFToken"] = csrf;
        return h;
    }

    // editais
    function renderItemEdital(ed) {
        const a = document.createElement("a");
        a.className = "edital-link";
        a.setAttribute("role", "listitem");

        const strong = document.createElement("strong");
        strong.textContent = `${ed.numero}/${ed.ano}`;
        const sep = document.createTextNode(" — ");
        const span = document.createElement("span");
        span.textContent = ed.descricao ?? "";

        a.append(strong, sep, span);
        a.href = "#";
        a.addEventListener("click", (e) => {
            e.preventDefault();
            carregarVagas(ed.ano, ed.numero);
        });
        return a;
    }

    async function carregarEditais() {
        etapa = "editais";
        setLoading("Carregando editais…");
        try {
            const resp = await fetch("/backend/inscricao/editais/", {
                method: "GET",
                credentials: "include",
            });
            const data = await resp.json().catch(() => []);
            elLista.innerHTML = "";

            if (!resp.ok) throw new Error("Erro ao carregar editais.");
            if (!Array.isArray(data) || data.length === 0) {
                elLista.innerHTML = `
          <div class="alert alert-info mb-0" role="alert">
            Nenhum edital disponível para inscrição no momento.
          </div>`;
                return;
            }

            // ordenar por ano desc, depois número desc
            data.sort(
                (a, b) =>
                    (b.ano ?? 0) - (a.ano ?? 0) ||
                    (b.numero ?? 0) - (a.numero ?? 0)
            );

            for (const ed of data) {
                elLista.appendChild(renderItemEdital(ed));
            }
        } catch (e) {
            showStatus(e.message || "Falha ao carregar editais.");
            elLista.innerHTML = "";
            btnReload.classList.remove("d-none");
        }
    }

    // vagas
    function renderItemVaga(v) {
        const a = document.createElement("a");
        a.className = "vaga-link";
        a.setAttribute("role", "listitem");

        const qtd =
            v.quantidade != null
                ? v.quantidade === 1
                    ? "1 vaga"
                    : `${v.quantidade} vagas`
                : null;
        const titulo = [v.descricao ?? "-", qtd].filter(Boolean).join(" — ");
        a.textContent = titulo;

        a.href = "#";
        a.addEventListener("click", (e) => {
            e.preventDefault();
            registrarVaga(v.id, editalAtual.ano, editalAtual.numero);
        });
        return a;
    }

    async function carregarVagas(ano, numero) {
        etapa = "vagas";
        editalAtual = { ano, numero };
        elSubtitulo.textContent = `Edital ${numero}/${ano} — escolha uma vaga`;
        btnVoltar.classList.remove("d-none");
        setLoading("Carregando vagas…");

        try {
            const resp = await fetch(
                `/backend/inscricao/edital/${encodeURIComponent(
                    ano
                )}/${encodeURIComponent(numero)}/`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );
            const vagas = await resp.json().catch(() => []);
            elLista.innerHTML = "";

            if (!resp.ok) throw new Error("Erro ao carregar vagas.");
            if (!Array.isArray(vagas) || vagas.length === 0) {
                elLista.innerHTML = `
          <div class="alert alert-info mb-0" role="alert">
            Nenhuma vaga disponível neste edital.
          </div>`;
                return;
            }

            for (const v of vagas) {
                elLista.appendChild(renderItemVaga(v));
            }
        } catch (e) {
            showStatus(e.message || "Falha ao carregar vagas.");
            elLista.innerHTML = "";
            btnReload.classList.remove("d-none");
        }
    }

    // registrar vaga
    async function registrarVaga(vagaId, ano, numero) {
        clearStatus();
        try {
            const resp = await fetch(
                `/backend/inscricao/edital/${encodeURIComponent(
                    ano
                )}/${encodeURIComponent(numero)}/`,
                {
                    method: "POST",
                    headers: authHeaders(true),
                    body: JSON.stringify({ vaga_id: vagaId }),
                    credentials: "include",
                }
            );

            // 200/201/204 aceitos
            if (!resp.ok) throw new Error("Erro ao registrar a vaga.");
            window.location.href = "pessoa.html";
        } catch (e) {
            showStatus(e.message || "Falha ao registrar a vaga.");
        }
    }

    // eventos
    btnReload.addEventListener("click", () => {
        if (etapa === "editais") carregarEditais();
        else carregarVagas(editalAtual.ano, editalAtual.numero);
    });
    btnVoltar.addEventListener("click", resetToEditais);

    // init
    carregarEditais();
});
