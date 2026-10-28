import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, fmtDate, inr } from "../api";
import { useAuth } from "../auth";
import UploadModal from "../components/UploadModal";

export default function Statements() {
  const { canEdit } = useAuth();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => { api("/statements").then(setRows); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Statements</h1>
          <p className="muted">Upload each card statement once a month, review the rows, then lock the month.</p>
        </div>
        {canEdit && <button className="btn primary" onClick={() => setOpen(true)}>+ Upload statement</button>}
      </div>

      {rows === null ? <div className="card pad">Loading…</div> : rows.length === 0 ? (
        <div className="card empty">
          <h3>No statements yet</h3>
          <p className="muted">Upload last month's card statement PDF to get started.</p>
          {canEdit && <button className="btn primary" onClick={() => setOpen(true)}>Upload statement</button>}
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Statement</th><th>Period</th><th>Card</th><th className="num">Purchases</th><th>Open items</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const open = s.checklist.unassigned_company + s.checklist.uncategorized + s.checklist.missing_invoices;
                return (
                  <tr key={s.id} className="clickable" onClick={() => nav(`/statements/${s.id}`)}>
                    <td><div className="strong">{s.bank}</div><div className="muted small">{s.file_name}</div></td>
                    <td>{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                    <td>XXXX {s.card_last4}</td>
                    <td className="num">{inr(s.purchases_total, 2)}</td>
                    <td>{open ? <span className="pill warn">{open} to fix</span> : <span className="pill ok">All clear</span>}</td>
                    <td><span className={"pill " + (s.status === "locked" ? "locked" : "info")}>{s.status === "locked" ? "Locked" : "In review"}</span></td>
                    <td><Link to={`/statements/${s.id}`} onClick={(e) => e.stopPropagation()}>Review →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && <UploadModal onClose={() => setOpen(false)} onDone={(st) => nav(`/statements/${st.id}`)} />}
    </div>
  );
}
