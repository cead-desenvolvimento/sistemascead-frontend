// pessoa.js — consulta/criação de pessoa por CPF (padrão unificado)
document.addEventListener("DOMContentLoaded", () => {
    // Atalhos de DOM
    const $ = (s) => document.querySelector(s);
    const statusBox = $("#status");
    const form = $("#form-pessoa");
    const cpfInput = $("#cpf");
    const dadosSection = $("#dados-section");
    const nomeInput = $("#nome");
    const emailInput = $("#email");
    const confirmEmailInput = $("#confirm-email");
    const btnVoltar = $("#btn-voltar");
    const btnSalvar = $("#btn-salvar");
    const btnSalvarSpin = btnSalvar?.querySelector(".spinner-border");
    const btnSalvarTxt = $("#btn-salvar-texto");
    const btnReload = $("#btn-recarregar");

    let requestEmAndamento = false;

    // Helpers
    function escapeHtml(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function showStatus(msg, type = "danger") {
        statusBox.className = `alert alert-${type}`;
        statusBox.innerHTML = msg; // mensagens vindas do backend devem ser escapadas
        statusBox.classList.remove("d-none");
        statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function showStatusSafe(text, type = "danger") {
        showStatus(
            `<i class="bi bi-x-octagon-fill me-2"></i>${escapeHtml(text)}`,
            type
        );
    }
    function clearStatus() {
        statusBox.className = "alert d-none";
        statusBox.innerHTML = "";
    }
    function toggleSalvar(loading) {
        if (!btnSalvar) return;
        btnSalvar.disabled = loading;
        btnSalvarSpin?.classList.toggle("d-none", !loading);
        btnSalvarTxt.textContent = loading ? "Salvando..." : "Salvar";
    }

    const onlyDigits = (v) => (v || "").replace(/\D/g, "");
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

    function mostrarDadosSection(cpfNumerico) {
        dadosSection.classList.remove("d-none");
        cpfInput.value = maskCPF(cpfNumerico || cpfInput.value);
        nomeInput?.focus();
    }

    // Consulta de CPF
    async function consultarPessoa() {
        const cpfNum = onlyDigits(cpfInput.value);
        if (cpfNum.length !== 11 || requestEmAndamento) return;

        requestEmAndamento = true;
        clearStatus();
        btnReload.classList.add("d-none");

        try {
            const resp = await fetch("/backend/inscricao/consultar_pessoa/", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ cpf: cpfNum }),
                credentials: "include",
            });

            const raw = await resp.text();
            let body = {};
            try {
                body = raw ? JSON.parse(raw) : {};
            } catch {
                body = {};
            }

            if (resp.status === 200) {
                const msg =
                    body?.detail ||
                    "Cadastro encontrado. Vamos seguir para o e-mail.";
                showStatusSafe(msg, "success");
                window.location.href = "email.html";
                return;
            }

            if (resp.status === 404) {
                const msg =
                    body?.detail ||
                    "Não encontramos seu cadastro. Preencha os dados abaixo.";
                showStatusSafe(msg, "info");
                mostrarDadosSection(body?.cpf || cpfNum);
                return;
            }

            // Erros diversos
            let erroMensagem = "Erro ao consultar CPF.";
            if (body && typeof body === "object") {
                const parts = [];
                for (const k in body) {
                    if (Array.isArray(body[k]))
                        parts.push(body[k].map(escapeHtml).join("<br>"));
                    else if (typeof body[k] === "string")
                        parts.push(escapeHtml(body[k]));
                }
                if (parts.length) erroMensagem = parts.join("<br>");
                else if (body.detail) erroMensagem = escapeHtml(body.detail);
            }
            showStatus(
                `<i class="bi bi-x-octagon-fill me-2"></i>${erroMensagem}`
            );
            btnReload.classList.remove("d-none");
        } catch {
            showStatus(
                `<i class="bi bi-x-octagon-fill me-2"></i>Erro ao consultar CPF.`
            );
            btnReload.classList.remove("d-none");
        } finally {
            requestEmAndamento = false;
        }
    }

    // Criação de pessoa
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (dadosSection.classList.contains("d-none")) {
            await consultarPessoa();
            return;
        }

        clearStatus();
        const cpfNum = onlyDigits(cpfInput.value);
        const nome = (nomeInput.value || "").trim();
        const email = (emailInput.value || "").trim();
        const confirmEmail = (confirmEmailInput.value || "").trim();

        if (cpfNum.length !== 11) {
            showStatus(
                `<i class="bi bi-exclamation-circle me-2"></i>CPF inválido. Digite 11 números.`,
                "warning"
            );
            cpfInput.focus();
            return;
        }
        if (!nome) {
            showStatus(
                `<i class="bi bi-exclamation-circle me-2"></i>Informe seu nome.`,
                "warning"
            );
            nomeInput.focus();
            return;
        }
        if (!email || !confirmEmail) {
            showStatus(
                `<i class="bi bi-exclamation-circle me-2"></i>Informe e confirme seu e-mail.`,
                "warning"
            );
            (email ? confirmEmailInput : emailInput).focus();
            return;
        }
        if (email !== confirmEmail) {
            showStatus(
                `<i class="bi bi-exclamation-circle me-2"></i>Os endereços de e-mail não coincidem.`,
                "warning"
            );
            confirmEmailInput.focus();
            return;
        }

        toggleSalvar(true);
        try {
            const resp = await fetch("/backend/inscricao/criar_pessoa/", {
                method: "POST",
                headers: authHeaders(),
                credentials: "include",
                body: JSON.stringify({ cpf: cpfNum, nome, email }),
            });

            const raw = await resp.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = {};
            }

            if (resp.ok && data?.detail && data?.pessoa_id) {
                showStatusSafe(data.detail, "success");
                window.location.href = "email.html";
                return;
            }

            const msg = data?.detail || "Erro ao criar cadastro.";
            showStatusSafe(msg);
        } catch {
            showStatus(
                `<i class="bi bi-x-octagon-fill me-2"></i>Erro ao criar pessoa.`
            );
        } finally {
            toggleSalvar(false);
        }
    });

    // Eventos
    cpfInput.addEventListener(
        "input",
        () => {
            cpfInput.value = maskCPF(cpfInput.value);
            if (onlyDigits(cpfInput.value).length === 11) consultarPessoa();
        },
        { passive: true }
    );

    cpfInput.addEventListener("blur", () => {
        if (onlyDigits(cpfInput.value).length === 11) consultarPessoa();
    });

    btnVoltar?.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    btnReload.addEventListener("click", () => {
        clearStatus();
        consultarPessoa();
    });

    // foco inicial
    cpfInput.focus();
});
