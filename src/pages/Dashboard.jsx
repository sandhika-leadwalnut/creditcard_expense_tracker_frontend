import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, inr, monthLabel } from "../api";
import { useAuth } from "../auth";

const CO_COLORS = { LW: "#2F5D50", CW: "#C9822B", UNASSIGNED: "#B8B4AA" };
const short = (n) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n / 1000)}k`);

export default function Dashboard() {
  const { meta } = useAuth();
  const [months, setMonths] = useState([]);
  const [f, setF] = useState({ month_from: "", month_to: "", company: "" });
  const [d, setD] = useState(null);

  useEffect(() => { api("/reports/months").then(setMonths); }, []);
  useEffect(() => { api("/reports/summary", { params: f }).then(setD); }, [f]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const catColor = (name) => meta.categories.find((c) => c.name === name)?.color || "#999";

  if (!d) return <div className="page"><div className="card pad">Loading…</div></div>;
  const empty = d.transaction_count === 0;
  const coTotal = (code) => d.by_company.find((c) => c.company === code)?.total || 0;
  const cos = [...meta.companies.map((c) => c.code), "UNASSIGNED"];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Spend by company, category and vendor over time.</p>
        </div>
        <div className="filters inline">
          <select value={f.month_from} onChange={set("month_from")}><option value="">From: all</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
          <select value={f.month_to} onChange={set("month_to")}><option value="">To: all</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
          <select value={f.company} onChange={set("company")}><option value="">LW + CW</option>{meta.companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        </div>
      </div>

      {empty ? (
        <div className="card empty">
          <h3>No expenses captured yet</h3>
          <p className="muted">Upload a statement to see the dashboard.</p>
          <Link className="btn primary" to="/statements">Go to statements</Link>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><div className="kpi-label">Total spend</div><div className="kpi-value">{inr(d.total)}</div><div className="kpi-sub">{d.transaction_count} rows</div></div>
            {meta.companies.map((c) => (
              <div className="kpi" key={c.code}><div className="kpi-label"><span className={"dot " + c.code} />{c.name}</div><div className="kpi-value">{inr(coTotal(c.code))}</div></div>
            ))}
            <div className={"kpi " + (d.invoices.missing ? "warn" : "good")}><div className="kpi-label">Invoices missing</div><div className="kpi-value">{d.invoices.missing}</div><div className="kpi-sub">{d.invoices.attached} attached</div></div>
            <div className="kpi"><div className="kpi-label">TDS pending deposit</div><div className="kpi-value">{inr(d.tds.pending)}</div><div className="kpi-sub">{d.tds.count} {d.tds.count === 1 ? "row" : "rows"} with TDS</div></div>
          </div>

          <div className="grid-2">
            <div className="card pad">
              <h3>Spend by category</h3>
              <div className="bars">
                {d.by_category.map((c) => (
                  <div className="bar-row" key={c.category}>
                    <div className="bar-label">{c.category}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, (c.total / d.by_category[0].total) * 100)}%`, background: catColor(c.category) }} /></div>
                    <div className="bar-val">{inr(c.total)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card pad">
              <h3>Monthly trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.monthly_trend.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                  <CartesianGrid vertical={false} stroke="#ECEAE4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={short} tickLine={false} axisLine={false} fontSize={12} width={56} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Legend iconType="circle" />
                  {cos.map((c) => <Bar key={c} dataKey={c} stackId="a" fill={CO_COLORS[c] || "#888"} maxBarSize={56} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-2">
            <div className="card pad">
              <h3>Top vendors</h3>
              <table className="table compact">
                <tbody>{d.top_vendors.map((v) => <tr key={v.vendor}><td>{v.vendor}</td><td className="muted">{v.count}×</td><td className="num strong">{inr(v.total)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="card pad">
              <h3>Subscriptions <span className="muted small">({inr(d.subscriptions.reduce((a, s) => a + s.total, 0))})</span></h3>
              <table className="table compact">
                <tbody>{d.subscriptions.map((v) => <tr key={v.vendor}><td>{v.vendor}</td><td className="muted">{v.count}×</td><td className="num strong">{inr(v.total)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
