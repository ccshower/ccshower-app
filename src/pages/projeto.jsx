import { useState, useRef } from "react";

const today    = "Sábado, 02 Mai 2026";
const LOGO     = "/assets/ccshower.png";
const MOCK_USER = { id: 5, name: "David Park", companyId: 1, companyName: "CC Shower — Springfield", dept: "projeto" };

const queue = [
  {
    id: 1, name: "John Smith",    product: "Glass Shower", receivedAt: "Hoje 09:45",
    status: "pending", companyId: 1,
    measurements: { width: "120", height: "210", depth: "90", thickness: "8mm", notes: "Parede direita fora de esquadro ~2cm" },
    files: {}, orderSent: false, clientApproval: null,
    auditLog: [{ user: "Sarah Johnson", action: "Medição concluída — enviado pelo Comercial", datetime: "02/05/2026 09:45", type: "release" }],
  },
  {
    id: 2, name: "Mary Johnson",  product: "Mirror Wall",  receivedAt: "Hoje 11:10",
    status: "pending", companyId: 1,
    measurements: { width: "180", height: "90", depth: "—", thickness: "6mm", notes: "" },
    files: {}, orderSent: false, clientApproval: null,
    auditLog: [{ user: "Sarah Johnson", action: "Medição concluída — enviado pelo Comercial", datetime: "02/05/2026 11:10", type: "release" }],
  },
  {
    id: 3, name: "Sandra Melo",   product: "Box Shower",   receivedAt: "Ontem 16:30",
    status: "approved", companyId: 1,
    measurements: { width: "90", height: "200", depth: "90", thickness: "10mm", notes: "" },
    files: { dxf: "sandra_box.dxf", pdf: "sandra_box.pdf" }, orderSent: true, clientApproval: "approved",
    auditLog: [
      { user: "Sarah Johnson", action: "Medição concluída — enviado pelo Comercial",  datetime: "01/05/2026 16:30", type: "release" },
      { user: "David Park",    action: "Upload DXF: sandra_box.dxf",                 datetime: "01/05/2026 17:10", type: "photo" },
      { user: "David Park",    action: "Upload PDF: sandra_box.pdf",                 datetime: "01/05/2026 17:12", type: "photo" },
      { user: "David Park",    action: "Pedido enviado à fábrica",                   datetime: "01/05/2026 17:20", type: "done" },
      { user: "David Park",    action: "Cliente aprovou — enviado ao Financeiro",    datetime: "02/05/2026 08:00", type: "release" },
    ],
  },
  {
    id: 4, name: "Rafael Torres", product: "Glass Door",   receivedAt: "Ontem 14:00",
    status: "revision", companyId: 1,
    measurements: { width: "80", height: "210", depth: "—", thickness: "8mm", notes: "Batente irregular" },
    files: { dxf: "rafael_door.dxf", pdf: "rafael_door.pdf" }, orderSent: false, clientApproval: "revision",
    revisionNote: "Cliente pediu alteração na dobradiça",
    auditLog: [
      { user: "Sarah Johnson", action: "Medição concluída — enviado pelo Comercial", datetime: "01/05/2026 14:00", type: "release" },
      { user: "David Park",    action: "Upload DXF + PDF realizados",                datetime: "01/05/2026 15:30", type: "photo" },
      { user: "David Park",    action: "Crash: Revisão — Cliente pediu alteração na dobradiça", datetime: "02/05/2026 09:00", type: "crash" },
    ],
  },
];

const crashReasons = [
  "Cliente não aprovou o desenho",
  "Medidas inconsistentes",
  "Produto fora de linha",
  "Aguardando material especial",
  "Revisão solicitada pelo cliente",
  "Outro",
];

