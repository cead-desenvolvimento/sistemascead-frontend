(() => {
    "use strict";

    // Utilidades
    const $ = (sel) => document.querySelector(sel);
    const statusBox = $("#status");
    const form = $("#form-consulta");
    const inputCPF = $("#cpf");
    const btn = $("#btn-consultar");
    const spinner = btn.querySelector(".spinner-border");
    const btnText = $("#btn-text");
    const btnReload = $("#btn-recarregar");
    const params = new URLSearchParams(window.location.search);
    const ano = params.get("ano");
    const numero = params.get("numero");

    function showStatus(msg, type = "danger") {
        statusBox.className = `alert alert-${type}`;
        statusBox.innerHTML = msg;
        statusBox.classList.remove("d-none");
        statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function clearStatus() {
        statusBox.className = "alert d-none";
        statusBox.innerHTML = "";
    }
    function toggleLoading(isLoading) {
        btn.disabled = isLoading;
        spinner.classList.toggle("d-none", !isLoading);
        btnText.textContent = isLoading
            ? "Enviando..."
            : "Consultar justificativas";
    }
    function onlyDigits(v) {
        return (v || "").replace(/\D/g, "");
    }
    function maskCPF(v) {
        const s = onlyDigits(v).slice(0, 11);
        const p1 = s.slice(0, 3),
            p2 = s.slice(3, 6),
            p3 = s.slice(6, 9),
            p4 = s.slice(9, 11);
        let out = p1;
        if (p2) out += "." + p2;
        if (p3) out += "." + p3;
        if (p4) out += "-" + p4;
        return out;
    }

    // UI inicial
    (function init() {
        // Subtítulo do edital
        const info = $("#edital-info");
        if (ano && numero) {
            info.textContent = `Edital ${numero}/${ano}`;
        } else {
            info.textContent = "";
            showStatus(
                `<i class="bi bi-exclamation-triangle-fill me-2"></i>Parâmetros do edital ausentes na URL.`,
                "danger"
            );
            form.classList.add("d-none");
        }

        // Máscara e foco no CPF
        inputCPF.addEventListener(
            "input",
            () => {
                inputCPF.value = maskCPF(inputCPF.value);
                // Mantém o cursor no fim (UX simples)
                inputCPF.setSelectionRange(
                    inputCPF.value.length,
                    inputCPF.value.length
                );
            },
            { passive: true }
        );
        inputCPF.addEventListener("focus", () => {
            if (!inputCPF.value) inputCPF.value = "";
        });
        inputCPF.addEventListener("blur", () => {
            if (!inputCPF.value) inputCPF.value = "";
        });
        inputCPF.placeholder = "000.000.000-00";

        // Botão recarregar
        btnReload.addEventListener("click", () => {
            clearStatus();
            form.requestSubmit();
        });
    })();

    // Submissão
    form?.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        clearStatus();
        btnReload.classList.add("d-none");

        const cpfNum = onlyDigits(inputCPF.value);
        if (cpfNum.length !== 11) {
            showStatus(
                `<i class="bi bi-exclamation-circle me-2"></i>CPF inválido. Digite 11 números.`,
                "warning"
            );
            inputCPF.focus();
            return;
        }
        if (!ano || !numero) {
            showStatus(
                `<i class="bi bi-exclamation-triangle-fill me-2"></i>Parâmetros do edital ausentes na URL.`,
                "danger"
            );
            return;
        }

        toggleLoading(true);
        try {
            const resp = await fetch(
                `/backend/editais/${encodeURIComponent(
                    ano
                )}/${encodeURIComponent(numero)}/justificativa/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cpf: cpfNum }),
                }
            );

            // Lê como texto primeiro para tolerar 204/strings
            const raw = await resp.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = {};
            }

            if (resp.ok) {
                const nome = data?.detail?.nome || "Candidato";
                const email = data?.detail?.email || "seu e-mail";
                showStatus(
                    `<i class="bi bi-check-circle-fill me-2"></i>${nome}, as justificativas foram enviadas para <strong>${email}</strong>.`,
                    "success"
                );
                btn.classList.add("d-none");
            } else {
                let msg = "Erro ao consultar justificativas.";
                if (data?.detail) msg = data.detail;
                else if (data?.cpf && Array.isArray(data.cpf))
                    msg = data.cpf[0];
                showStatus(
                    `<i class="bi bi-x-octagon-fill me-2"></i>${msg}`,
                    "danger"
                );
                btnReload.classList.remove("d-none");
            }
        } catch {
            showStatus(
                `<i class="bi bi-x-octagon-fill me-2"></i>Erro ao conectar ao servidor.`,
                "danger"
            );
            btnReload.classList.remove("d-none");
        } finally {
            toggleLoading(false);
        }
    });
})();
