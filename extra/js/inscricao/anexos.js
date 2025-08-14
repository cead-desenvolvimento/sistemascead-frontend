// anexos.js — upload + finalização
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-arquivos");
    const container = document.getElementById("arquivos-container");
    const statusMessage = document.getElementById("status-message");
    const voltarBtn = document.getElementById("voltar");
    const finalizarBtn = document.getElementById("btn-finalizar");
    const finalizarSpinner = finalizarBtn.querySelector(".spinner-border");
    const finalizarLabel = finalizarBtn.querySelector(".btn-label");

    // ---- helpers
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
        const h = {};
        const csrf = getCookie("csrftoken");
        if (csrf) h["X-CSRFToken"] = csrf;
        return h;
    }

    function setSubmitting(isSubmitting) {
        finalizarBtn.disabled = isSubmitting;
        finalizarSpinner.classList.toggle("d-none", !isSubmitting);
        finalizarLabel.classList.toggle("d-none", isSubmitting);
    }

    // ---- visualizar arquivo existente
    async function baixarArquivoInscricao(url) {
        try {
            const response = await fetch(url, {
                method: "GET",
                credentials: "include",
            });
            if (!response.ok) {
                let msg = "Erro ao visualizar arquivo.";
                try {
                    const erro = await response.json();
                    msg = erro?.detail || msg;
                } catch {}
                setStatus(msg, "danger");
                return;
            }
            const blob = await response.blob();
            const urlBlob = URL.createObjectURL(blob);
            window.open(urlBlob, "_blank");
        } catch {
            setStatus(
                "Erro inesperado ao tentar visualizar o arquivo.",
                "danger"
            );
        }
    }
    // expõe global (se precisar ser chamado via onclick externo)
    window.baixarArquivoInscricao = baixarArquivoInscricao;

    // ---- renderização
    function linhaArquivo({
        tipo,
        nomeCampo,
        campoId,
        possuiArquivo,
        caminhoArquivo,
    }) {
        const wrap = document.createElement("div");
        wrap.className = "mb-3";

        const label = document.createElement("label");
        label.className = "form-label";
        label.textContent = nomeCampo;

        const input = document.createElement("input");
        input.type = "file";
        input.className = "form-control";
        // nome do campo conforme backend espera: checkbox_*, combobox_*, datebox_*
        input.name = `${tipo}_${campoId}`;

        wrap.appendChild(label);
        wrap.appendChild(input);

        if (possuiArquivo && caminhoArquivo) {
            input.required = false;

            const urlDownload = `/backend/inscricao/baixar_arquivo_inscricao/?caminho=${encodeURIComponent(
                caminhoArquivo
            )}`;

            const p = document.createElement("p");
            p.className = "mt-1 mb-0";
            const a = document.createElement("a");
            a.href = "#";
            a.className = "btn-link";
            a.textContent = "Ver arquivo já enviado";
            a.addEventListener("click", (e) => {
                e.preventDefault();
                baixarArquivoInscricao(urlDownload);
            });

            const small = document.createElement("small");
            small.className = "text-muted d-block";
            small.textContent =
                "Você pode enviar outro arquivo para substituí-lo.";

            p.appendChild(a);
            p.appendChild(small);
            wrap.appendChild(p);
        } else {
            input.required = true;
        }

        return wrap;
    }

    function renderCampos(data) {
        container.innerHTML = "";

        const tipos = ["checkboxes", "comboboxes", "dateboxes"];
        for (const tipoLista of tipos) {
            const lista = data?.[tipoLista] || [];
            for (const campo of lista) {
                const tipo =
                    tipoLista === "checkboxes"
                        ? "checkbox"
                        : tipoLista === "comboboxes"
                        ? "combobox"
                        : "datebox";

                const nomeCampo = campo.nome_campo || "Documento";
                const campoId =
                    campo.ed_vaga_campo_checkbox_id ||
                    campo.ed_vaga_campo_combobox_id ||
                    campo.ed_vaga_campo_datebox_id;

                const possuiArquivo = !!campo.arquivo;
                const caminhoArquivo = campo.arquivo || null;

                container.appendChild(
                    linhaArquivo({
                        tipo,
                        nomeCampo,
                        campoId,
                        possuiArquivo,
                        caminhoArquivo,
                    })
                );
            }
        }

        if (!container.children.length) {
            container.innerHTML = `<div class="alert alert-secondary mb-0">Não há documentos a enviar para esta inscrição.</div>`;
        }
    }

    async function carregarArquivos() {
        setStatus("");
        container.innerHTML = `<div class="text-muted">Carregando…</div>`;

        try {
            const r = await fetch("/backend/inscricao/anexar_arquivos/", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(),
                },
                credentials: "include",
            });
            const data = await r.json();
            renderCampos(data);
        } catch (e) {
            setStatus("Erro ao carregar arquivos.", "danger");
            container.innerHTML = "";
        }
    }

    async function finalizarInscricao() {
        const r = await fetch("/backend/inscricao/finalizar_inscricao/", {
            method: "GET",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            credentials: "include",
        });
        const data = await r.json();
        if (!r.ok || data?.sucesso === false) {
            throw new Error(data?.detail || "Erro ao finalizar inscrição.");
        }
        // redireciona
        window.location.href = "comprovante.html";
    }

    // ---- submit
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        setStatus("");

        // valida obrigatórios
        let valido = true;
        const inputs = Array.from(form.querySelectorAll("input[type='file']"));
        inputs.forEach((i) => i.classList.remove("is-invalid"));

        for (const input of inputs) {
            if (input.required && input.files.length === 0) {
                input.classList.add("is-invalid");
                valido = false;
            }
        }
        if (!valido) {
            setStatus(
                "Todos os arquivos obrigatórios precisam ser enviados.",
                "warning"
            );
            return;
        }

        // monta formdata
        const fd = new FormData();
        for (const input of inputs) {
            if (input.files.length > 0) {
                fd.append(input.name, input.files[0]);
            }
        }

        try {
            setSubmitting(true);

            // 1) upload
            const up = await fetch("/backend/inscricao/anexar_arquivos/", {
                method: "POST",
                headers: authHeaders(), // só CSRF
                credentials: "include",
                body: fd,
            });

            if (!up.ok) {
                let msg = "Erro ao enviar arquivos.";
                try {
                    const err = await up.json();
                    msg = err?.detail || msg;
                } catch {}
                throw new Error(msg);
            }

            // 2) finalizar
            await finalizarInscricao();
        } catch (e) {
            setStatus(e.message || "Erro ao finalizar.", "danger");
        } finally {
            setSubmitting(false);
        }
    });

    // ---- navegação
    voltarBtn.addEventListener("click", () => {
        window.location.href = "campos.html";
    });

    // init
    carregarArquivos();
});