const statusStyle = {
  pending:  { bg: "#FFF3CD", text: "#856404",  label: "Aguardando",   border: "#F0C030" },
  wip:      { bg: "#E8E4FF", text: "#4A3FA0",  label: "Em andamento", border: "#7F77DD" },
  approved: { bg: "#D5F5E3", text: "#1E8449",  label: "Aprovado",     border: "#1D9E75" },
  revision: { bg: "#FDECEA", text: "#C0392B",  label: "Revisão",      border: "#E53935" },
};

const auditTypeStyle = {
  release: { color: "#3B7DD8", icon: "🔓" },
  done:    { color: "#1D9E75", icon: "✅" },
  crash:   { color: "#E53935", icon: "⚠️" },
  photo:   { color: "#7F77DD", icon: "📷" },
};

function nowStr() {
  return new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProjetoDashboard({ currentUser = MOCK_USER }) {
  const [items,       setItems]       = useState(queue);
  const [activeCard,  setActiveCard]  = useState(null);
  const [modal,       setModal]       = useState(null);
  const [crashReason, setCrashReason] = useState("");
  const [revNote,     setRevNote]     = useState("");
  const dxfRef = useRef();
  const pdfRef = useRef();

  const item = modal?.itemId ? items.find(i => i.id === modal.itemId) : null;

  const counts = {
    total:    items.length,
    pending:  items.filter(i => i.status === "pending" || i.status === "wip").length,
    approved: items.filter(i => i.status === "approved").length,
    revision: items.filter(i => i.status === "revision").length,
  };

  function addAudit(itemId, action, type) {
    const entry = { user: currentUser.name, action, datetime: nowStr(), type };
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, auditLog: [...(i.auditLog || []), entry] }));
  }

  function uploadFile(itemId, type, file) {
    if (!file) return;
    addAudit(itemId, `Upload ${type.toUpperCase()}: ${file.name}`, "photo");
    setItems(prev => prev.map(i => i.id !== itemId ? i : {
      ...i, files: { ...i.files, [type]: file.name },
      status: i.status === "pending" ? "wip" : i.status,
    }));
  }

  function sendOrder(itemId) {
    addAudit(itemId, "Pedido enviado à fábrica", "done");
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, orderSent: true }));
  }

  function markApproved(itemId) {
    addAudit(itemId, "Cliente aprovou — enviado ao Financeiro", "release");
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, status: "approved", clientApproval: "approved" }));
    setModal(null);
  }

  function markRevision(itemId) {
    if (!crashReason) return;
    const note = revNote || crashReason;
    addAudit(itemId, `Crash: Revisão — ${note}`, "crash");
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, status: "revision", clientApproval: "revision", revisionNote: note }));
    setModal(null);
    setCrashReason("");
    setRevNote("");
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #E0E0E0", borderRadius: 10, padding: "10px 12px", fontSize: 13, background: "#FAFAFA", outline: "none", fontFamily: "inherit" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F7F6F3", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <img src={LOGO} alt="CC Shower Door" style={{ height: 32, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7F77DD" }}>PROJETO</div>
            <div style={{ fontSize: 10, color: "#AAA" }}>{currentUser.companyName}</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7F77DD", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{currentUser.name.charAt(0)}</div>
        </div>
      </div>

      <div style={{ padding: "16px 14px", maxWidth: 600, margin: "0 auto", paddingBottom: 90 }}>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>{today} · {currentUser.name}</div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total",     value: counts.total,    color: "#1A1A1A", alert: false },
            { label: "Pendentes", value: counts.pending,  color: "#856404", alert: false },
            { label: "Aprovados", value: counts.approved, color: "#1D9E75", alert: false },
            { label: "Revisão",   value: counts.revision, color: "#C0392B", alert: counts.revision > 0 },
          ].map((s, i) => (
            <div key={i} style={{ background: s.alert ? "#FEF2F2" : "#fff", border: s.alert ? "1px solid #FECACA" : "1px solid #EBEBEB", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: s.alert ? "#B91C1C" : "#999", fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Fila de fichas técnicas</div>

        {items.map((v) => {
          const st = statusStyle[v.status];
          const open = activeCard === v.id;
          const hasDxf = !!v.files?.dxf;
          const hasPdf = !!v.files?.pdf;
          const canSendOrder = hasDxf && hasPdf && !v.orderSent;
          const canApprove   = v.orderSent && v.clientApproval === null;

          return (
            <div key={v.id} style={{ background: "#fff", border: `1px solid ${v.status === "revision" ? "#FECACA" : "#EBEBEB"}`, borderLeft: `4px solid ${st.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>

              {/* Header */}
              <div onClick={() => setActiveCard(open ? null : v.id)} style={{ padding: "13px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{v.product} · {v.receivedAt}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[{ label: "L", value: v.measurements.width, unit: "cm" }, { label: "A", value: v.measurements.height, unit: "cm" }, { label: "P", value: v.measurements.depth, unit: "cm" }, { label: "E", value: v.measurements.thickness, unit: "" }]
                      .filter(m => m.value && m.value !== "—").map(m => (
                        <span key={m.label} style={{ background: "#E8E4FF", color: "#4A3FA0", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{m.label}: {m.value}{m.unit}</span>
                    ))}
                  </div>
                  {v.status === "revision" && v.revisionNote && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 5 }}>⚠ {v.revisionNote}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 10, flexShrink: 0 }}>
                  <span style={{ background: st.bg, color: st.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{st.label}</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    {hasDxf && <span style={{ fontSize: 9, background: "#E8E4FF", color: "#7F77DD", padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>DXF</span>}
                    {hasPdf && <span style={{ fontSize: 9, background: "#FFF3CD", color: "#856404", padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>PDF</span>}
                    {v.orderSent && <span style={{ fontSize: 9, background: "#D5F5E3", color: "#1E8449", padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>PEDIDO</span>}
                  </div>
                  <span style={{ fontSize: 14, color: "#CCC" }}>{open ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded */}
              {open && (
                <div style={{ borderTop: "1px solid #F5F5F5", padding: "14px", background: "#FAFAFA" }}>

                  {/* Ficha técnica */}
                  <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "12px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7F77DD", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>📐 Ficha técnica</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: v.measurements.notes ? 10 : 0 }}>
                      {[{ label: "Largura", value: `${v.measurements.width} cm` }, { label: "Altura", value: `${v.measurements.height} cm` }, { label: "Profundidade", value: `${v.measurements.depth}${v.measurements.depth !== "—" ? " cm" : ""}` }, { label: "Espessura", value: v.measurements.thickness }].map(f => (
                        <div key={f.label} style={{ background: "#F7F6F3", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: "#AAA", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    {v.measurements.notes && <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#856404", marginTop: 8 }}>⚠ <strong>Obs:</strong> {v.measurements.notes}</div>}
                  </div>

                  {/* Uploads */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Desenho técnico</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { type: "dxf", ref: dxfRef, label: "DXF", accept: ".dxf,.dwg", has: hasDxf, filename: v.files?.dxf, bg: "#EEEEFF", color: "#4A3FA0", sub: "CNC ready" },
                        { type: "pdf", ref: pdfRef, label: "PDF", accept: ".pdf",       has: hasPdf, filename: v.files?.pdf, bg: "#FFF8E1", color: "#856404", sub: "Visualização" },
                      ].map(f => (
                        <div key={f.type}>
                          <div style={{ fontSize: 10, color: "#AAA", fontWeight: 600, marginBottom: 5 }}>Arquivo {f.label}</div>
                          {f.has ? (
                            <div style={{ background: f.bg, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 16 }}>📄</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: f.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</div>
                                <div style={{ fontSize: 9, color: f.color }}>{f.sub}</div>
                              </div>
                              <button onClick={() => setItems(prev => prev.map(i => i.id !== v.id ? i : { ...i, files: { ...i.files, [f.type]: null } }))}
                                style={{ background: "none", border: "none", color: "#C0C0D0", fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { f.ref.current.dataset.itemid = v.id; f.ref.current.click(); }}
                              style={{ width: "100%", border: "2px dashed #D0D0D0", borderRadius: 10, background: "#FAFAFA", padding: "14px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 20 }}>⬆️</span>
                              <span style={{ fontSize: 10, color: "#AAA", fontWeight: 600 }}>Upload {f.label}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Send order */}
                  {!v.orderSent && (
                    <button onClick={() => canSendOrder && sendOrder(v.id)} disabled={!canSendOrder}
                      style={{ width: "100%", marginBottom: 10, background: canSendOrder ? "#7F77DD" : "#F0F0F0", color: canSendOrder ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: canSendOrder ? "pointer" : "default", transition: "all 0.2s" }}>
                      {canSendOrder ? "📦 Enviar pedido para a fábrica" : "⬆️ Faça upload do DXF e PDF para continuar"}
                    </button>
                  )}
                  {v.orderSent && <div style={{ background: "#EEEEFF", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4A3FA0", fontWeight: 600 }}>✅ Pedido enviado à fábrica</div>}

                  {canApprove && (
                    <button onClick={() => setModal({ type: "approval", itemId: v.id })} style={{ width: "100%", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
                      ✓ Registrar resposta do cliente
                    </button>
                  )}
                  {v.status === "approved" && <div style={{ background: "#D5F5E3", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#1E8449", fontWeight: 600, marginBottom: 14 }}>✅ Aprovado — enviado ao Financeiro</div>}
                  {v.status === "revision" && <div style={{ background: "#FDECEA", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#C0392B", fontWeight: 600, marginBottom: 14 }}>⚠ Em revisão: {v.revisionNote}</div>}

                  {/* Audit log */}
                  {(v.auditLog || []).length > 0 && (
                    <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>🕒 Histórico</div>
                      {v.auditLog.map((entry, idx) => {
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

      {/* Hidden file inputs */}
      <input ref={dxfRef} type="file" accept=".dxf,.dwg" style={{ display: "none" }}
        onChange={e => { uploadFile(parseInt(dxfRef.current.dataset.itemid), "dxf", e.target.files[0]); e.target.value = ""; }}/>
      <input ref={pdfRef} type="file" accept=".pdf" style={{ display: "none" }}
        onChange={e => { uploadFile(parseInt(pdfRef.current.dataset.itemid), "pdf", e.target.files[0]); e.target.value = ""; }}/>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 100 }}>
        {[["📋","Fila"],["✅","Aprovados"],["⚠","Revisões"],["📊","Histórico"]].map(([icon, label]) => (
          <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: label === "Fila" ? "#7F77DD" : "#AAA", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MODAL — Resposta cliente */}
      {modal?.type === "approval" && item && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 16px" }}/>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>Resposta do cliente</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{item.name} — {item.product}</div>
            <div style={{ background: "#F7F6F3", borderRadius: 10, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#888" }}>
              🕒 Será registrado: <strong>{currentUser.name}</strong> · {nowStr()}
            </div>
            <button onClick={() => markApproved(item.id)} style={{ width: "100%", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
              ✓ Cliente aprovou — enviar ao Financeiro
            </button>
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ou registrar revisão</div>
              <select value={crashReason} onChange={e => setCrashReason(e.target.value)} style={{ ...inputStyle, color: crashReason ? "#1A1A1A" : "#AAA", marginBottom: 8 }}>
                <option value="">Motivo da revisão...</option>
                {crashReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <textarea placeholder="Detalhes adicionais (opcional)..." value={revNote} onChange={e => setRevNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none", marginBottom: 8 }}/>
              <button onClick={() => markRevision(item.id)} disabled={!crashReason} style={{ width: "100%", background: crashReason ? "#E53935" : "#F5F5F5", color: crashReason ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: crashReason ? "pointer" : "default", transition: "all 0.2s" }}>
                ⚠ Registrar revisão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
