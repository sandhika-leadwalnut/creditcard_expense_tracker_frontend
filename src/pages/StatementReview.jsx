import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, download, fmtDate, inr } from "../api";
import { useAuth } from "../auth";
import TxnDrawer from "../components/TxnDrawer";
import TxnTable from "../components/TxnTable";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "company", label: "Needs company", test: (r) => !r.company },
  { key: "invoice", label: "Invoice needed", test: (r) => r.invoice_status === "missing" },
  { key: "uncat", label: "Uncategorized", test: (r) => r.category === "Uncategorized" },
  { key: "tds", label: "TDS", test: (r) => r.tds?.applicable },
];

export default function StatementReview() {
  const { id } = useParams();
  const { canEdit, isAdmin, meta } = useAuth();
  const nav = useNavigate();
  const [st, setSt] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [lockState, setLockState] = useState(null);
  const [msg, setMsg] = useState("");

  const loadSt = useCallback(() => api(`/statements/${id}`).then(setSt), [id]);
  const loadRows = useCallback(() => api("/transactions", { params: { statement_id: id } }).then(setRows), [id]);
  useEffect(() => { loadSt(); loadRows(); }, [loadSt, loadRows]);

  const locked = st?.status === "locked";
  const editable = canEdit && !locked;
  const shown = useMemo(() => rows.filter(FILTERS.find((f) => f.key === filter).test), [rows, filter]);
  const totals = useMemo(() => {
    const t = {};
    rows.forEach((r) => r.allocations.forEach((a) => (t[a.company] = (t[a.company] || 0) + a.amount)));
    return t;
  }, [rows]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])), [rows]);

  const bulk = async (body) => {
    const res = await api("/transactions/bulk", { method: "POST", body: { ids: [...selected], ...body } });
    setMsg(`Updated ${res.updated} rows`);
    setSelected(new Set());
    await Promise.all([loadRows(), loadSt()]);
    setTimeout(() => setMsg(""), 2500);
  };

  const tryLock = async (override_reason) => {
    try {
      await api(`/statements/${id}/lock`, { method: "POST", body: { override_reason } });
      setLockState(null);
      loadSt();
    } catch (e) {
      setLockState({ checklist: e.detail?.checklist || st.checklist, error: e.status === 409 ? "" : e.message });
    }
  };

  const unlock = async () => { await api(`/statements/${id}/unlock`, { method: "POST" }); loadSt(); };
  const remove = async () => {
    if (!window.confirm("Delete this statement and all its rows and attachments?")) return;
    await api(`/statements/${id}`, { method: "DELETE" });
    nav("/statements");
  };

  if (!st) return <div className="page"><div className="card pad">Loading…</div></div>;
  const rec = st.reconciliation;

  return (
    <div className="page">
      <div className="crumbs"><Link to="/statements">Statements</Link> / {fmtDate(st.period_start)} – {fmtDate(st.period_end)}</div>
      <div className="page-head">
        <div>
          <h1>{st.bank} <span className="muted">· XXXX {st.card_last4}</span></h1>
          <p className="muted">{st.card_type} · statement dated {fmtDate(st.statement_date)} · uploaded by {st.uploaded_by}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => download(`/statements/${id}/file`, null, st.file_name)}>Statement PDF</button>
          <button className="btn" onClick={() => download("/export/transactions.csv", { statement_id: id }, "expenses.csv")}>Export CSV</button>
          {locked ? (
            <>
              <span className="pill locked big">Locked by {st.locked_by}</span>
              {isAdmin && <button className="btn" onClick={unlock}>Unlock</button>}
            </>
          ) : canEdit && <button className="btn primary" onClick={() => tryLock()}>Lock month</button>}
        </div>
      </div>

      <div className="kpis">
        <div className={"kpi " + (rec.ok ? "good" : "bad")}>
          <div className="kpi-label">Reconciliation</div>
          <div className="kpi-value">{rec.ok ? "Matches statement" : `Off by ${inr(rec.difference, 2)}`}</div>
          <div className="kpi-sub">Captured {inr(rec.captured_total, 2)} of {inr(rec.statement_total, 2)}</div>
        </div>
        {meta.companies.map((c) => (
          <div className="kpi" key={c.code}>
            <div className="kpi-label"><span className={"dot " + c.code} />{c.name}</div>
            <div className="kpi-value">{inr(totals[c.code] || 0)}</div>
          </div>
        ))}
        <div className="kpi">
          <div className="kpi-label">Not yet assigned</div>
          <div className="kpi-value">{inr(totals.UNASSIGNED || 0)}</div>
          <div className="kpi-sub">{st.checklist.unassigned_company} rows</div>
        </div>
        <div className={"kpi " + (st.checklist.missing_invoices ? "warn" : "good")}>
          <div className="kpi-label">Invoices pending</div>
          <div className="kpi-value">{st.checklist.missing_invoices}</div>
          <div className="kpi-sub">Rule: vendor payments + non-subscriptions above {inr(meta.invoice_threshold)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f.key} className={"tab" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
              {f.label} <span className="count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        {msg && <span className="toast">{msg}</span>}
      </div>

      {editable && selected.size > 0 && (
        <div className="bulkbar">
          <span className="strong">{selected.size} selected</span>
          <span className="muted">Set company:</span>
          {meta.companies.map((c) => <button key={c.code} className="btn small" onClick={() => bulk({ company: c.code })}>{c.code}</button>)}
          <span className="muted">Category:</span>
          <select defaultValue="" onChange={(e) => e.target.value && bulk({ category: e.target.value })}>
            <option value="">Choose…</option>
            {meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
          <button className="link" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="card">
        <TxnTable
          rows={shown}
          setRows={setRows}
          editable={editable}
          selected={selected}
          setSelected={editable ? setSelected : null}
          onOpen={(r, focus) => setOpen({ r, focus })}
          onChanged={loadSt}
        />
      </div>

      {isAdmin && !locked && <div className="danger-zone"><button className="link danger" onClick={remove}>Delete this statement</button></div>}

      {open && (
        <TxnDrawer
          txn={open.r}
          focus={open.focus}
          editable={editable}
          onClose={() => setOpen(null)}
          onSaved={(u, learned, stay) => {
            if (learned) loadRows(); else setRows((rs) => rs.map((r) => (r.id === u.id ? u : r)));
            loadSt();
            if (!stay) setOpen(null);
          }}
        />
      )}

      {lockState && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setLockState(null)}>
          <LockModal checklist={lockState.checklist} isAdmin={isAdmin} onCancel={() => setLockState(null)} onOverride={tryLock} />
        </div>
      )}
    </div>
  );
}

function LockModal({ checklist, isAdmin, onCancel, onOverride }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const items = [
    ["unassigned_company", "rows without LW / CW"],
    ["uncategorized", "uncategorized rows"],
    ["missing_invoices", "invoices still missing"],
    ["tds_not_deposited", "TDS not yet deposited (not blocking)"],
  ];
  return (
    <div className="modal">
      <div className="modal-head"><h3>Month is not ready to lock</h3></div>
      <ul className="checklist">
        {items.map(([k, label]) => (
          <li key={k} className={checklist[k] ? "bad" : "good"}>
            <span>{checklist[k] ? "✕" : "✓"}</span> {checklist[k]} {label}
          </li>
        ))}
      </ul>
      {isAdmin ? (
        <label>Lock anyway: reason (saved in the audit log)
          <textarea rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} />
        </label>
      ) : <p className="muted">Fix the items above, or ask an admin to lock with a reason.</p>}
      {err && <div className="form-error">{err}</div>}
      <div className="modal-foot">
        <button className="btn" onClick={onCancel}>Back to review</button>
        {isAdmin && <button className="btn danger" onClick={() => (reason.trim() ? onOverride(reason.trim()) : setErr("Enter a reason"))}>Lock anyway</button>}
      </div>
    </div>
  );
}
