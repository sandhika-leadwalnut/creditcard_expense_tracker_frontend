import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Settings() {
  const tabs = ["Cards", "Vendor rules", "Categories", "TDS sections", "Companies"];
  const [tab, setTab] = useState(tabs[0]);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Settings</h1><p className="muted">Master data that drives auto-tagging and rules. Add companies, categories or TDS sections here without code changes.</p></div></div>
      <div className="tabs mb">{tabs.map((t) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Vendor rules" && <Rules />}
      {tab === "Categories" && <Categories />}
      {tab === "TDS sections" && <Tds />}
      {tab === "Companies" && <Companies />}
      {tab === "Cards" && <Cards />}
    </div>
  );
}

function useErr() {
  const [err, setErr] = useState("");
  const run = async (fn) => { setErr(""); try { await fn(); } catch (e) { setErr(e.message); } };
  return [err, run];
}

function Rules() {
  const { meta, canEdit } = useAuth();
  const [rows, setRows] = useState([]);
  const blank = { pattern: "", vendor: "", category: "Subscriptions", is_subscription: true, company: "", tds_section: "" };
  const [n, setN] = useState(blank);
  const [err, run] = useErr();
  const load = () => api("/vendor-rules").then(setRows);
  useEffect(() => { load(); }, []);
  const add = () => run(async () => {
    if (!n.pattern || !n.vendor) throw new Error("Pattern and vendor are required");
    await api("/vendor-rules", { method: "POST", body: { ...n, company: n.company || null, tds_section: n.tds_section || null } });
    setN(blank); load();
  });
  return (
    <div className="card">
      <p className="muted pad small">When a statement line contains the <b>pattern</b>, the row is tagged with this vendor, category and (optionally) company and TDS section. Rules saved from the review screen show as "learned".</p>
      {canEdit && (
        <div className="form-row pad">
          <input placeholder="Pattern e.g. HUBSPOT" value={n.pattern} onChange={(e) => setN({ ...n, pattern: e.target.value })} />
          <input placeholder="Vendor name" value={n.vendor} onChange={(e) => setN({ ...n, vendor: e.target.value })} />
          <select value={n.category} onChange={(e) => setN({ ...n, category: e.target.value, is_subscription: !!meta.categories.find((c) => c.name === e.target.value)?.subscription })}>{meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          <select value={n.company} onChange={(e) => setN({ ...n, company: e.target.value })}><option value="">Company: ask</option>{meta.companies.map((c) => <option key={c.code}>{c.code}</option>)}</select>
          <select value={n.tds_section} onChange={(e) => setN({ ...n, tds_section: e.target.value })}><option value="">No TDS</option>{meta.tds_sections.map((s) => <option key={s.code}>{s.code}</option>)}</select>
          <button className="btn primary" onClick={add}>Add rule</button>
        </div>
      )}
      {err && <div className="form-error mx">{err}</div>}
      <table className="table">
        <thead><tr><th>Pattern</th><th>Vendor</th><th>Category</th><th>Company</th><th>TDS</th><th>Source</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><code>{r.pattern}</code></td><td>{r.vendor}</td><td>{r.category}{r.is_subscription && <span className="tag">Sub</span>}</td>
            <td>{r.company || <span className="muted">ask</span>}</td><td>{r.tds_section || "–"}</td><td><span className="tag">{r.source}</span></td>
            <td>{canEdit && <button className="link danger small" onClick={() => run(async () => { await api(`/vendor-rules/${r.id}`, { method: "DELETE" }); load(); })}>Delete</button>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Categories() {
  const { meta, isAdmin, reloadMeta } = useAuth();
  const [n, setN] = useState({ name: "", invoice_always: false, subscription: false, color: "#6B7280" });
  const [err, run] = useErr();
  const save = (body) => run(async () => { if (!body.name) throw new Error("Name is required"); await api("/categories", { method: "POST", body }); await reloadMeta(); });
  return (
    <div className="card">
      {isAdmin && (
        <div className="form-row pad">
          <input placeholder="New category" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <label className="check"><input type="checkbox" checked={n.invoice_always} onChange={(e) => setN({ ...n, invoice_always: e.target.checked })} />Invoice always required</label>
          <label className="check"><input type="checkbox" checked={n.subscription} onChange={(e) => setN({ ...n, subscription: e.target.checked })} />Subscription</label>
          <input type="color" value={n.color} onChange={(e) => setN({ ...n, color: e.target.value })} />
          <button className="btn primary" onClick={() => save(n).then(() => setN({ ...n, name: "" }))}>Add</button>
        </div>
      )}
      {err && <div className="form-error mx">{err}</div>}
      <table className="table">
        <thead><tr><th>Category</th><th>Invoice always required</th><th>Subscription by default</th></tr></thead>
        <tbody>{meta.categories.map((c) => (
          <tr key={c.name}>
            <td><span className="swatch" style={{ background: c.color }} />{c.name}</td>
            <td><input type="checkbox" disabled={!isAdmin} checked={c.invoice_always} onChange={(e) => save({ ...c, invoice_always: e.target.checked })} /></td>
            <td><input type="checkbox" disabled={!isAdmin} checked={c.subscription} onChange={(e) => save({ ...c, subscription: e.target.checked })} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Tds() {
  const { meta, isAdmin, reloadMeta } = useAuth();
  const [n, setN] = useState({ code: "", name: "", rate: "" });
  const [err, run] = useErr();
  const add = () => run(async () => {
    if (!n.code || !n.name || n.rate === "") throw new Error("Code, name and rate are required");
    await api("/tds-sections", { method: "POST", body: { ...n, rate: Number(n.rate) } });
    setN({ code: "", name: "", rate: "" }); await reloadMeta();
  });
  return (
    <div className="card">
      <p className="muted pad small">Default rates are placeholders. Confirm sections and rates with your CA; you can override the rate on each row.</p>
      {isAdmin && <div className="form-row pad"><input placeholder="Section e.g. 194Q" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} /><input placeholder="Description" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /><input type="number" placeholder="Rate %" value={n.rate} onChange={(e) => setN({ ...n, rate: e.target.value })} /><button className="btn primary" onClick={add}>Add / update</button></div>}
      {err && <div className="form-error mx">{err}</div>}
      <table className="table"><thead><tr><th>Section</th><th>Description</th><th className="num">Default rate</th></tr></thead>
        <tbody>{meta.tds_sections.map((s) => <tr key={s.code}><td className="strong">{s.code}</td><td>{s.name}</td><td className="num">{s.rate}%</td></tr>)}</tbody></table>
    </div>
  );
}

function Cards() {
  const { meta, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const blank = { card_last4: "", holder_name: "", company: meta.companies[0]?.code || "LW", bank: "Kotak Mahindra Bank" };
  const [n, setN] = useState(blank);
  const [err, run] = useErr();
  const load = () => api("/cards").then(setRows);
  useEffect(() => { load(); }, []);
  const save = (body) => run(async () => {
    if (!/^\d{4}$/.test(body.card_last4)) throw new Error("Enter the last 4 digits of the card");
    if (!body.holder_name.trim()) throw new Error("Enter the cardholder name");
    await api("/cards", { method: "POST", body });
    setN(blank); load();
  });
  const coName = (code) => meta.companies.find((c) => c.code === code)?.name || code;
  return (
    <div className="card">
      <p className="muted pad small">When a statement for one of these cards is uploaded, every transaction is set to the card's company automatically. A vendor rule with its own company still wins, and you can change any transaction afterwards.</p>
      {isAdmin && (
        <div className="form-row pad">
          <input placeholder="Last 4 digits e.g. 7170" maxLength={4} value={n.card_last4} onChange={(e) => setN({ ...n, card_last4: e.target.value.replace(/\D/g, "") })} />
          <input placeholder="Cardholder name" value={n.holder_name} onChange={(e) => setN({ ...n, holder_name: e.target.value })} />
          <select value={n.company} onChange={(e) => setN({ ...n, company: e.target.value })}>{meta.companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          <input placeholder="Bank" value={n.bank} onChange={(e) => setN({ ...n, bank: e.target.value })} />
          <button className="btn primary" onClick={() => save(n)}>Add card</button>
        </div>
      )}
      {err && <div className="form-error mx">{err}</div>}
      <table className="table">
        <thead><tr><th>Card</th><th>Cardholder</th><th>Bank</th><th>Default company</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="strong">XXXX {c.card_last4}</td>
              <td>{c.holder_name}</td>
              <td>{c.bank || "–"}</td>
              <td>
                {isAdmin ? (
                  <select value={c.company} onChange={(e) => save({ card_last4: c.card_last4, holder_name: c.holder_name, bank: c.bank, company: e.target.value })}>
                    {meta.companies.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                  </select>
                ) : <><span className={"dot " + c.company} />{coName(c.company)}</>}
              </td>
              <td>{isAdmin && <button className="link danger small" onClick={() => run(async () => { await api(`/cards/${c.id}`, { method: "DELETE" }); load(); })}>Remove</button>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted center pad">No cards yet. Add a card so its statements are assigned to the right company automatically.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Companies() {
  const { meta, isAdmin, reloadMeta } = useAuth();
  const [n, setN] = useState({ code: "", name: "" });
  const [err, run] = useErr();
  const add = () => run(async () => { if (!n.code || !n.name) throw new Error("Code and name are required"); await api("/companies", { method: "POST", body: n }); setN({ code: "", name: "" }); await reloadMeta(); });
  return (
    <div className="card">
      {isAdmin && <div className="form-row pad"><input placeholder="Code e.g. NP" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} /><input placeholder="Name e.g. Network Poppins" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /><button className="btn primary" onClick={add}>Add company</button></div>}
      {err && <div className="form-error mx">{err}</div>}
      <table className="table"><thead><tr><th>Code</th><th>Name</th></tr></thead><tbody>{meta.companies.map((c) => <tr key={c.code}><td><span className={"dot " + c.code} />{c.code}</td><td>{c.name}</td></tr>)}</tbody></table>
    </div>
  );
}
