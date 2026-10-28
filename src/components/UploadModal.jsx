import { useRef, useState } from "react";
import { api } from "../api";

export default function UploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [needPw, setNeedPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef();

  const pick = (f) => {
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) return setError("Please choose the statement PDF");
    setFile(f);
  };

  const submit = async () => {
    if (!file) return setError("Choose a statement PDF first");
    if (needPw && !password) return setError("Enter the PDF password");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    if (password) form.append("password", password);
    try {
      const st = await api("/statements/upload", { method: "POST", form });
      onDone(st);
    } catch (e) {
      if (e.detail?.code === "password_required") setNeedPw(true);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Upload card statement</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div
          className={"dropzone" + (drag ? " drag" : "") + (file ? " has-file" : "")}
          onClick={() => input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        >
          <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files[0])} />
          {file ? (
            <>
              <div className="dz-file">{file.name}</div>
              <div className="muted small">{(file.size / 1024).toFixed(0)} KB · click to change</div>
            </>
          ) : (
            <>
              <div className="dz-title">Drop the statement PDF here</div>
              <div className="muted small">or click to browse · Kotak Corporate Credit Card supported</div>
            </>
          )}
        </div>
        {needPw && (
          <label className="mt">PDF password
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoFocus />
          </label>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="steps-hint">
          <span>1. Read rows from PDF</span><span>2. Auto-tag vendors</span><span>3. Apply invoice rules</span>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>{busy ? "Extracting…" : "Upload and extract"}</button>
        </div>
      </div>
    </div>
  );
}
