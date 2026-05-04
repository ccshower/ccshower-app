import { useState, useEffect } from "react";

// ── MOCK DATA ────────────────────────────────────────────────────────────────
const COMPANIES = [
  { id: 1, name: "Springfield", fullName: "CC Shower — Springfield" },
  { id: 2, name: "Shelbyville", fullName: "CC Shower — Shelbyville" },
];

const crashes = [
  { id: 1, client: "João Silva",      dept: "Montagem",   reason: "Vidro quebrado",       companyId: 1, auditLog: [{ user: "Carlos M.", action: "Crash registrado: Vidro quebrado", datetime: "02/05/2026 16:10", type: "crash" }] },
  { id: 2, client: "Maria Souza",     dept: "Financeiro", reason: "Pagamento pendente",    companyId: 1, auditLog: [{ user: "Ana R.",    action: "Crash registrado: Pagamento pendente", datetime: "02/05/2026 09:30", type: "crash" }] },
  { id: 3, client: "Carlos Oliveira", dept: "Comercial",  reason: "Cliente pediu espera",  companyId: 2, auditLog: [{ user: "Lisa W.",   action: "Crash registrado: Cliente pediu espera", datetime: "01/05/2026 14:20", type: "crash" }] },
];

const allClients = [
  { id: 1, name: "João Silva",      product: "Glass Shower", phase: "Installation", status: "Issue",    dept: "Montagem",   deptColor: "#E8604C", companyId: 1 },
  { id: 2, name: "Maria Souza",     product: "Mirror",       phase: "Project",      status: "Pending",  dept: "Financeiro", deptColor: "#3B7DD8", companyId: 1 },
  { id: 3, name: "Carlos Oliveira", product: "Door",         phase: "Installation", status: "OK",       dept: "Montagem",   deptColor: "#E8604C", companyId: 1 },
  { id: 4, name: "Ana Lima",        product: "Glass Shower", phase: "Capture",      status: "Received", dept: "Comercial",  deptColor: "#1D9E75", companyId: 1 },
  { id: 5, name: "Bruno Costa",     product: "Mirror",       phase: "Finished",     status: "OK",       dept: "Projeto",    deptColor: "#7F77DD", companyId: 1 },
  { id: 6, name: "Sandra Melo",     product: "Box Shower",   phase: "Financial",    status: "Pending",  dept: "Financeiro", deptColor: "#3B7DD8", companyId: 2 },
  { id: 7, name: "Rafael Torres",   product: "Glass Door",   phase: "Project",      status: "OK",       dept: "Projeto",    deptColor: "#7F77DD", companyId: 2 },
  { id: 8, name: "Patricia Lee",    product: "Mirror Wall",  phase: "Capture",      status: "Received", dept: "Comercial",  deptColor: "#1D9E75", companyId: 2 },
];

const phaseColors = {
  Capture:      { bg: "#FFF3CD", text: "#856404" },
  Project:      { bg: "#E8E4FF", text: "#4A3FA0" },
  Financial:    { bg: "#D6EAF8", text: "#1A5276" },
  Installation: { bg: "#FDECEA", text: "#922B21" },
  Finished:     { bg: "#D5F5E3", text: "#1E8449" },
};
const statusColors = {
  Issue:    { bg: "#FDECEA", text: "#C0392B" },
  Pending:  { bg: "#FEF9E7", text: "#9A7D0A" },
  OK:       { bg: "#EAFAF1", text: "#1E8449" },
  Received: { bg: "#EAF2FF", text: "#1A5276" },
};
const auditTypeStyle = {
  release: { color: "#3B7DD8", icon: "🔓" },
  done:    { color: "#1D9E75", icon: "✅" },
  crash:   { color: "#E53935", icon: "⚠️" },
  photo:   { color: "#7F77DD", icon: "📷" },
};

