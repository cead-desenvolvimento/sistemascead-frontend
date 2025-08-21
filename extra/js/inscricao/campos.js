// campos.js — montagem dinâmica dos campos + envio
document.addEventListener("DOMContentLoaded", function () {
    const formCampos = document.getElementById("form-campos");
    const checkboxesContainer = document.getElementById("checkboxes-container");
    const comboboxesContainer = document.getElementById("comboboxes-container");
    const dateboxesContainer = document.getElementById("dateboxes-container");
    const statusMessage = document.getElementById("status-message");

    // -------- helpers --------
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
    function ymd(date) {
        return date.toISOString().split("T")[0];
    }
    function slugify(txt) {
        return (txt || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }

    // -------- montagem da UI --------
    function carregarCampos() {
        fetch("/backend/inscricao/vaga_campo/", {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                checkboxesContainer.innerHTML = "";
                comboboxesContainer.innerHTML = "";
                dateboxesContainer.innerHTML = "";

                // checkboxes
                if (Array.isArray(data.checkboxes)) {
                    data.checkboxes.forEach((campo) => {
                        const div = document.createElement("div");
                        div.className = "form-check";

                        const input = document.createElement("input");
                        input.type = "checkbox";
                        input.className = "form-check-input";
                        input.id = `checkbox_${campo.id}`;
                        input.name = "checkbox_da_vaga";
                        input.value = campo.id;
                        if (campo.obrigatorio) {
                            input.checked = true;
                            input.disabled = true;
                        }

                        const label = document.createElement("label");
                        label.className = "form-check-label";
                        label.setAttribute("for", input.id);
                        const pts =
                            campo.pontuacao !== null &&
                            campo.pontuacao !== undefined
                                ? ` (Pontuação: ${campo.pontuacao})`
                                : "";
                        label.textContent = `${campo.descricao}${pts}`;

                        div.append(input, label);
                        checkboxesContainer.appendChild(div);
                    });
                }

                // comboboxes (obj: descricao -> [opcoes])
                if (data.comboboxes && typeof data.comboboxes === "object") {
                    Object.entries(data.comboboxes).forEach(
                        ([descricao, opcoes]) => {
                            const groupKey = slugify(descricao);
                            const wrap = document.createElement("div");
                            wrap.className = "mb-3";

                            const label = document.createElement("label");
                            label.className = "form-label";
                            label.textContent = descricao;

                            const select = document.createElement("select");
                            select.className = "form-select";
                            select.name = "combobox_da_vaga";
                            // id por slug da descrição (quando backend não envia id do campo)
                            select.id = `combobox_${groupKey}`;
                            select.dataset.groupKey = groupKey;

                            // placeholder
                            const placeholder =
                                document.createElement("option");
                            placeholder.value = "";
                            placeholder.disabled = true;
                            placeholder.selected = true;
                            placeholder.textContent = "Selecione…";
                            select.appendChild(placeholder);

                            (opcoes || []).forEach((opcao) => {
                                const o = document.createElement("option");
                                o.value = opcao.id;
                                const desc = (opcao.descricao || "").trim();
                                const pts = opcao.pontuacao ?? null;
                                o.textContent =
                                    pts === null || pts === undefined
                                        ? desc
                                        : `${desc} - ${pts} ponto${
                                              pts === 1 ? "" : "s"
                                          }`;
                                select.appendChild(o);
                            });

                            wrap.append(label, select);
                            comboboxesContainer.appendChild(wrap);
                        }
                    );
                }

                // dateboxes (array de campos)
                if (Array.isArray(data.dateboxes)) {
                    data.dateboxes.forEach((campo) => {
                        const group = document.createElement("div");
                        group.className = "mb-3";
                        group.id = `datebox-group-${campo.id}`;

                        const label = document.createElement("label");
                        label.className = "form-label";
                        label.textContent = `${campo.descricao} (Máx: ${campo.pontuacao_maxima} pontos)`;

                        const container = document.createElement("div");
                        container.id = `datebox-container-${campo.id}`;

                        const btnAdd = document.createElement("button");
                        btnAdd.type = "button";
                        btnAdd.className = "btn btn-secondary btn-sm mt-1";
                        btnAdd.innerHTML =
                            '<i class="bi bi-calendar-plus me-2"></i> Adicionar período';
                        btnAdd.addEventListener("click", () =>
                            adicionarPeriodo(campo.id)
                        );

                        group.append(label, container, btnAdd);
                        dateboxesContainer.appendChild(group);
                    });
                }

                carregarCamposPessoa();
            })
            .catch(() =>
                setStatus("Erro ao carregar campos da vaga.", "danger")
            );
    }

    function carregarCamposPessoa() {
        fetch("/backend/inscricao/pessoa_vaga_campo/", {
            method: "GET",
            headers: authHeaders(),
            credentials: "include",
        })
            .then((r) => r.json())
            .then((data) => {
                // marca checkboxes
                (data.checkboxes || []).forEach((campo) => {
                    const el = document.getElementById(
                        `checkbox_${campo.ed_vaga_campo_checkbox_id}`
                    );
                    if (el) el.checked = true;
                });

                // preenche comboboxes
                // 1) tenta por id "combobox_<id do campo>"
                // 2) fallback: encontra o select cujo options contenham o valor informado
                const selects = Array.from(
                    comboboxesContainer.querySelectorAll(
                        "select[name='combobox_da_vaga']"
                    )
                );
                const alreadySet = new Set();
                (data.comboboxes || []).forEach((campo) => {
                    let sel =
                        document.getElementById(
                            `combobox_${campo.ed_vaga_campo_combobox_id}`
                        ) || null;

                    if (!sel) {
                        sel = selects.find((s) =>
                            Array.from(s.options).some(
                                (o) => String(o.value) === String(campo.valor)
                            )
                        );
                    }

                    if (sel && !alreadySet.has(sel)) {
                        sel.value = String(campo.valor);
                        alreadySet.add(sel);
                    }
                });

                // preenche dateboxes (pode ter múltiplos períodos)
                (data.dateboxes || []).forEach((campo) => {
                    (campo.periodos || []).forEach((periodo) => {
                        adicionarPeriodo(
                            campo.ed_vaga_campo_datebox_id,
                            periodo.inicio,
                            periodo.fim
                        );
                    });
                });
            })
            .catch(() =>
                setStatus("Erro ao carregar dados do candidato.", "danger")
            );
    }

    // -------- datebox handlers --------
    window.adicionarPeriodo = function (id, inicio = "", fim = "") {
        const container = document.getElementById(`datebox-container-${id}`);
        if (!container) return;

        const row = document.createElement("div");
        row.className = "d-flex gap-2 mb-2 align-items-start";

        const inputInicio = document.createElement("input");
        inputInicio.type = "date";
        inputInicio.className = "form-control";
        inputInicio.name = `date_inicio_${id}`;
        inputInicio.value = inicio || "";
        inputInicio.max = ymd(new Date());

        const inputFim = document.createElement("input");
        inputFim.type = "date";
        inputFim.className = "form-control";
        inputFim.name = `date_fim_${id}`;
        inputFim.value = fim || "";
        inputFim.max = ymd(new Date());
        if (inputInicio.value) inputFim.min = inputInicio.value;

        inputInicio.addEventListener("change", () => {
            inputFim.min = inputInicio.value || "";
            if (
                inputFim.value &&
                inputInicio.value &&
                inputFim.value < inputInicio.value
            ) {
                inputFim.value = "";
            }
        });
        inputFim.addEventListener("change", () => {
            if (
                inputFim.value &&
                inputInicio.value &&
                inputFim.value < inputInicio.value
            ) {
                setStatus(
                    "A data final não pode ser anterior à data inicial.",
                    "warning"
                );
                inputFim.focus();
            } else {
                setStatus("");
            }
        });

        const btnRem = document.createElement("button");
        btnRem.type = "button";
        btnRem.className = "btn btn-danger btn-sm";
        btnRem.innerHTML = '<i class="bi bi-calendar-x me-2"></i> Remover';
        btnRem.addEventListener("click", () => row.remove());

        row.append(inputInicio, inputFim, btnRem);
        container.appendChild(row);
    };

    // -------- submit --------
    formCampos.addEventListener("submit", function (event) {
        event.preventDefault();
        setStatus("");

        // checkboxes selecionados
        const checkboxValues = Array.from(
            checkboxesContainer.querySelectorAll(
                "input[type='checkbox']:checked"
            )
        ).map((c) => parseInt(c.value, 10));

        // comboboxes (valor selecionado)
        const comboboxValues = Array.from(
            comboboxesContainer.querySelectorAll(
                "select[name='combobox_da_vaga']"
            )
        )
            .map((s) => parseInt(s.value || "0", 10))
            .filter((v) => !Number.isNaN(v) && v > 0);

        // dateboxes => suporta 1..N períodos por campo
        const dateboxPayload = {};
        const today = ymd(new Date());
        const containers = dateboxesContainer.querySelectorAll(
            "div[id^='datebox-container-']"
        );
        for (const cont of containers) {
            const id = cont.id.split("-").pop();
            const inputs = Array.from(
                cont.querySelectorAll("input[type='date']")
            );
            if (inputs.length === 0) continue;

            // agrupa aos pares (inicio,fim)
            const periods = [];
            for (let i = 0; i < inputs.length; i += 2) {
                const ini = inputs[i]?.value || "";
                const fim = inputs[i + 1]?.value || "";
                if (!ini) {
                    return setStatus(
                        "Preencha todas as datas de início.",
                        "warning"
                    );
                }
                if (!fim) {
                    return setStatus(
                        "Preencha todas as datas de fim.",
                        "warning"
                    );
                }
                if (fim < ini) {
                    return setStatus(
                        "A data final não pode ser anterior à data inicial.",
                        "warning"
                    );
                }
                if (ini > today || fim > today) {
                    return setStatus("Datas não podem ser futuras.", "warning");
                }
                periods.push({ inicio: ini, fim: fim });
            }
            if (periods.length > 0) {
                dateboxPayload[id] = periods;
            }
        }

        const payload = {
            checkbox_da_vaga: checkboxValues,
            combobox_da_vaga: comboboxValues,
            datebox_da_vaga: dateboxPayload,
        };

        fetch("/backend/inscricao/pessoa_vaga_campo/", {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify(payload),
        })
            .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })))
            .then(({ ok, body }) => {
                if (!ok) {
                    const msg = body?.detail || "Erro ao salvar os campos.";
                    setStatus(msg, "danger");
                    return;
                }
                window.location.href = "anexos.html";
            })
            .catch(() => setStatus("Erro ao salvar os campos.", "danger"));
    });

    // init
    carregarCampos();
});
