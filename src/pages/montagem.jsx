import { useState, useRef } from "react";

const today = "Sábado, 02 Mai 2026";
const CURRENT_USER = "Carlos M."; // viria do auth

const ORIGIN = "100 Main St, Springfield, IL";

const initialJobs = [
  {
    id: 1, name: "Mary Johnson",  product: "Mirror Wall",  time: "09:00",
    address: "456 Elm Avenue, Springfield, IL",
    status: "pending", released: true, releasedBy: "Financeiro",
    measurements: { width: "180", height: "90", depth: "—", thickness: "6mm" },
    notes: "",
    auditLog: [
      { user: "Ana R.", action: "Liberado pelo Financeiro", datetime: "02/05/2026 07:30", type: "release" },
    ],
    photos: [],
  },
  {
    id: 2, name: "John Smith",    product: "Glass Shower", time: "11:00",
    address: "123 Oak Street, Springfield, IL",
    status: "done",
    measurements: { width: "120", height: "210", depth: "90", thickness: "8mm" },
    notes: "Parede direita fora de esquadro ~2cm",
    auditLog: [
      { user: "Ana R.",    action: "Liberado pelo Financeiro", datetime: "02/05/2026 07:30", type: "release" },
      { user: "Carlos M.", action: "Instalação concluída",     datetime: "02/05/2026 10:45", type: "done" },
    ],
    photos: [],
  },
  {
    id: 3, name: "Sandra Melo",   product: "Box Shower",   time: "14:00",
    address: "789 Pine Road, Springfield, IL",
    status: "pending", released: true,
    measurements: { width: "90", height: "200", depth: "90", thickness: "10mm" },
    notes: "",
    auditLog: [
      { user: "Ana R.", action: "Liberado pelo Financeiro — pagamento integral", datetime: "02/05/2026 08:15", type: "release" },
    ],
    photos: [],
  },
  {
    id: 4, name: "Rafael Torres", product: "Glass Door",   time: "16:00",
    address: "321 Maple Drive, Springfield, IL",
    status: "crash", crashReason: "Cliente ausente",
    measurements: { width: "80", height: "210", depth: "—", thickness: "8mm" },
    notes: "",
    auditLog: [
      { user: "Ana R.",    action: "Liberado pelo Financeiro",    datetime: "01/05/2026 15:00", type: "release" },
      { user: "Carlos M.", action: "Crash: Cliente ausente",      datetime: "02/05/2026 16:10", type: "crash" },
    ],
    photos: [],
  },
];

const crashReasons = [
  "Cliente ausente",
  "Vidro quebrado no transporte",
  "Medidas incorretas — não encaixou",
  "Problema estrutural no local",
  "Falta de material",
  "Acesso negado ao imóvel",
  "Outro",
];

const statusStyle = {
  pending: { bg: "#FFF3CD", text: "#856404", label: "Aguardando", border: "#F0C030" },
  done:    { bg: "#D5F5E3", text: "#1E8449", label: "Concluída",  border: "#1D9E75" },
  crash:   { bg: "#FDECEA", text: "#C0392B", label: "Crash",      border: "#E53935" },
};

const auditTypeStyle = {
  release: { color: "#3B7DD8", icon: "🔓" },
  done:    { color: "#1D9E75", icon: "✅" },
  crash:   { color: "#E53935", icon: "⚠️" },
  photo:   { color: "#7F77DD", icon: "📷" },
};

