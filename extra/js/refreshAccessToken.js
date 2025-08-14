async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        localStorage.setItem(
            "login_error",
            "Sessão expirada. Faça login novamente."
        );
        logout();
        return false;
    }

    try {
        const response = await fetch("/backend/api/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            localStorage.setItem(
                "login_error",
                "Sessão expirada. Faça login novamente."
            );
            logout();
            return false;
        }

        const data = await response.json();

        localStorage.setItem("token", data.access);
        if (data.refresh) {
            localStorage.setItem("refresh_token", data.refresh);
        }

        return true;
    } catch {
        localStorage.setItem(
            "login_error",
            "Sessão expirada. Faça login novamente."
        );
        logout();
        return false;
    }
}
