import { useEffect, useState } from "react";
import { api, download, fmtDate, inr } from "../api";
import { useAuth } from "../auth";
import { CompanyPicker, INVOICE_LABEL } from "./TxnTable";

export default function TxnDrawer({ txn, focus, editable, onClose, onSaved }) {
  const { meta } = useAuth();
  const companies = meta.companies;
  const [f, setF] = useState(() => ({
    company: focus === "split" ? "SPLIT" : txn.company,
    split: txn.split?.length ? txn.split : companies.slice(0, 2).map((c, i) => ({ company: c.code, pct: i === 0 ? 50 : 50 })),
    category: txn.category,
    vendor: txn.vendor,
    is_subscription: txn.is_subscription,
    notes: txn.notes || "",
    tds: { applicable: false, section: "", rate: "", base_amount: "", deposited: false, challan_no: "", deposit_date: "", ...txn.tds, manual_amount: txn.tds?.is_manual ? txn.tds.amount : "" },
    apply_to_vendor: false,
  }));
  const [atts, setAtts] = useState([]);
  const [hist, setHist] = useState([]);
  const [docType, setDocType] = useState("invoice");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState(txn);

  useEffect(() => {
    api(`/transactions/${txn.id}/attachments`).then(setAtts);
    api(`/transactions/${txn.id}/history`).then(setHist);
  }, [txn.id]);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr(""); };
  const setTds = (k, v) => { setF((s) => ({ ...s, tds: { ...s.tds, [k]: v } })); setErr(""); };
  const setSplit = (i, k, v) => setF((s) => ({ ...s, split: s.split.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));

  const sec = meta.tds_sections.find((s) => s.code === f.tds.section);
  const tdsRate = f.tds.rate === "" || f.tds.rate === null ? sec?.rate : Number(f.tds.rate);
  const tdsBase = f.tds.base_amount === "" || f.tds.base_amount === null ? Math.abs(txn.amount) : Number(f.tds.base_amount);
  const calcAmt = tdsRate ? (tdsBase * tdsRate) / 100 : 0;
  const isManual = f.tds.manual_amount !== "" && f.tds.manual_amount !== null && f.tds.manual_amount !== undefined;
  const tdsAmt = isManual ? Number(f.tds.manual_amount) : calcAmt;
  const splitTotal = f.split.reduce((a, p) => a + Number(p.pct || 0), 0);

  const save = async () => {
    if (f.company === "SPLIT" && Math.round(splitTotal * 100) / 100 !== 100) return setErr("Split percentages must add up to 100");
    if (f.tds.applicable && !f.tds.section && !isManual) return setErr("Enter the TDS amount or choose a TDS section");
    if (isManual && (isNaN(Number(f.tds.manual_amount)) || Number(f.tds.manual_amount) < 0)) return setErr("Enter a valid TDS amount");
    setBusy(true);
    const body = {
      category: f.category, vendor: f.vendor, is_subscription: f.is_subscription, notes: f.notes,
      apply_to_vendor: f.apply_to_vendor, reviewed: true,
      tds: {
        applicable: f.tds.applicable, section: f.tds.section || null,
        rate: f.tds.rate === "" ? null : Number(f.tds.rate),
        base_amount: f.tds.base_amount === "" ? null : Number(f.tds.base_amount),
        manual_amount: isManual ? Number(f.tds.manual_amount) : null,
        deposited: f.tds.deposited, challan_no: f.tds.challan_no || null, deposit_date: f.tds.deposit_date || null,
      },
    };
    if (f.company) body.company = f.company;
    else if (txn.company) body.company = "";   // cleared in the editor
    if (f.company === "SPLIT") body.split = f.split.map((p) => ({ company: p.company, pct: Number(p.pct) }));
    try {
      const u = await api(`/transactions/${txn.id}`, { method: "PATCH", body });
      onSaved(u, f.apply_to_vendor);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("doc_type", docType);
    try {
      const res = await api(`/transactions/${txn.id}/attachments`, { method: "POST", form });
      setAtts((a) => [res.attachment, ...a]);
      setCur(res.transaction);
      onSaved(res.transaction, false, true);
    } catch (e) { setErr(e.message); }
  };

  const remove = async (a) => {
    try {
      const t = await api(`/attachments/${a.id}`, { method: "DELETE" });
      setAtts((x) => x.filter((y) => y.id !== a.id));
      setCur(t);
      onSaved(t, false, true);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div className="muted small">{fmtDate(txn.txn_date)} · XXXX {txn.card_last4}</div>
            <h3>{txn.vendor}</h3>
            <div className="muted small">{txn.raw_description} {txn.spends_area && `· ${txn.spends_area}`}</div>
          </div>
          <div className="right">
            <div className="amount-lg">{inr(txn.amount, 2)}</div>
            {txn.fx_amount && <div className="muted small">{txn.fx_amount} {txn.fx_currency}</div>}
          </div>
          <button className="btn-icon close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          <section>
            <h4>Allocation</h4>
            <CompanyPicker value={f.company} onChange={(c) => set("company", c)} disabled={!editable} companies={companies} />
            {f.company === "SPLIT" && (
              <div className="split-box">
                {f.split.map((p, i) => (
                  <div className="split-row" key={i}>
                    <select value={p.company} onChange={(e) => setSplit(i, "company", e.target.value)} disabled={!editable}>
                      {companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <input type="number" min="0" max="100" value={p.pct} onChange={(e) => setSplit(i, "pct", e.target.value)} disabled={!editable} />
                    <span>%</span>
                    <span className="muted small">{inr((txn.amount * Number(p.pct || 0)) / 100, 2)}</span>
                  </div>
                ))}
                <div className={"small " + (Math.round(splitTotal) === 100 ? "muted" : "error-text")}>Total {splitTotal}%</div>
              </div>
            )}
          </section>

          <section className="grid2">
            <label>Category
              <select value={f.category} onChange={(e) => {
                const c = meta.categories.find((x) => x.name === e.target.value);
                setF((s) => ({ ...s, category: e.target.value, is_subscription: !!c?.subscription }));
              }} disabled={!editable}>
                {meta.categories.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label>Vendor name
              <input value={f.vendor} onChange={(e) => set("vendor", e.target.value)} disabled={!editable} />
            </label>
            <label className="check">
              <input type="checkbox" checked={f.is_subscription} onChange={(e) => set("is_subscription", e.target.checked)} disabled={!editable} />
              Subscription (invoice on vendor portal)
            </label>
            <label className="check">
              <input type="checkbox" checked={f.apply_to_vendor} onChange={(e) => set("apply_to_vendor", e.target.checked)} disabled={!editable} />
              Remember for this vendor next month
            </label>
          </section>

          <section>
            <div className="sec-head">
              <h4>Invoice / supporting documents</h4>
              <span className={"pill " + cur.invoice_status}>{INVOICE_LABEL[cur.invoice_status]}</span>
            </div>
            <p className="muted small">{cur.invoice_reason}</p>
            {atts.map((a) => (
              <div className="att" key={a.id}>
                <span className="tag">{a.doc_type.replace("_", " ")}</span>
                <button className="link" onClick={() => download(`/attachments/${a.id}/download`, null, a.file_name)}>{a.file_name}</button>
                <span className="muted small">{a.uploaded_by}</span>
                {editable && <button className="link danger small" onClick={() => remove(a)}>Remove</button>}
              </div>
            ))}
            {editable && (
              <div className="att-upload">
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="supporting">Supporting doc</option>
                  <option value="tds_challan">TDS challan</option>
                </select>
                <label className="btn small">Choose file<input type="file" hidden onChange={(e) => upload(e.target.files[0])} /></label>
              </div>
            )}
          </section>

          <section>
            <div className="sec-head">
              <h4>TDS</h4>
              <label className="switch">
                <input type="checkbox" checked={!!f.tds.applicable} onChange={(e) => setTds("applicable", e.target.checked)} disabled={!editable} />
                <span>{f.tds.applicable ? "Applicable" : "Not applicable"}</span>
              </label>
            </div>
            {f.tds.applicable && (
              <div className="grid2">
                <label>Section
                  <select value={f.tds.section || ""} onChange={(e) => { setTds("section", e.target.value); setTds("rate", ""); }} disabled={!editable}>
                    <option value="">Select (optional if amount entered)</option>
                    {meta.tds_sections.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}
                  </select>
                </label>
                <label>Rate %
                  <input type="number" step="0.01" placeholder={sec?.rate ?? ""} value={f.tds.rate ?? ""} onChange={(e) => setTds("rate", e.target.value)} disabled={!editable} />
                </label>
                <label>Taxable amount
                  <input type="number" step="0.01" placeholder={Math.abs(txn.amount)} value={f.tds.base_amount ?? ""} onChange={(e) => setTds("base_amount", e.target.value)} disabled={!editable} />
                </label>
                <label>TDS amount (enter manually)
                  <input type="number" step="0.01" min="0" placeholder={`Calculated: ${inr(calcAmt, 2)}`} value={f.tds.manual_amount ?? ""} onChange={(e) => setTds("manual_amount", e.target.value)} disabled={!editable} />
                </label>
                <div className="tds-amt"><div className="muted small">TDS to record {isManual ? "(manual)" : "(from rate)"}</div><div className="strong">{inr(tdsAmt, 2)}</div></div>
                <label className="check">
                  <input type="checkbox" checked={!!f.tds.deposited} onChange={(e) => setTds("deposited", e.target.checked)} disabled={!editable} />
                  TDS deposited
                </label>
                <span />
                <label>Challan no.
                  <input value={f.tds.challan_no || ""} onChange={(e) => setTds("challan_no", e.target.value)} disabled={!editable} />
                </label>
                <label>Deposit date
                  <input type="date" value={f.tds.deposit_date || ""} onChange={(e) => setTds("deposit_date", e.target.value)} disabled={!editable} />
                </label>
              </div>
            )}
          </section>

          <section>
            <label>Notes
              <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} disabled={!editable} placeholder="Purpose, project, client, approver…" />
            </label>
          </section>

          {hist.length > 0 && (
            <section>
              <h4>History</h4>
              <ul className="history">
                {hist.slice(0, 6).map((h) => (
                  <li key={h.id}><span className="strong">{h.action}</span> by {h.user_email} <span className="muted small">{new Date(h.at + "Z").toLocaleString("en-IN")}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="drawer-foot">
          {err && <div className="form-error">{err}</div>}
          <button className="btn" onClick={onClose}>Close</button>
          {editable && <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>}
        </div>
      </aside>
    </div>
  );
}