function buildMapsUrl(jobs) {
  const pending = jobs.filter(j => j.status === "pending");
  if (!pending.length) return "#";
  const last = pending[pending.length - 1];
  const wps  = pending.slice(0, -1).map(j => encodeURIComponent(j.address)).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ORIGIN)}&destination=${encodeURIComponent(last.address)}${wps ? `&waypoints=${wps}` : ""}&travelmode=driving`;
}

function nowStr() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MontagemDashboard() {
  const [jobs,        setJobs]        = useState(initialJobs);
  const [activeCard,  setActiveCard]  = useState(null);
  const [modal,       setModal]       = useState(null);
  const [crashReason, setCrashReason] = useState("");
  const [crashNote,   setCrashNote]   = useState("");
  const [photos,      setPhotos]      = useState({});
  const fileRef = useRef();

  const job = modal?.jobId ? jobs.find(j => j.id === modal.jobId) : null;

  const counts = {
    total:   jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    done:    jobs.filter(j => j.status === "done").length,
    crash:   jobs.filter(j => j.status === "crash").length,
  };

  function addAuditEntry(jobId, action, type) {
    const entry = { user: CURRENT_USER, action, datetime: nowStr(), type };
    setJobs(prev => prev.map(j => j.id !== jobId ? j : {
      ...j, auditLog: [...(j.auditLog || []), entry],
    }));
    return entry;
  }

  function handlePhotoUpload(jobId, files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        setPhotos(prev => ({ ...prev, [jobId]: [...(prev[jobId] || []), e.target.result] }));
        addAuditEntry(jobId, `Foto adicionada: ${file.name}`, "photo");
      };
      reader.readAsDataURL(file);
    });
  }

  function markDone(jobId) {
    addAuditEntry(jobId, "Instalação concluída — SMS enviado ao cliente", "done");
    setJobs(prev => prev.map(j => j.id !== jobId ? j : { ...j, status: "done" }));
    setModal(null);
  }

  function markCrash(jobId) {
    if (!crashReason) return;
    const action = `Crash: ${crashReason}${crashNote ? ` — ${crashNote}` : ""}`;
    addAuditEntry(jobId, action, "crash");
    setJobs(prev => prev.map(j => j.id !== jobId ? j : { ...j, status: "crash", crashReason, crashNote }));
    setModal(null);
    setCrashReason("");
    setCrashNote("");
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #E0E0E0", borderRadius: 10, padding: "10px 12px", fontSize: 13, background: "#FAFAFA", outline: "none", fontFamily: "inherit" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F7F6F3", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>cc<span style={{ color: "#E8604C" }}>shower</span></span>
          <span style={{ background: "#FDECEA", color: "#E8604C", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>MONTAGEM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#999" }}>{today}</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8604C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>M</div>
        </div>
      </div>

      <div style={{ padding: "16px 14px", maxWidth: 600, margin: "0 auto", paddingBottom: 90 }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total",     value: counts.total,   color: "#1A1A1A", alert: false },
            { label: "Pendentes", value: counts.pending, color: "#856404", alert: false },
            { label: "Prontas",   value: counts.done,    color: "#1D9E75", alert: false },
            { label: "Crashes",   value: counts.crash,   color: "#C0392B", alert: counts.crash > 0 },
          ].map((s, i) => (
            <div key={i} style={{ background: s.alert ? "#FEF2F2" : "#fff", border: s.alert ? "1px solid #FECACA" : "1px solid #EBEBEB", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: s.alert ? "#B91C1C" : "#999", fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Route button */}
        <a href={buildMapsUrl(jobs)} target="_blank" rel="noreferrer" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "#E8604C", color: "#fff", borderRadius: 12, padding: "13px 16px",
          fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 16,
          boxShadow: "0 2px 8px #E8604C30",
        }}>
          <span style={{ fontSize: 18 }}>🗺️</span>
          Rota de instalação — Google Maps
          <span style={{ fontSize: 12, opacity: 0.8 }}>({counts.pending} paradas)</span>
        </a>

        {/* Jobs */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#999", textTransform: "uppercase", marginBottom: 10 }}>
          Instalações de hoje
        </div>

        {jobs.map((j) => {
          const st       = statusStyle[j.status];
          const open     = activeCard === j.id;
          const myPhotos = photos[j.id] || [];

          return (
            <div key={j.id} style={{
              background: "#fff",
              border: `1px solid ${j.status === "crash" ? "#FECACA" : "#EBEBEB"}`,
              borderLeft: `4px solid ${st.border}`,
              borderRadius: 12, marginBottom: 10, overflow: "hidden",
            }}>
              {/* Header */}
              <div onClick={() => setActiveCard(open ? null : j.id)}
                style={{ padding: "13px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ background: "#F0F0EE", color: "#555", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{j.time}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{j.product}</div>
                  <div style={{ fontSize: 11, color: "#AAA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {j.address}</div>
                  {/* measurement mini badges */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    {[
                      { label: "L", value: j.measurements.width,     unit: "cm" },
                      { label: "A", value: j.measurements.height,    unit: "cm" },
                      { label: "P", value: j.measurements.depth,     unit: "cm" },
                      { label: "E", value: j.measurements.thickness, unit: "" },
                    ].filter(m => m.value && m.value !== "—").map(m => (
                      <span key={m.label} style={{ background: "#FDECEA", color: "#E8604C", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                        {m.label}: {m.value}{m.unit}
                      </span>
                    ))}
                  </div>
                  {j.status === "crash" && (
                    <div style={{ fontSize: 11, color: "#C0392B", marginTop: 5 }}>⚠ {j.crashReason}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                  <span style={{ background: st.bg, color: st.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{st.label}</span>
                  {myPhotos.length > 0 && <span style={{ fontSize: 9, background: "#E8E4FF", color: "#7F77DD", padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>📷 {myPhotos.length}</span>}
                  <span style={{ fontSize: 14, color: "#CCC" }}>{open ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded */}
              {open && (
                <div style={{ borderTop: "1px solid #F5F5F5", padding: "14px", background: "#FAFAFA" }}>

                  {/* Ficha técnica */}
                  <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "12px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#E8604C", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>📐 Ficha técnica</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: j.notes ? 10 : 0 }}>
                      {[
                        { label: "Largura",  value: `${j.measurements.width} cm` },
                        { label: "Altura",   value: `${j.measurements.height} cm` },
                        { label: "Prof.",    value: `${j.measurements.depth}${j.measurements.depth !== "—" ? " cm" : ""}` },
                        { label: "Espess.",  value: j.measurements.thickness },
                      ].map(f => (
                        <div key={f.label} style={{ background: "#F7F6F3", borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
                          <div style={{ fontSize: 8, color: "#AAA", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    {j.notes && (
                      <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#856404", marginTop: 8 }}>
                        ⚠ <strong>Obs:</strong> {j.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(j.address)}&travelmode=driving`}
                      target="_blank" rel="noreferrer"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: "#555", textDecoration: "none" }}>
                      🗺️ Ir
                    </a>
                    <button onClick={() => { fileRef.current.dataset.jobid = j.id; fileRef.current.click(); }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                      📷 {myPhotos.length > 0 ? `Fotos (${myPhotos.length})` : "Foto"}
                    </button>
                  </div>

                  {/* Photo thumbnails */}
                  {myPhotos.length > 0 && (
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
                      {myPhotos.map((src, idx) => (
                        <img key={idx} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0", flexShrink: 0 }}/>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  {j.status === "pending" && (
                    <button onClick={() => setModal({ type: "result", jobId: j.id })}
                      style={{ width: "100%", background: "#E8604C", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
                      ✓ Registrar resultado da instalação
                    </button>
                  )}
                  {j.status === "done" && (
                    <div style={{ background: "#D5F5E3", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#1E8449", fontWeight: 700, marginBottom: 14 }}>
                      ✅ Instalação concluída — cliente notificado por SMS
                    </div>
                  )}

                  {/* ── AUDIT LOG ── */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                      🕒 Histórico de auditoria
                    </div>
                    {(j.auditLog || []).map((entry, idx) => {
                      const style = auditTypeStyle[entry.type] || { color: "#888", icon: "•" };
                      return (
                        <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 14 }}>{style.icon}</span>
                            {idx < (j.auditLog.length - 1) && <div style={{ width: 1, height: 16, background: "#E0E0E0", margin: "2px 0" }}/>}
                          </div>
                          <div style={{ flex: 1, background: "#fff", border: "1px solid #EBEBEB", borderRadius: 8, padding: "7px 10px" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: style.color }}>{entry.action}</div>
                            <div style={{ fontSize: 10, color: "#AAA", marginTop: 2 }}>{entry.user} • {entry.datetime}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }}
        onChange={e => { handlePhotoUpload(parseInt(fileRef.current.dataset.jobid), e.target.files); e.target.value = ""; }}/>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 100 }}>
        {[["🔨","Hoje"],["✅","Prontas"],["⚠","Crashes"],["🕒","Histórico"]].map(([icon, label]) => (
          <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: label === "Hoje" ? "#E8604C" : "#AAA", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MODAL — Resultado */}
      {modal?.type === "result" && job && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 16px" }}/>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>Resultado da instalação</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{job.name} — {job.product}</div>

            {/* Audit preview */}
            <div style={{ background: "#F7F6F3", borderRadius: 10, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#888" }}>
              🕒 Será registrado: <strong>{CURRENT_USER}</strong> • {nowStr()}
            </div>

            {/* Photo upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fotos da instalação</label>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {(photos[job.id] || []).map((src, idx) => (
                  <img key={idx} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #E0E0E0", flexShrink: 0 }}/>
                ))}
                <button onClick={() => { fileRef.current.dataset.jobid = job.id; fileRef.current.click(); }}
                  style={{ width: 72, height: 72, borderRadius: 10, border: "2px dashed #D0D0D0", background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, gap: 4 }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span style={{ fontSize: 9, color: "#AAA", fontWeight: 600 }}>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Concluir */}
            <button onClick={() => markDone(job.id)}
              style={{ width: "100%", background: "#E8604C", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
              ✅ Instalação concluída — notificar cliente
            </button>

            {/* Crash */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ou registrar problema</div>
              <select value={crashReason} onChange={e => setCrashReason(e.target.value)}
                style={{ ...inputStyle, color: crashReason ? "#1A1A1A" : "#AAA", marginBottom: 8 }}>
                <option value="">Motivo do crash...</option>
                {crashReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <textarea placeholder="Detalhes adicionais (opcional)..." value={crashNote}
                onChange={e => setCrashNote(e.target.value)} rows={2}
                style={{ ...inputStyle, resize: "none", marginBottom: 8 }}/>
              <button onClick={() => markCrash(job.id)} disabled={!crashReason}
                style={{ width: "100%", background: crashReason ? "#E53935" : "#F5F5F5", color: crashReason ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: crashReason ? "pointer" : "default", transition: "all 0.2s" }}>
                ⚠ Registrar crash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
