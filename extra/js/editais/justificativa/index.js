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
        const a = document.createElement("a");
        a.className = "edital-link";
        a.setAttribute("role", "listitem");

        a.href = `justificativa.html?id=${encodeURIComponent(edital.id)}`;

        const icon = document.createElement("i");
        icon.className = "bi bi-arrow-right-circle me-2";
        a.prepend(icon);

        const textNode = document.createTextNode(edital.edital_str ?? "");
        a.appendChild(textNode);

        return a;
    }

    async function carregarEditais() {
        setLoading();
        try {
            const resp = await fetch("/backend/editais/justificativa/", {
                method: "GET",
            });
            if (!resp.ok) throw new Error("Erro ao carregar editais.");

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
