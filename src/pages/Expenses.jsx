import { useEffect, useState } from "react";
import { api, download, inr } from "../api";
import { useAuth } from "../auth";
import TxnDrawer from "../components/TxnDrawer";
import TxnTable from "../components/TxnTable";

export default function Expenses() {
  const { meta } = useAuth();
  const [months, setMonths] = useState([]);
  const [f, setF] = useState({ month_from: "", month_to: "", company: "", category: "", invoice_status: "", tds: "", q: "" });
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => { api("/reports/months").then(setMonths); }, []);
  useEffect(() => {
    const t = setTimeout(() => api("/transactions", { params: f }).then(setRows), 200);
    return () => clearTimeout(t);
  }, [f]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const total = rows.reduce((a, r) => a + (f.company ? r.allocations.filter((x) => x.company === f.company).reduce((b, x) => b + x.amount, 0) : r.amount), 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>All expenses</h1>
          <p className="muted">Search and slice every captured row across months. Editing is done from each statement.</p>
        </div>
        <button className="btn" onClick={() => download("/export/transactions.csv", f, "expenses.csv")}>Export CSV</button>
      </div>
      <div className="filters card pad">
        <input placeholder="Search vendor, description, notes" value={f.q} onChange={set("q")} />
        <select value={f.month_from} onChange={set("month_from")}><option value="">From month</option>{months.map((m) => <option key={m}>{m}</option>)}</select>
        <select value={f.month_to} onChange={set("month_to")}><option value="">To month</option>{months.map((m) => <option key={m}>{m}</option>)}</select>
        <select value={f.company} onChange={set("company")}><option value="">All companies</option>{meta.companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}<option value="UNASSIGNED">Unassigned</option></select>
        <select value={f.category} onChange={set("category")}><option value="">All categories</option>{meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <select value={f.invoice_status} onChange={set("invoice_status")}><option value="">Any invoice status</option><option value="missing">Invoice needed</option><option value="attached">Attached</option><option value="not_required">Not required</option></select>
        <select value={f.tds} onChange={set("tds")}><option value="">TDS: any</option><option value="applicable">TDS applicable</option><option value="pending">TDS not deposited</option></select>
      </div>
      <div className="result-line"><span className="strong">{rows.length}</span> rows · <span className="strong">{inr(total, 2)}</span>{f.company && ` allocated to ${f.company}`}</div>
      <div className="card">
        <TxnTable rows={rows} setRows={setRows} editable={false} onOpen={(r) => setOpen(r)} />
      </div>
      {open && <TxnDrawer txn={open} editable={false} onClose={() => setOpen(null)} onSaved={() => {}} />}
    </div>
  );
}
