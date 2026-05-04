import { useState, useRef } from "react";

const today = "Sábado, 02 Mai 2026";
const LOGO   = "/assets/ccshower.png";

// currentUser viria do auth: { id, name, companyId, companyName, dept }
const MOCK_USER = { id: 4, name: "Sarah Johnson", companyId: 1, companyName: "CC Shower — Springfield", dept: "comercial" };

const visits = [
  { id: 1, name: "John Smith",   product: "Glass Shower", time: "09:00", address: "123 Oak Street, Springfield, IL",   status: "pending", phone: "+1 (217) 555-0101" },
  { id: 2, name: "Mary Johnson", product: "Mirror Wall",  time: "10:30", address: "456 Elm Avenue, Springfield, IL",   status: "pending", phone: "+1 (217) 555-0184" },
  { id: 3, name: "Robert Davis", product: "Box Shower",   time: "13:00", address: "789 Pine Road, Springfield, IL",    status: "done",    phone: "+1 (217) 555-0193",
    measurements: { width: "120", height: "210", depth: "90", thickness: "8mm", notes: "Parede direita fora de esquadro ~2cm" },
    auditLog: [
      { user: "Sarah Johnson", action: "Visita agendada", datetime: "30/04/2026 14:22", type: "release" },
      { user: "Sarah Johnson", action: "Medição concluída — enviado para Projeto", datetime: "02/05/2026 13:48", type: "done" },
    ],
  },
  { id: 4, name: "Linda Garcia", product: "Glass Door",   time: "15:00", address: "321 Maple Drive, Springfield, IL", status: "pending", phone: "+1 (217) 555-0147" },
];

const leads = [
  { id: 10, name: "Patricia Lee",  product: "Mirror",       phone: "+1 (217) 555-0112", received: "Hoje 08:22" },
  { id: 11, name: "James Wilson",  product: "Glass Shower", phone: "+1 (217) 555-0165", received: "Ontem 17:45" },
];

const crashReasons = [
  "Cliente pediu para esperar",
  "Sem resposta / ausente",
  "Endereço incorreto",
  "Cliente desistiu",
  "Reagendar — cliente solicitou",
  "Outro",
];

const glassThicknesses = ["4mm", "6mm", "8mm", "10mm", "12mm"];
const ORIGIN = "100 Main St, Springfield, IL";
const emptyMeasurements = { width: "", height: "", depth: "", thickness: "", notes: "" };

