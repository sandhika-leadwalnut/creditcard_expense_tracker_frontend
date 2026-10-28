import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const NAV = [
  { to: "/", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { to: "/statements", label: "Statements", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" },
  { to: "/expenses", label: "All expenses", icon: "M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" },
  { to: "/settings", label: "Settings", icon: "M19.4 13a7.6 7.6 0 000-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 00-1.7-1L15 3h-4l-.3 2.9a7.4 7.4 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 000 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.3-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <div className="brand-name">Expense Tracker</div>
            <div className="brand-sub">LeadWalnut · CodeWalnut</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={n.icon} fill="currentColor" /></svg>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{(user.name || user.email)[0].toUpperCase()}</div>
          <div className="who">
            <div className="who-name">{user.name}</div>
            <div className="who-role">{user.role}</div>
          </div>
          <button className="btn-icon" title="Sign out" onClick={() => { logout(); nav("/login"); }}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4V5z" /></svg>
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
