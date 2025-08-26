/**
 * Verifica a validade do token atual e redireciona para a página de destino se válido.
 * Tenta atualizar o token usando o refresh token se o token atual estiver expirado.
 * @param {string} destino - URL para redirecionar após verificação bem-sucedida
 * @returns {Promise<void>}
 */
async function verificarTokenERedirecionar(destino) {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!token || !refreshToken) {
        console.log("Token ou refresh token não encontrados");
        return;
    }

    try {
        // 1. Tenta verificar o token atual
        console.log("Verificando token atual...");
        let resposta = await fetch("/backend/api/token/verify/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });

        // 2. Se o token for válido, redireciona para o destino
        if (resposta.ok) {
            console.log("Token válido, redirecionando para:", destino);
            window.location.href = destino;
            return;
        }

        // 3. Se o token for inválido, tenta atualizá-lo com o refresh token
        console.log("Token inválido, tentando refresh...");
        const refreshRes = await fetch("/backend/api/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        // Se o refresh falhar, limpa os tokens e permanece na página atual
        if (!refreshRes.ok) {
            console.log("Refresh falhou, limpando tokens");
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            return;
        }

        // 4. Se o refresh for bem-sucedido, atualiza os tokens
        const refreshData = await refreshRes.json();
        localStorage.setItem("token", refreshData.access);

        // Se veio refresh novo também, atualiza
        if (refreshData.refresh) {
            localStorage.setItem("refresh_token", refreshData.refresh);
        }

        // 5. Redireciona para o destino após atualizar o token
        console.log(
            "Token atualizado com sucesso, redirecionando para:",
            destino
        );
        window.location.href = destino;
    } catch (error) {
        console.error("Erro ao verificar/atualizar token:", error);
    }
}