function buildMapsUrl(list) {
  const pending = list.filter(v => v.status === "pending");
  if (!pending.length) return "#";
  const last = pending[pending.length - 1];
  const wps  = pending.slice(0, -1).map(v => encodeURIComponent(v.address)).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ORIGIN)}&destination=${encodeURIComponent(last.address)}${wps ? `&waypoints=${wps}` : ""}&travelmode=driving`;
}

function nowStr() {
  return new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusStyle = {
  pending: { bg: "#FFF3CD", text: "#856404", label: "Pendente" },
  done:    { bg: "#D5F5E3", text: "#1E8449", label: "Concluída" },
  crash:   { bg: "#FDECEA", text: "#C0392B", label: "Crash" },
};

const auditTypeStyle = {
  release: { color: "#3B7DD8", icon: "🔓" },
  done:    { color: "#1D9E75", icon: "✅" },
  crash:   { color: "#E53935", icon: "⚠️" },
  photo:   { color: "#7F77DD", icon: "📷" },
  schedule:{ color: "#1D9E75", icon: "📅" },
};

export default function ComercialDashboard({ currentUser = MOCK_USER }) {
  const [visitList,    setVisitList]    = useState(visits);
  const [leads_,       setLeads]        = useState(leads);
  const [activeCard,   setActiveCard]   = useState(null);
  const [modal,        setModal]        = useState(null);
  const [measurements, setMeasurements] = useState(emptyMeasurements);
  const [crashReason,  setCrashReason]  = useState("");
  const [photos,       setPhotos]       = useState({});
  const [scheduleForm, setScheduleForm] = useState({ name: "", product: "", address: "", date: "", time: "", phone: "" });
  const fileRef = useRef();

  const visit = modal?.visitId ? visitList.find(v => v.id === modal.visitId) : null;
  const pending = visitList.filter(v => v.status === "pending").length;
  const done    = visitList.filter(v => v.status === "done").length;

  function addAuditEntry(visitId, action, type) {
    const entry = { user: currentUser.name, action, datetime: nowStr(), type };
    setVisitList(prev => prev.map(v => v.id !== visitId ? v : {
      ...v, auditLog: [...(v.auditLog || []), entry],
    }));
    return entry;
  }

  function handlePhotoUpload(visitId, files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        setPhotos(prev => ({ ...prev, [visitId]: [...(prev[visitId] || []), e.target.result] }));
        addAuditEntry(visitId, `Foto adicionada: ${file.name}`, "photo");
      };
      reader.readAsDataURL(file);
    });
  }

  function openResultModal(v) {
    setMeasurements(v.measurements || emptyMeasurements);
    setCrashReason("");
    setModal({ type: "result", visitId: v.id });
  }

  function markDone(visitId) {
    addAuditEntry(visitId, "Medição concluída — enviado para Projeto", "done");
    setVisitList(prev => prev.map(v => v.id !== visitId ? v : { ...v, status: "done", measurements: { ...measurements } }));
    setModal(null);
  }

  function markCrash(visitId) {
    if (!crashReason) return;
    addAuditEntry(visitId, `Crash: ${crashReason}`, "crash");
    setVisitList(prev => prev.map(v => v.id !== visitId ? v : { ...v, status: "crash", crashReason }));
    setModal(null);
    setCrashReason("");
  }

  function scheduleNew() {
    const newVisit = {
      id: Date.now(), ...scheduleForm, status: "pending",
      auditLog: [{ user: currentUser.name, action: `Visita agendada para ${scheduleForm.date} às ${scheduleForm.time}`, datetime: nowStr(), type: "schedule" }],
    };
    addAuditEntry && null; // audit already in newVisit
    setVisitList(prev => [...prev, newVisit]);
    setLeads(prev => prev.filter(l => l.name !== scheduleForm.name));
    setModal(null);
    setScheduleForm({ name: "", product: "", address: "", date: "", time: "", phone: "" });
  }

  const measComplete = measurements.width && measurements.height && measurements.depth && measurements.thickness;

  const inputStyle  = { width: "100%", boxSizing: "border-box", border: "1px solid #E0E0E0", borderRadius: 10, padding: "10px 12px", fontSize: 14, background: "#FAFAFA", outline: "none", fontFamily: "inherit" };
  const labelStyle  = { fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };
  const unitBadge   = (unit) => (
    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#AAA", background: "#F0F0EE", padding: "2px 7px", borderRadius: 6 }}>{unit}</span>
  );

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F7F6F3", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <img src={LOGO} alt="CC Shower Door" style={{ height: 32, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1D9E75" }}>COMERCIAL</div>
            <div style={{ fontSize: 10, color: "#AAA" }}>{currentUser.companyName}</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1D9E75", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
            {currentUser.name.charAt(0)}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 14px", maxWidth: 600, margin: "0 auto", paddingBottom: 90 }}>

        {/* Date + user */}
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>{today} · {currentUser.name}</div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Visitas hoje", value: visitList.length, color: "#1A1A1A" },
            { label: "Pendentes",    value: pending,          color: "#856404" },
            { label: "Concluídas",   value: done,             color: "#1D9E75" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Route button */}
        <a href={buildMapsUrl(visitList)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1D9E75", color: "#fff", borderRadius: 12, padding: "13px 16px", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 16, boxShadow: "0 2px 8px #1D9E7530" }}>
          <span style={{ fontSize: 18 }}>🗺️</span> Abrir rota do dia no Google Maps
          <span style={{ fontSize: 12, opacity: 0.8 }}>({pending} paradas)</span>
        </a>

        {/* Visit list */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Visitas de hoje</div>
          {visitList.map((v) => {
            const st = statusStyle[v.status];
            const open = activeCard === v.id;
            const myPhotos = photos[v.id] || [];
            return (
              <div key={v.id} style={{ background: "#fff", border: `1px solid ${v.status === "crash" ? "#FECACA" : "#EBEBEB"}`, borderLeft: `4px solid ${v.status === "done" ? "#1D9E75" : v.status === "crash" ? "#E53935" : "#F0C030"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>

                {/* Header */}
                <div onClick={() => setActiveCard(open ? null : v.id)} style={{ padding: "13px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ background: "#F0F0EE", color: "#555", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{v.time}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{v.product}</div>
                    <div style={{ fontSize: 11, color: "#AAA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {v.address}</div>
                    {v.status === "done" && v.measurements && (
                      <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {[{ label: "L", value: v.measurements.width, unit: "cm" }, { label: "A", value: v.measurements.height, unit: "cm" }, { label: "P", value: v.measurements.depth, unit: "cm" }, { label: "E", value: v.measurements.thickness, unit: "" }].map(m => m.value && (
                          <span key={m.label} style={{ background: "#E8F8F2", color: "#1D9E75", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{m.label}: {m.value}{m.unit}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                    <span style={{ background: st.bg, color: st.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{st.label}</span>
                    {v.status === "crash" && <span style={{ fontSize: 10, color: "#C0392B", maxWidth: 100, textAlign: "right" }}>{v.crashReason}</span>}
                    <span style={{ fontSize: 14, color: "#CCC" }}>{open ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded */}
                {open && (
                  <div style={{ borderTop: "1px solid #F5F5F5", padding: "12px 14px", background: "#FAFAFA" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <a href={`tel:${v.phone}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: "#555", textDecoration: "none", minWidth: 80 }}>📞 Ligar</a>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}&travelmode=driving`} target="_blank" rel="noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: "#555", textDecoration: "none", minWidth: 80 }}>🗺️ Ir</a>
                      <button onClick={() => { fileRef.current.dataset.visitid = v.id; fileRef.current.click(); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer", minWidth: 80 }}>
                        📷 {myPhotos.length > 0 ? `Fotos (${myPhotos.length})` : "Foto"}
                      </button>
                    </div>
                    {myPhotos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
                        {myPhotos.map((src, idx) => <img key={idx} src={src} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0", flexShrink: 0 }}/>)}
                      </div>
                    )}
                    {v.status === "pending" && (
                      <button onClick={() => openResultModal(v)} style={{ width: "100%", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                        ✓ Registrar resultado
                      </button>
                    )}
                    {v.status === "done" && <div style={{ background: "#D5F5E3", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#1E8449", fontWeight: 600, marginBottom: 12 }}>✓ Medição concluída — enviado para Projeto</div>}
                    {v.status === "crash" && <div style={{ background: "#FDECEA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#C0392B", fontWeight: 600, marginBottom: 12 }}>⚠ Crash registrado — Admin notificado</div>}

                    {/* ── AUDIT LOG ── */}
                    {(v.auditLog || []).length > 0 && (
                      <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>🕒 Histórico</div>
                        {(v.auditLog || []).map((entry, idx) => {
                          const as = auditTypeStyle[entry.type] || { color: "#888", icon: "•" };
                          return (
                            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{as.icon}</span>
                              <div style={{ flex: 1, background: "#fff", border: "1px solid #EBEBEB", borderRadius: 8, padding: "6px 10px" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: as.color }}>{entry.action}</div>
                                <div style={{ fontSize: 10, color: "#AAA", marginTop: 1 }}>👤 {entry.user} · 🕒 {entry.datetime}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New leads */}
        {leads_.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Novos leads para agendar</div>
            {leads_.map(l => (
              <div key={l.id} style={{ background: "#fff", border: "1px solid #EBEBEB", borderLeft: "4px solid #3B7DD8", borderRadius: 12, padding: "13px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{l.product}</div>
                  <div style={{ fontSize: 11, color: "#BBB" }}>Recebido: {l.received}</div>
                </div>
                <button onClick={() => { setScheduleForm(f => ({ ...f, name: l.name, product: l.product, phone: l.phone })); setModal({ type: "schedule" }); }}
                  style={{ background: "#3B7DD8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Agendar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }}
        onChange={e => { handlePhotoUpload(parseInt(fileRef.current.dataset.visitid), e.target.files); e.target.value = ""; }}/>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 100 }}>
        {[["🏠","Hoje"],["👤","Clientes"],["📅","Agenda"],["📊","Resultados"]].map(([icon, label]) => (
          <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: label === "Hoje" ? "#1D9E75" : "#AAA", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MODAL — Resultado */}
      {modal?.type === "result" && visit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 16px" }}/>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>Registrar resultado</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{visit.name} — {visit.product}</div>
            <div style={{ background: "#F7F6F3", borderRadius: 10, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#888" }}>
              🕒 Será registrado: <strong>{currentUser.name}</strong> · {nowStr()}
            </div>

            {/* Medidas */}
            <div style={{ background: "#F7F6F3", borderRadius: 14, padding: "14px 14px 6px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>📐 Medidas do vão</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[{ label: "Largura", key: "width" }, { label: "Altura", key: "height" }].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <div style={{ position: "relative" }}>
                      <input type="number" placeholder="0" value={measurements[f.key]} onChange={e => setMeasurements(m => ({ ...m, [f.key]: e.target.value }))} style={{ ...inputStyle, paddingRight: 42 }}/>
                      {unitBadge("cm")}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Profundidade</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" placeholder="0" value={measurements.depth} onChange={e => setMeasurements(m => ({ ...m, depth: e.target.value }))} style={{ ...inputStyle, paddingRight: 42 }}/>
                    {unitBadge("cm")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Espessura vidro</label>
                  <select value={measurements.thickness} onChange={e => setMeasurements(m => ({ ...m, thickness: e.target.value }))} style={{ ...inputStyle, color: measurements.thickness ? "#1A1A1A" : "#AAA" }}>
                    <option value="">Selecionar...</option>
                    {["4mm","6mm","8mm","10mm","12mm"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Observações de obra</label>
                <textarea placeholder="Ex: parede fora de esquadro, piso irregular..." value={measurements.notes} onChange={e => setMeasurements(m => ({ ...m, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }}/>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {[{ key: "width", label: "L", unit: "cm" }, { key: "height", label: "A", unit: "cm" }, { key: "depth", label: "P", unit: "cm" }, { key: "thickness", label: "E", unit: "" }].map(f => (
                  <span key={f.key} style={{ background: measurements[f.key] ? "#E8F8F2" : "#F0F0EE", color: measurements[f.key] ? "#1D9E75" : "#BBB", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, transition: "all 0.2s" }}>
                    {f.label}: {measurements[f.key] ? `${measurements[f.key]}${f.unit}` : "—"}
                  </span>
                ))}
              </div>
            </div>

            {/* Fotos */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fotos da medição</label>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {(photos[visit.id] || []).map((src, idx) => <img key={idx} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #E0E0E0", flexShrink: 0 }}/>)}
                <button onClick={() => { fileRef.current.dataset.visitid = visit.id; fileRef.current.click(); }} style={{ width: 72, height: 72, borderRadius: 10, border: "2px dashed #D0D0D0", background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, gap: 4 }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span style={{ fontSize: 9, color: "#AAA", fontWeight: 600 }}>Adicionar</span>
                </button>
              </div>
            </div>

            <button onClick={() => markDone(visit.id)} disabled={!measComplete} style={{ width: "100%", background: measComplete ? "#1D9E75" : "#F0F0F0", color: measComplete ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: measComplete ? "pointer" : "default", marginBottom: 16, transition: "all 0.2s" }}>
              {measComplete ? "✓ Medição concluída — enviar para Projeto" : "Preencha todas as medidas para continuar"}
            </button>

            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ou registrar problema</div>
              <select value={crashReason} onChange={e => setCrashReason(e.target.value)} style={{ ...inputStyle, color: crashReason ? "#1A1A1A" : "#AAA", marginBottom: 10 }}>
                <option value="">Selecionar motivo do crash...</option>
                {crashReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => markCrash(visit.id)} disabled={!crashReason} style={{ width: "100%", background: crashReason ? "#E53935" : "#F5F5F5", color: crashReason ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: crashReason ? "pointer" : "default", transition: "all 0.2s" }}>
                ⚠ Registrar crash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Agendar */}
      {modal?.type === "schedule" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 16px" }}/>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Agendar visita</div>
            <div style={{ background: "#F7F6F3", borderRadius: 10, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#888" }}>
              🕒 Será registrado: <strong>{currentUser.name}</strong> · {nowStr()}
            </div>
            {[
              { label: "Nome do cliente", key: "name",    type: "text", placeholder: "Nome completo" },
              { label: "Produto",         key: "product", type: "text", placeholder: "Ex: Glass Shower" },
              { label: "Telefone",        key: "phone",   type: "tel",  placeholder: "+1 (217) 555-0000" },
              { label: "Endereço",        key: "address", type: "text", placeholder: "Endereço completo" },
              { label: "Data",            key: "date",    type: "date", placeholder: "" },
              { label: "Horário",         key: "time",    type: "time", placeholder: "" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{label}</label>
                <input type={type} placeholder={placeholder} value={scheduleForm[key]} onChange={e => setScheduleForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}/>
              </div>
            ))}
            <button onClick={scheduleNew} disabled={!scheduleForm.name || !scheduleForm.address || !scheduleForm.time}
              style={{ width: "100%", marginTop: 8, background: scheduleForm.name && scheduleForm.address && scheduleForm.time ? "#1D9E75" : "#F0F0F0", color: scheduleForm.name && scheduleForm.address && scheduleForm.time ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ✓ Confirmar agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
