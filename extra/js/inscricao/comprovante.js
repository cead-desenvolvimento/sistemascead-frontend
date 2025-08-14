// comprovante.js — obtém dados e preenche o comprovante
document.addEventListener("DOMContentLoaded", () => {
    const statusMessage = document.getElementById("status-message");
    const container = document.getElementById("comprovante-container");
    const btnImprimir = document.getElementById("btn-imprimir");
    const btnVoltar = document.getElementById("btn-voltar");

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
        statusMessage.innerHTML = `<div class="alert ${cls} py-2 mb-3">${html}</div>`;
    }

    function toBrDateTime(iso) {
        const d = new Date(iso);
        return {
            data: d.toLocaleDateString("pt-BR"),
            hora: d.toLocaleTimeString("pt-BR"),
        };
    }

    async function carregar() {
        setStatus("");
        try {
            const r = await fetch("/backend/inscricao/obter_inscricao/", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (!r.ok)
                throw new Error("Erro ao carregar os dados da inscrição.");
            const data = await r.json();

            document.getElementById("pessoa-nome").textContent =
                data.pessoa_nome ?? "";
            document.getElementById("edital").textContent = data.edital ?? "";
            document.getElementById("vaga-nome").textContent =
                data.vaga_nome ?? "";

            const insc = data.inscricao || {};
            document.getElementById("inscricao-id").textContent = insc.id ?? "";
            document.getElementById("pontuacao").textContent =
                insc.pontuacao ?? 0;

            const { data: d, hora: h } = toBrDateTime(insc.data || Date.now());
            document.getElementById("data-inscricao").textContent = d;
            document.getElementById("hora-inscricao").textContent = h;

            // assinatura digital (mostra em bloco com borda)
            const assinatura = insc.assinatura || "";
            document.getElementById("assinatura-digital").textContent =
                assinatura;

            // lista de anexos
            const ul = document.getElementById("arquivos-anexados");
            ul.innerHTML = "";
            const arquivos = Array.isArray(data.arquivos_do_candidato)
                ? data.arquivos_do_candidato
                : [];
            if (!arquivos.length) {
                ul.innerHTML = "<li>Nenhum documento anexado.</li>";
            } else {
                for (const item of arquivos) {
                    const li = document.createElement("li");
                    li.textContent = String(item);
                    ul.appendChild(li);
                }
            }
        } catch (e) {
            console.error(e);
            setStatus(
                e.message || "Erro ao carregar os dados da inscrição.",
                "danger"
            );
            container.style.display = "none";
            btnImprimir.style.display = "none";
            setTimeout(() => {
                window.location.href = "index.html";
            }, 3000);
        }
    }

    btnImprimir.addEventListener("click", () => window.print());
    btnVoltar.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    carregar();
});
