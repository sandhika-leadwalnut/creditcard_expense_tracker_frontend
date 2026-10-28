import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const loadMeta = () => api("/meta").then(setMeta);

  useEffect(() => {
    if (!getToken()) return;
    Promise.all([api("/auth/me"), api("/meta")])
      .then(([u, m]) => { setUser(u); setMeta(m); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(res.access_token);
    setUser(res.user);
    await loadMeta();
  };
  const logout = () => { setToken(null); setUser(null); };
  const canEdit = user && ["admin", "finance"].includes(user.role);
  const isAdmin = user?.role === "admin";

  return (
    <AuthCtx.Provider value={{ user, meta, loading, login, logout, canEdit, isAdmin, reloadMeta: loadMeta }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
