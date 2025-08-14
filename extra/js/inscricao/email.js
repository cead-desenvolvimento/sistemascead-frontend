// email.js — envio/reenvio/verificação do código + navegação
(() => {
    // Atalhos
    const $ = (s) => document.querySelector(s);
    const statusBox = $("#status");
    const subtitulo = $("#subtitulo");
    const etapaInicial = $("#etapa-inicial");
    const etapaCodigo = $("#etapa-codigo");
    const mensagemEmail = $("#mensagem-email");

    const btnEnviar = $("#btn-enviar");
    const btnEnviarSpin = btnEnviar.querySelector(".spinner-border");
    const btnEnviarTxt = $("#btn-enviar-texto");
    const btnVoltar = $("#btn-voltar");

    const btnVerificar = $("#btn-verificar");
    const btnVerificarSpin = btnVerificar.querySelector(".spinner-border");
    const btnVerificarTxt = $("#btn-verificar-texto");

    const btnReenviar = $("#btn-reenviar");
    const btnReenviarTxt = $("#btn-reenviar-texto");

    const inputCodigo = $("#codigo");

    // Helpers UI
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
    function toggleBtn(btn, spinEl, txtEl, loading, labelWhenIdle) {
        btn.disabled = loading;
        if (spinEl) spinEl.classList.toggle("d-none", !loading);
        if (txtEl) txtEl.textContent = loading ? "Enviando..." : labelWhenIdle;
    }

    // Etapas
    function irParaEtapaCodigo() {
        etapaInicial.classList.add("d-none");
        etapaCodigo.style.display = "block";
        inputCodigo.focus();
    }

    function iniciarCooldownReenvio(segundos = 30) {
        btnReenviar.disabled = true;
        let rest = segundos;
        const base = "Reenviar código";
        btnReenviarTxt.textContent = `${base} (${rest}s)`;
        const timer = setInterval(() => {
            rest -= 1;
            btnReenviarTxt.textContent = `${base} (${rest}s)`;
            if (rest <= 0) {
                clearInterval(timer);
                btnReenviar.disabled = false;
                btnReenviarTxt.textContent = base;
            }
        }, 1000);
    }

    // Navegação pós-verificação
    async function verificarCotasENavegar() {
        try {
            const res = await fetch("/backend/inscricao/cota/", {
                method: "GET",
                credentials: "include",
            });
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            const tem =
                Array.isArray(data?.cotas_disponiveis) &&
                data.cotas_disponiveis.length > 0;
            window.location.href = tem ? "cota.html" : "formacao.html";
        } catch {
            showStatus("Erro ao verificar cotas.", "danger");
        }
    }

    // Sanitização do código (A-Z/0-9, 5 chars)
    function sanitizeCode(v) {
        return (v || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 5);
    }

    // Inicialização: pega nome/email e mostra instruções
    (async function init() {
        clearStatus();
        subtitulo.textContent =
            "Confirme seu endereço de e-mail para continuar";
        try {
            const res = await fetch("/backend/inscricao/enviar_codigo_email/", {
                method: "GET",
                credentials: "include",
            });
            const raw = await res.text();
            if (!res.ok)
                throw new Error("Erro ao obter informações do candidato.");
            const data = raw ? JSON.parse(raw) : {};
            const nome = data?.nome || "Candidato";
            const email = data?.email || "(e-mail não informado)";
            mensagemEmail.innerHTML = `<strong>${nome}</strong>, enviaremos um código para <strong>${email}</strong> para confirmar seu e-mail.`;
            etapaInicial.classList.remove("d-none");
        } catch (e) {
            showStatus(
                e.message || "Erro ao obter informações do candidato.",
                "danger"
            );
        }
    })();

    // Enviar código
    btnEnviar.addEventListener("click", async () => {
        clearStatus();
        toggleBtn(
            btnEnviar,
            btnEnviarSpin,
            btnEnviarTxt,
            true,
            "Enviar código"
        );
        try {
            const res = await fetch("/backend/inscricao/enviar_codigo_email/", {
                method: "POST",
                credentials: "include",
            });
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok)
                throw new Error(data?.detail || "Erro ao enviar o código.");

            showStatus(
                data?.detail || "Código enviado com sucesso.",
                "success"
            );
            irParaEtapaCodigo();
            iniciarCooldownReenvio(30);
        } catch (e) {
            showStatus(e.message || "Erro ao enviar o código.", "danger");
        } finally {
            toggleBtn(
                btnEnviar,
                btnEnviarSpin,
                btnEnviarTxt,
                false,
                "Enviar código"
            );
        }
    });

    // Reenviar código (com cooldown)
    btnReenviar.addEventListener("click", async () => {
        clearStatus();
        btnReenviar.disabled = true;
        btnReenviarTxt.textContent = "Reenviando...";
        try {
            const res = await fetch("/backend/inscricao/enviar_codigo_email/", {
                method: "POST",
                credentials: "include",
            });
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok)
                throw new Error(data?.detail || "Erro ao reenviar o código.");

            showStatus(
                data?.detail || "Código reenviado com sucesso.",
                "success"
            );
            iniciarCooldownReenvio(30);
        } catch (e) {
            showStatus(e.message || "Erro ao reenviar o código.", "danger");
            btnReenviar.disabled = false;
            btnReenviarTxt.textContent = "Reenviar código";
        }
    });

    // Verificar código
    btnVerificar.addEventListener("click", async () => {
        clearStatus();
        const codigo = sanitizeCode(inputCodigo.value);
        if (codigo.length !== 5) {
            showStatus(
                "Código inválido. Digite os 5 caracteres recebidos.",
                "warning"
            );
            inputCodigo.focus();
            return;
        }

        toggleBtn(
            btnVerificar,
            btnVerificarSpin,
            btnVerificarTxt,
            true,
            "Verificar código"
        );
        try {
            const res = await fetch(
                "/backend/inscricao/verificar_codigo_email/",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ codigo }),
                }
            );
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok) throw new Error(data?.detail || "Código inválido.");

            showStatus(
                data?.detail || "E-mail verificado com sucesso.",
                "success"
            );
            await verificarCotasENavegar();
        } catch (e) {
            showStatus(e.message || "Erro ao verificar o código.", "danger");
        } finally {
            toggleBtn(
                btnVerificar,
                btnVerificarSpin,
                btnVerificarTxt,
                false,
                "Verificar código"
            );
        }
    });

    // UX: paste/teclado para o input de código
    inputCodigo.addEventListener(
        "input",
        () => {
            const cur = inputCodigo.selectionStart;
            inputCodigo.value = sanitizeCode(inputCodigo.value);
            inputCodigo.setSelectionRange(
                Math.min(cur, inputCodigo.value.length),
                Math.min(cur, inputCodigo.value.length)
            );
        },
        { passive: true }
    );

    inputCodigo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") btnVerificar.click();
    });

    // Voltar
    btnVoltar.addEventListener("click", () => {
        window.location.href = "pessoa.html";
    });
})();
