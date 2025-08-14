async function fetchComToken(url, options = {}, retry = true) {
    let token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401 && retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return await fetchComToken(url, options, false);
        } else {
            window.location.href = "/";
        }
    }

    if (response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.setItem(
            "login-error",
            "Erro 403. Entre em contato com o suporte tecnológico do CEAD: suporte.cead@ufjf.br"
        );
        window.location.href = "/";
        return;
    }

    return response;
}