const deptFilters = ["Todos", "Comercial", "Projeto", "Financeiro", "Montagem"];
const phaseOrder  = ["Capture", "Project", "Financial", "Installation", "Finished"];

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function AdminDashboard({ currentUser }) {
  // currentUser = { role: "admin"|"superadmin", activeCompanyId: 1|null, globalView: bool }
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isGlobal     = isSuperAdmin && currentUser?.globalView;

  const [selectedCompany, setSelectedCompany] = useState(
    isGlobal ? "all" : String(currentUser?.activeCompanyId || 1)
  );
  const [filter,       setFilter]       = useState("Todos");
  const [month,        setMonth]        = useState("Maio 2026");
  const [crashOpen,    setCrashOpen]    = useState(true);
  const [search,       setSearch]       = useState("");
  const [auditModal,   setAuditModal]   = useState(null); // crash obj
  const [isDesktop,    setIsDesktop]    = useState(window.innerWidth >= 700);

  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 700);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── filter by company ──
  const companyId = selectedCompany === "all" ? null : parseInt(selectedCompany);

  const clients = companyId
    ? allClients.filter(c => c.companyId === companyId)
    : allClients;

  const visibleCrashes = companyId
    ? crashes.filter(c => c.companyId === companyId)
    : crashes;

  const filtered = clients.filter(c => {
    const matchDept   = filter === "Todos" || c.dept === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.product.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  const stats = [
    { label: "Este mês",     value: clients.length,                                    icon: "◈", alert: false },
    { label: "Crashes",      value: visibleCrashes.length,                             icon: "⚠", alert: visibleCrashes.length > 0 },
    { label: "Em andamento", value: clients.filter(c => c.phase !== "Finished").length, icon: "◉", alert: false },
    { label: "Concluídos",   value: clients.filter(c => c.phase === "Finished").length, icon: "◎", alert: false },
  ];

  const Badge = ({ bg, text, children }) => (
    <span style={{ background: bg, color: text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, display: "inline-block", whiteSpace: "nowrap" }}>{children}</span>
  );

  const CompanyBadge = ({ companyId }) => {
    if (selectedCompany !== "all") return null;
    const c = COMPANIES.find(c => c.id === companyId);
    return <span style={{ background: "#F0F0EE", color: "#888", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, marginLeft: 4 }}>{c?.name}</span>;
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F7F6F3", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>cc<span style={{ color: "#E8604C" }}>shower</span></span>
          <span style={{ background: "#F0F0EE", color: "#888", fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>
            {isSuperAdmin ? "SUPER ADMIN" : "ADMIN"}
          </span>
        </div>

        {/* Company selector — superadmin only */}
        {isSuperAdmin && (
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            style={{ border: "1px solid #E0E0E0", borderRadius: 8, padding: "5px 10px", fontSize: 12, background: "#fff", outline: "none", fontWeight: 600, color: selectedCompany === "all" ? "#E8604C" : "#1A1A1A" }}
          >
            <option value="all">🌐 Todas as filiais</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        )}

        {/* Nav desktop */}
        {isDesktop && !isSuperAdmin && (
          <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
            {["Dashboard","Clientes","Estoque","Financeiro","Config"].map(item => (
              <span key={item} style={{ cursor: "pointer", color: item === "Dashboard" ? "#1A1A1A" : "#888", fontWeight: item === "Dashboard" ? 600 : 400, paddingBottom: 2, borderBottom: item === "Dashboard" ? "2px solid #E8604C" : "2px solid transparent" }}>{item}</span>
            ))}
          </div>
        )}

        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8604C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>A</div>
      </div>

      {/* Global view banner */}
      {selectedCompany === "all" && (
        <div style={{ background: "#1A1A1A", color: "#fff", padding: "8px 16px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🌐</span>
          <span>Visão global — todas as filiais · {allClients.length} projetos · ${(245000).toLocaleString()} em carteira</span>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {!isDesktop && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 100 }}>
          {[["⊞","Dashboard"],["👤","Clientes"],["📦","Estoque"],["💰","Financeiro"],["⚙","Config"]].map(([icon, label]) => (
            <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: label === "Dashboard" ? "#E8604C" : "#AAA", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <div style={{ padding: isDesktop ? "24px 32px" : "16px 14px", maxWidth: 1100, margin: "0 auto", paddingBottom: isDesktop ? 24 : 80 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#999", textTransform: "uppercase", marginBottom: 2 }}>Operations</div>
            <h1 style={{ fontSize: isDesktop ? 26 : 20, fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>
              Installation Dashboard
              {selectedCompany !== "all" && <span style={{ fontSize: 13, fontWeight: 500, color: "#AAA", marginLeft: 10 }}>{COMPANIES.find(c => c.id === parseInt(selectedCompany))?.name}</span>}
            </h1>
          </div>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ border: "1px solid #E0E0E0", borderRadius: 8, padding: "6px 10px", fontSize: 12, background: "#fff", outline: "none" }}>
            {["Março 2026","Abril 2026","Maio 2026","Junho 2026"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Crash banner */}
        {crashOpen && visibleCrashes.length > 0 && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderLeft: "4px solid #E53935", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 8, flex: 1 }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#B91C1C", marginBottom: 6 }}>
                    {visibleCrashes.length} crashes precisam de atenção
                  </div>
                  {visibleCrashes.map(c => (
                    <div key={c.id} style={{ fontSize: 12, color: "#7F1D1D", marginBottom: 4, display: "flex", gap: 5, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E53935", display: "inline-block", marginTop: 4, flexShrink: 0 }}/>
                      <span style={{ flex: 1 }}>
                        <strong>{c.client}</strong> — [{c.dept}] {c.reason}
                        {selectedCompany === "all" && <CompanyBadge companyId={c.companyId} />}
                      </span>
                      {/* Audit trail inline */}
                      <button onClick={() => setAuditModal(c)} style={{ background: "transparent", border: "1px solid #FECACA", borderRadius: 6, padding: "1px 8px", fontSize: 10, color: "#C0392B", cursor: "pointer", flexShrink: 0 }}>
                        🕒 Ver log
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setCrashOpen(false)} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#B91C1C", padding: "0 0 0 8px" }}>✕</button>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4,1fr)" : "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: s.alert ? "#FEF2F2" : "#fff", border: s.alert ? "1px solid #FECACA" : "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: s.alert ? "#B91C1C" : "#888", fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 16, color: s.alert ? "#E53935" : "#CCC" }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.alert ? "#E53935" : "#1A1A1A", letterSpacing: "-1px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Global consolidation (superadmin all) */}
        {selectedCompany === "all" && (
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(2,1fr)" : "1fr", gap: 10, marginBottom: 16 }}>
            {COMPANIES.map(co => {
              const coClients  = allClients.filter(c => c.companyId === co.id);
              const coCrashes  = crashes.filter(c => c.companyId === co.id);
              const coDone     = coClients.filter(c => c.phase === "Finished").length;
              return (
                <div key={co.id} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🏢 {co.fullName}</div>
                    <button onClick={() => setSelectedCompany(String(co.id))} style={{ background: "#F5F5F5", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                      Ver detalhes →
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { label: "Projetos", value: coClients.length, color: "#1A1A1A" },
                      { label: "Crashes",  value: coCrashes.length, color: coCrashes.length ? "#E53935" : "#AAA" },
                      { label: "Prontos",  value: coDone,           color: "#1D9E75" },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "#F7F6F3", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#AAA", fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Client Queue */}
        <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0F0F0" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Fila de trabalho</div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>
              {selectedCompany === "all" ? "Todas as filiais" : COMPANIES.find(c => c.id === parseInt(selectedCompany))?.fullName} • {month}
            </div>
            <input placeholder="Buscar cliente ou produto..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E0E0E0", borderRadius: 8, padding: "8px 12px", fontSize: 13, background: "#FAFAFA", outline: "none", marginBottom: 10 }}/>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {deptFilters.map(d => (
                <button key={d} onClick={() => setFilter(d)} style={{ background: filter === d ? "#1A1A1A" : "#F5F5F5", color: filter === d ? "#fff" : "#666", border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{d}</button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          {isDesktop && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: selectedCompany === "all" ? "1.6fr 1.1fr 1fr 1.1fr 1fr 0.8fr 0.6fr" : "1.8fr 1.2fr 1fr 1.3fr 1fr 0.7fr", padding: "9px 16px", background: "#FAFAFA", borderBottom: "1px solid #F0F0F0", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                <span>Cliente</span><span>Produto</span><span>Fase</span><span>Departamento</span><span>Status</span>
                {selectedCompany === "all" && <span>Filial</span>}
                <span style={{ textAlign: "right" }}>Ação</span>
              </div>
              {filtered.map((c, i) => {
                const ph = phaseColors[c.phase] || { bg: "#F5F5F5", text: "#555" };
                const st = statusColors[c.status] || { bg: "#F5F5F5", text: "#555" };
                const cols = selectedCompany === "all" ? "1.6fr 1.1fr 1fr 1.1fr 1fr 0.8fr 0.6fr" : "1.8fr 1.2fr 1fr 1.3fr 1fr 0.7fr";
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: cols, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #F7F7F7" : "none", alignItems: "center", cursor: "pointer", background: c.status === "Issue" ? "#FFFAFA" : "#fff" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                    onMouseLeave={e => e.currentTarget.style.background = c.status === "Issue" ? "#FFFAFA" : "#fff"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {c.status === "Issue" && <span style={{ fontSize: 12 }}>⚠️</span>}
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#666" }}>{c.product}</span>
                    <Badge bg={ph.bg} text={ph.text}>{c.phase}</Badge>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.deptColor, display: "inline-block" }}/>
                      <span style={{ fontSize: 12, color: "#555" }}>{c.dept}</span>
                    </div>
                    <Badge bg={st.bg} text={st.text}>{c.status}</Badge>
                    {selectedCompany === "all" && <span style={{ fontSize: 10, color: "#888" }}>{COMPANIES.find(co => co.id === c.companyId)?.name}</span>}
                    <div style={{ textAlign: "right" }}>
                      <button style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                        {c.phase === "Finished" ? "Ver" : "Update"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Mobile cards */}
          {!isDesktop && (
            <div>
              {filtered.map((c, i) => {
                const ph = phaseColors[c.phase] || { bg: "#F5F5F5", text: "#555" };
                const st = statusColors[c.status] || { bg: "#F5F5F5", text: "#555" };
                const isIssue = c.status === "Issue";
                return (
                  <div key={c.id} style={{ padding: "13px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #F2F2F2" : "none", background: isIssue ? "#FFFAFA" : "#fff", borderLeft: isIssue ? "3px solid #E53935" : "3px solid transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {isIssue && <span style={{ fontSize: 13 }}>⚠️</span>}
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                        {selectedCompany === "all" && <CompanyBadge companyId={c.companyId} />}
                      </div>
                      <button style={{ background: isIssue ? "#E53935" : "transparent", border: isIssue ? "none" : "1px solid #E0E0E0", color: isIssue ? "#fff" : "#555", borderRadius: 6, padding: "5px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {c.phase === "Finished" ? "Ver" : "Update"}
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: "#888" }}>{c.product}</span>
                      <span style={{ color: "#DDD" }}>·</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.deptColor, display: "inline-block" }}/>
                        <span style={{ fontSize: 12, color: "#555" }}>{c.dept}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge bg={ph.bg} text={ph.text}>{c.phase}</Badge>
                      <Badge bg={st.bg} text={st.text}>{c.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#BBB", fontSize: 13 }}>Nenhum cliente encontrado</div>
          )}
        </div>

        {/* Pipeline */}
        <div>
          <div style={{ fontSize: 10, color: "#999", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Pipeline geral</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {phaseOrder.map((phase, i) => {
              const count = clients.filter(c => c.phase === phase).length;
              const ph    = phaseColors[phase];
              return (
                <div key={phase} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ background: ph.bg, border: `1px solid ${ph.text}33`, borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 68 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: ph.text }}>{count}</div>
                    <div style={{ fontSize: 9, color: ph.text, fontWeight: 700, marginTop: 2 }}>{phase}</div>
                  </div>
                  {i < phaseOrder.length - 1 && <span style={{ color: "#CCC", fontSize: 14 }}>→</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL — Audit log do crash */}
      {auditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setAuditModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 16px" }}/>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>Histórico de auditoria</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              {auditModal.client} — [{auditModal.dept}]
              {selectedCompany === "all" && <span style={{ marginLeft: 6, background: "#F0F0EE", color: "#888", fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>{COMPANIES.find(c => c.id === auditModal.companyId)?.name}</span>}
            </div>
            {(auditModal.auditLog || []).map((entry, idx) => {
              const style = auditTypeStyle[entry.type] || { color: "#888", icon: "•" };
              return (
                <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>{style.icon}</span>
                    {idx < auditModal.auditLog.length - 1 && <div style={{ width: 1, height: 16, background: "#E0E0E0", margin: "2px 0" }}/>}
                  </div>
                  <div style={{ flex: 1, background: "#F7F6F3", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: style.color }}>{entry.action}</div>
                    <div style={{ fontSize: 10, color: "#AAA", marginTop: 2 }}>👤 {entry.user} • 🕒 {entry.datetime}</div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setAuditModal(null)} style={{ width: "100%", marginTop: 8, background: "#F5F5F5", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 600, color: "#888", cursor: "pointer" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
