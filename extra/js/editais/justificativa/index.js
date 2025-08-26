(() => {
    "use strict";

    const elLista = document.getElementById("editais-list");
    const elStatus = document.getElementById("status");
    const btnReload = document.getElementById("btn-recarregar");

    function showStatus(msg, type = "danger") {
        elStatus.className = `alert alert-${type}`;
        elStatus.textContent = msg;
        elStatus.classList.remove("d-none");
    }

    function clearStatus() {
        elStatus.className = "alert d-none";
        elStatus.textContent = "";
    }

    function setLoading() {
        elLista.innerHTML = `
      <div class="text-center">
        <div class="spinner-border" role="status" aria-label="Carregando"></div>
        <p class="mt-2 mb-0">Carregando editais...</p>
      </div>`;
        btnReload.classList.add("d-none");
        clearStatus();
    }

    function criarItem(edital) {
        // <a href="justificativa.html?ano=YYYY&numero=NNN">NNN/YYYY — descrição</a>
        const a = document.createElement("a");
        a.className = "edital-link";
        a.setAttribute("role", "listitem");

        const ano = edital?.ano ?? "";
        const numero = edital?.numero ?? "";
        a.href = `justificativa.html?ano=${encodeURIComponent(
            ano
        )}&numero=${encodeURIComponent(numero)}`;

        const strong = document.createElement("strong");
        strong.textContent = `${numero}/${ano}`;

        const sep = document.createTextNode(" — ");

        const spanDesc = document.createElement("span");
        spanDesc.textContent = edital?.descricao ?? "";

        const icon = document.createElement("i");
        icon.className = "bi bi-arrow-right-circle me-2";
        a.prepend(icon);

        a.appendChild(strong);
        a.appendChild(sep);
        a.appendChild(spanDesc);
        return a;
    }

    async function carregarEditais() {
        setLoading();
        try {
            const resp = await fetch("/backend/editais/justificativa/", {
                method: "GET",
            });
            if (!resp.ok) throw new Error("Erro ao carregar editais.");

            // alguns backends podem retornar 204 (sem conteúdo)
            const texto = await resp.text();
            const data = texto ? JSON.parse(texto) : [];

            elLista.innerHTML = "";

            if (!Array.isArray(data) || data.length === 0) {
                elLista.innerHTML = `
          <div class="alert alert-info text-center mb-0" role="alert">
            Nenhum edital disponível para justificativa no momento.
          </div>`;
                btnReload.classList.remove("d-none");
                return;
            }

            for (const ed of data) {
                elLista.appendChild(criarItem(ed));
            }
        } catch (e) {
            showStatus(e.message || "Falha ao carregar editais.");
            elLista.innerHTML = "";
            btnReload.classList.remove("d-none");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        btnReload.addEventListener("click", carregarEditais);
        carregarEditais();
    });
})();
