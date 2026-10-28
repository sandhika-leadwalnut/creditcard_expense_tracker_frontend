import { useRef, useState } from "react";
import { api, fmtDate, inr } from "../api";
import { useAuth } from "../auth";

export const INVOICE_LABEL = { missing: "Invoice needed", attached: "Attached", not_required: "Not required" };

export function CompanyPicker({ value, onChange, disabled, companies }) {
  return (
    <div className="seg" role="group" aria-label="Company">
      {companies.map((c) => (
        <button key={c.code} type="button" disabled={disabled} className={value === c.code ? "on " + c.code : ""} onClick={() => onChange(value === c.code ? null : c.code)} title={value === c.code ? "Click again to clear" : c.name}>
          {c.code}
        </button>
      ))}
      <button type="button" disabled={disabled} className={value === "SPLIT" ? "on SPLIT" : ""} onClick={() => onChange(value === "SPLIT" ? null : "SPLIT")} title={value === "SPLIT" ? "Click again to clear" : "Split between companies"}>Split</button>
    </div>
  );
}

// Inline TDS entry: click "+ TDS" (or the existing amount) to type an amount by hand.
function TdsCell({ row, editable, sections, onSave }) {
  const t = row.tds || {};
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [sec, setSec] = useState("");
  const [err, setErr] = useState("");

  const start = () => {
    setAmt(t.applicable ? String(t.amount ?? "") : "");
    setSec(t.section || "");
    setErr("");
    setOpen(true);
  };
  const save = () => {
    const hasAmt = amt.trim() !== "";
    if (hasAmt && (isNaN(Number(amt)) || Number(amt) < 0)) return setErr("Enter a valid amount");
    if (!hasAmt && !sec) return setErr("Enter amount or pick section");
    onSave({
      applicable: true,
      section: sec || null,
      manual_amount: hasAmt ? Number(amt) : null,
      deposited: !!t.deposited,
      challan_no: t.challan_no || null,
      deposit_date: t.deposit_date || null,
    });
    setOpen(false);
  };
  const remove = () => { onSave({ applicable: false }); setOpen(false); };

  if (open) {
    return (
      <div className="tds-edit" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}>
        <div className="tds-edit-row">
          <span className="rupee">₹</span>
          <input type="number" min="0" step="0.01" autoFocus placeholder="TDS amount" value={amt} onChange={(e) => { setAmt(e.target.value); setErr(""); }} />
        </div>
        <select value={sec} onChange={(e) => { setSec(e.target.value); setErr(""); }}>
          <option value="">Section (optional)</option>
          {sections.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.rate}%</option>)}
        </select>
        {err && <div className="error-text small">{err}</div>}
        <div className="tds-edit-actions">
          <button className="btn small primary" onClick={save}>Save</button>
          <button className="btn small" onClick={() => setOpen(false)}>Cancel</button>
          {t.applicable && <button className="link danger small" onClick={remove}>Remove</button>}
        </div>
        {/* <div className="muted small">Leave amount empty to calculate from the section rate</div> */}
      </div>
    );
  }
  if (t.applicable) {
    const label = `${t.section ? t.section + " · " : ""}${inr(t.amount)}`;
    const title = t.is_manual ? "Entered manually" : `${t.section} @ ${t.rate}%`;
    return editable
      ? <button className={"pill pill-btn " + (t.deposited ? "ok" : "warn")} title={title + " · click to edit"} onClick={start}>{label}</button>
      : <span className={"pill " + (t.deposited ? "ok" : "warn")} title={title}>{label}</span>;
  }
  return editable ? <button className="link small" onClick={start}>+ TDS</button> : <span className="muted small">–</span>;
}

export default function TxnTable({ rows, setRows, editable, selected, setSelected, onOpen, onChanged }) {
  const { meta } = useAuth();
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const fileInput = useRef();
  const attachFor = useRef(null);

  const patch = async (row, body) => {
    setBusyId(row.id);
    setErr("");
    try {
      const updated = await api(`/transactions/${row.id}`, { method: "PATCH", body });
      setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const setCompany = (row, code) => {
    if (code === "SPLIT") return onOpen(row, "split");
    patch(row, { company: code || "" });   // null → clear the company
  };

  const quickAttach = (row) => {
    attachFor.current = row;
    fileInput.current.value = "";
    fileInput.current.click();
  };

  const uploadFile = async (file) => {
    const row = attachFor.current;
    if (!file || !row) return;
    setBusyId(row.id);
    const form = new FormData();
    form.append("file", file);
    form.append("doc_type", "invoice");
    try {
      const res = await api(`/transactions/${row.id}/attachments`, { method: "POST", form });
      setRows((rs) => rs.map((r) => (r.id === row.id ? res.transaction : r)));
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const allSel = rows.length > 0 && rows.every((r) => selected?.has(r.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      {err && <div className="form-error mb">{err}</div>}
      <input ref={fileInput} type="file" hidden onChange={(e) => uploadFile(e.target.files[0])} />
      <div className="table-wrap">
        <table className="table txn">
          <thead>
            <tr>
              {setSelected && <th className="cb"><input type="checkbox" checked={allSel} onChange={toggleAll} aria-label="Select all" /></th>}
              <th>Date</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Company</th>
              <th className="num">Amount</th>
              <th>Invoice</th>
              <th>TDS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={(busyId === r.id ? "busy " : "") + (r.txn_type === "refund" ? "refund " : "")}>
                {setSelected && <td className="cb"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Select row" /></td>}
                <td className="nowrap">{fmtDate(r.txn_date)}</td>
                <td>
                  <div className="strong">{r.vendor}{r.is_subscription && <span className="tag">Sub</span>}{r.txn_type === "refund" && <span className="tag green">Refund</span>}{r.txn_type === "fee" && <span className="tag">Fee</span>}</div>
                  <div className="muted small ellipsis" title={r.raw_description}>{r.raw_description}</div>
                </td>
                <td>
                  <select className={"cat-select" + (r.category === "Uncategorized" ? " warn" : "")} value={r.category} disabled={!editable} onChange={(e) => patch(r, { category: e.target.value })}>
                    {meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}
                  </select>
                </td>
                <td>
                  <CompanyPicker value={r.company} onChange={(c) => setCompany(r, c)} disabled={!editable} companies={meta.companies} />
                  {r.company === "SPLIT" && <div className="muted small">{r.split.map((s) => `${s.company} ${s.pct}%`).join(" / ")}</div>}
                </td>
                <td className="num nowrap">
                  <div className={"strong" + (r.amount < 0 ? " green-text" : "")}>{inr(r.amount, 2)}</div>
                  {r.fx_amount && <div className="muted small">{r.fx_amount.toLocaleString()} {r.fx_currency}</div>}
                </td>
                <td>
                  <div className="inv-cell">
                    <span className={"pill " + r.invoice_status} title={r.invoice_reason}>{INVOICE_LABEL[r.invoice_status]}</span>
                    {editable && r.invoice_status === "missing" && <button className="link small" onClick={() => quickAttach(r)}>Attach</button>}
                    {r.attachment_count > 0 && <span className="muted small">{r.attachment_count} file{r.attachment_count > 1 ? "s" : ""}</span>}
                  </div>
                </td>
                <td>
                  <TdsCell row={r} editable={editable && !r.excluded && r.txn_type !== "refund"} sections={meta.tds_sections} onSave={(tds) => patch(r, { tds })} />
                </td>
                <td><button className="btn small" onClick={() => onOpen(r)}>{editable ? "Edit" : "View"}</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="center muted pad">No rows match this filter</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
