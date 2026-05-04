import { useState } from "react";

const today = "Sábado, 02 Mai 2026";

const paymentMethods = ["Dinheiro", "Cartão", "Cheque", "Transferência"];

const initialClients = [
  {
    id: 1, name: "John Smith",    product: "Glass Shower", total: 2800,
    status: "partial", billSent: true, billStatus: "pending",
    released: false,
    payments: [
      { id: 1, method: "Cartão",      amount: 1400, date: "28/04", note: "Entrada 50%" },
    ],
    installments: [
      { id: 1, amount: 1400, due: "15/05", paid: false, note: "Saldo final" },
    ],
  },
  {
    id: 2, name: "Mary Johnson",  product: "Mirror Wall",  total: 1200,
    status: "paid", billSent: true, billStatus: "paid",
    released: true,
    payments: [
      { id: 1, method: "Transferência", amount: 600,  date: "01/05", note: "Entrada 50%" },
      { id: 2, method: "Cartão",        amount: 600,  date: "02/05", note: "Saldo" },
    ],
    installments: [],
  },
  {
    id: 3, name: "Sandra Melo",   product: "Box Shower",   total: 3500,
    status: "pending", billSent: false, billStatus: null,
    released: false,
    payments: [],
    installments: [],
  },
  {
    id: 4, name: "Rafael Torres", product: "Glass Door",   total: 950,
    status: "partial", billSent: true, billStatus: "overdue",
    released: false,
    payments: [
      { id: 1, method: "Dinheiro", amount: 300, date: "25/04", note: "Entrada" },
    ],
    installments: [
      { id: 1, amount: 650, due: "01/05", paid: false, note: "Saldo vencido" },
    ],
  },
];

const statusStyle = {
  paid:    { bg: "#D5F5E3", text: "#1E8449", label: "Pago",     border: "#1D9E75" },
  partial: { bg: "#FFF3CD", text: "#856404", label: "Parcial",  border: "#F0C030" },
  pending: { bg: "#EAF2FF", text: "#1A5276", label: "Pendente", border: "#3B7DD8" },
  overdue: { bg: "#FDECEA", text: "#C0392B", label: "Vencido",  border: "#E53935" },
};

const billStatusStyle = {
  pending: { bg: "#FFF3CD", text: "#856404", label: "Invoice enviado" },
  paid:    { bg: "#D5F5E3", text: "#1E8449", label: "Pago via Bill.com" },
  overdue: { bg: "#FDECEA", text: "#C0392B", label: "Vencido — cobrar" },
};

export default function FinanceiroDashboard() {
  const [clients,    setClients]    = useState(initialClients);
  const [activeCard, setActiveCard] = useState(null);
  const [modal,      setModal]      = useState(null);

  // form states
  const [newPayment,     setNewPayment]     = useState({ method: "Dinheiro", amount: "", note: "" });
  const [newInstallment, setNewInstallment] = useState({ amount: "", due: "", note: "" });

  const client = modal?.clientId ? clients.find(c => c.id === modal.clientId) : null;

  function getPaid(c)    { return c.payments.reduce((s, p) => s + p.amount, 0); }
  function getBalance(c) { return c.total - getPaid(c); }
  function getPct(c)     { return Math.round((getPaid(c) / c.total) * 100); }

  function deriveStatus(c) {
    const paid = getPaid(c);
    if (paid === 0)        return "pending";
    if (paid >= c.total)   return "paid";
    const hasOverdue = c.installments.some(i => !i.paid && new Date(i.due.split("/").reverse().join("-")) < new Date());
    if (hasOverdue)        return "overdue";
    return "partial";
  }

  function addPayment(clientId) {
    if (!newPayment.amount) return;
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, payments: [...c.payments, { id: Date.now(), ...newPayment, amount: parseFloat(newPayment.amount), date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) }] };
      return { ...updated, status: deriveStatus(updated) };
    }));
    setNewPayment({ method: "Dinheiro", amount: "", note: "" });
  }

  function addInstallment(clientId) {
    if (!newInstallment.amount || !newInstallment.due) return;
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      installments: [...c.installments, { id: Date.now(), ...newInstallment, amount: parseFloat(newInstallment.amount), paid: false }],
    }));
    setNewInstallment({ amount: "", due: "", note: "" });
  }

  function markInstallmentPaid(clientId, instId) {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, installments: c.installments.map(i => i.id === instId ? { ...i, paid: true } : i) };
      return { ...updated, status: deriveStatus(updated) };
    }));
  }

  function sendBill(clientId) {
    setClients(prev => prev.map(c => c.id !== clientId ? c : { ...c, billSent: true, billStatus: "pending" }));
  }

  const [releaseNote, setReleaseNote] = useState("");

  function releaseInstallation(clientId, note = "") {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c, released: true,
      releaseNote: note || "Pagamento integral confirmado",
      releasedManual: !!note,
    }));
    setReleaseNote("");
    setModal(null);
  }

  const totals = {
    total:    clients.reduce((s, c) => s + c.total, 0),
    received: clients.reduce((s, c) => s + getPaid(c), 0),
    pending:  clients.filter(c => c.status === "pending").length,
    overdue:  clients.filter(c => c.status === "overdue").length,
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #E0E0E0", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "#FAFAFA", outline: "none", fontFamily: "inherit" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" };
  const sectionTitle = (title) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: "#3B7DD8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title}</div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F7F6F3", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>cc<span style={{ color: "#3B7DD8" }}>shower</span></span>
          <span style={{ background: "#EAF2FF", color: "#3B7DD8", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>FINANCEIRO</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#999" }}>{today}</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B7DD8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>F</div>
        </div>
      </div>

      <div style={{ padding: "16px 14px", maxWidth: 600, margin: "0 auto", paddingBottom: 90 }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>Total em carteira</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-1px" }}>${totals.total.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>Recebido</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1D9E75", letterSpacing: "-1px" }}>${totals.received.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>A receber</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#856404", letterSpacing: "-1px" }}>${(totals.total - totals.received).toLocaleString()}</div>
          </div>
          <div style={{ background: totals.overdue > 0 ? "#FEF2F2" : "#fff", border: totals.overdue > 0 ? "1px solid #FECACA" : "1px solid #EBEBEB", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: totals.overdue > 0 ? "#B91C1C" : "#999", fontWeight: 600, marginBottom: 4 }}>Vencidos</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: totals.overdue > 0 ? "#E53935" : "#AAA", letterSpacing: "-1px" }}>{totals.overdue}</div>
          </div>
        </div>

        {/* Client list */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#999", textTransform: "uppercase", marginBottom: 10 }}>
          Conta-corrente por cliente
        </div>

        {clients.map((c) => {
          const st      = statusStyle[c.status] || statusStyle.pending;
          const paid    = getPaid(c);
          const balance = getBalance(c);
          const pct     = getPct(c);
          const open    = activeCard === c.id;
          const canRelease       = balance === 0 && !c.released;
          const canManualRelease = balance > 0  && !c.released;
          const isOverdue  = c.status === "overdue";

          return (
            <div key={c.id} style={{
              background: "#fff",
              border: `1px solid ${isOverdue ? "#FECACA" : "#EBEBEB"}`,
              borderLeft: `4px solid ${st.border}`,
              borderRadius: 12, marginBottom: 10, overflow: "hidden",
            }}>
              {/* Card header */}
              <div onClick={() => setActiveCard(open ? null : c.id)}
                style={{ padding: "13px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{c.product}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                    <span style={{ background: st.bg, color: st.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{st.label}</span>
                    {c.released && <span style={{ background: "#D5F5E3", color: "#1E8449", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>✓ LIBERADO</span>}
                    <span style={{ fontSize: 14, color: "#CCC" }}>{open ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: "#1D9E75", fontWeight: 700 }}>Pago: ${paid.toLocaleString()}</span>
                    <span style={{ color: balance > 0 ? "#856404" : "#AAA", fontWeight: 700 }}>Saldo: ${balance.toLocaleString()}</span>
                    <span style={{ color: "#888" }}>Total: ${c.total.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 6, background: "#F0F0EE", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#1D9E75" : isOverdue ? "#E53935" : "#3B7DD8", borderRadius: 10, transition: "width 0.3s" }}/>
                  </div>
                  <div style={{ fontSize: 10, color: "#AAA", marginTop: 3, textAlign: "right" }}>{pct}% pago</div>
                </div>

                {/* Bill.com status */}
                {c.billSent && c.billStatus && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: billStatusStyle[c.billStatus]?.bg, padding: "3px 9px", borderRadius: 20 }}>
                    <span style={{ fontSize: 9 }}>●</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: billStatusStyle[c.billStatus]?.text }}>Bill.com: {billStatusStyle[c.billStatus]?.label}</span>
                  </div>
                )}
              </div>

              {/* Expanded */}
              {open && (
                <div style={{ borderTop: "1px solid #F5F5F5", padding: "14px", background: "#FAFAFA" }}>

                  {/* Payments received */}
                  <div style={{ marginBottom: 16 }}>
                    {sectionTitle("💰 Pagamentos recebidos")}
                    {c.payments.length === 0 && (
                      <div style={{ fontSize: 12, color: "#BBB", marginBottom: 10 }}>Nenhum pagamento ainda</div>
                    )}
                    {c.payments.map(p => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, padding: "9px 12px", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{p.method} — {p.note}</div>
                          <div style={{ fontSize: 11, color: "#AAA" }}>{p.date}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1D9E75" }}>+${p.amount.toLocaleString()}</div>
                      </div>
                    ))}

                    {/* Add payment */}
                    <div style={{ background: "#fff", border: "1px dashed #D0D0D0", borderRadius: 10, padding: "12px", marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>+ Registrar pagamento</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={labelStyle}>Forma</label>
                          <select value={newPayment.method} onChange={e => setNewPayment(p => ({ ...p, method: e.target.value }))} style={inputStyle}>
                            {paymentMethods.map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Valor ($)</label>
                          <input type="number" placeholder="0.00" value={newPayment.amount}
                            onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} style={inputStyle}/>
                        </div>
                      </div>
                      <input type="text" placeholder="Observação (ex: entrada 50%)" value={newPayment.note}
                        onChange={e => setNewPayment(p => ({ ...p, note: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }}/>
                      <button onClick={() => addPayment(c.id)} disabled={!newPayment.amount}
                        style={{ width: "100%", background: newPayment.amount ? "#3B7DD8" : "#F0F0F0", color: newPayment.amount ? "#fff" : "#BBB", border: "none", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: newPayment.amount ? "pointer" : "default" }}>
                        Registrar
                      </button>
                    </div>
                  </div>

                  {/* Installments */}
                  <div style={{ marginBottom: 16 }}>
                    {sectionTitle("📅 Parcelas a receber")}
                    {c.installments.length === 0 && (
                      <div style={{ fontSize: 12, color: "#BBB", marginBottom: 10 }}>Nenhuma parcela cadastrada</div>
                    )}
                    {c.installments.map(inst => (
                      <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: inst.paid ? "#F7FFF9" : "#fff", border: `1px solid ${inst.paid ? "#B7EFC5" : "#EBEBEB"}`, borderRadius: 10, padding: "9px 12px", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: inst.paid ? "#1E8449" : "#1A1A1A" }}>{inst.note} — vence {inst.due}</div>
                          <div style={{ fontSize: 11, color: "#AAA" }}>${inst.amount.toLocaleString()}</div>
                        </div>
                        {inst.paid
                          ? <span style={{ fontSize: 12, color: "#1D9E75", fontWeight: 700 }}>✓ Pago</span>
                          : <button onClick={() => markInstallmentPaid(c.id, inst.id)} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Marcar pago</button>
                        }
                      </div>
                    ))}

                    {/* Add installment */}
                    <div style={{ background: "#fff", border: "1px dashed #D0D0D0", borderRadius: 10, padding: "12px", marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>+ Adicionar parcela</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={labelStyle}>Valor ($)</label>
                          <input type="number" placeholder="0.00" value={newInstallment.amount}
                            onChange={e => setNewInstallment(i => ({ ...i, amount: e.target.value }))} style={inputStyle}/>
                        </div>
                        <div>
                          <label style={labelStyle}>Vencimento</label>
                          <input type="date" value={newInstallment.due}
                            onChange={e => setNewInstallment(i => ({ ...i, due: e.target.value }))} style={inputStyle}/>
                        </div>
                      </div>
                      <input type="text" placeholder="Descrição (ex: saldo final)" value={newInstallment.note}
                        onChange={e => setNewInstallment(i => ({ ...i, note: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }}/>
                      <button onClick={() => addInstallment(c.id)} disabled={!newInstallment.amount || !newInstallment.due}
                        style={{ width: "100%", background: newInstallment.amount && newInstallment.due ? "#3B7DD8" : "#F0F0F0", color: newInstallment.amount && newInstallment.due ? "#fff" : "#BBB", border: "none", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Adicionar parcela
                      </button>
                    </div>
                  </div>

                  {/* Bill.com */}
                  <div style={{ marginBottom: 16 }}>
                    {sectionTitle("🧾 Bill.com")}
                    {!c.billSent ? (
                      <button onClick={() => sendBill(c.id)} style={{ width: "100%", background: "#1A5276", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        📤 Gerar e enviar invoice via Bill.com
                      </button>
                    ) : (
                      <div style={{ background: billStatusStyle[c.billStatus]?.bg, border: "1px solid #E0E0E0", borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: billStatusStyle[c.billStatus]?.text, marginBottom: 2 }}>
                          {billStatusStyle[c.billStatus]?.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#AAA" }}>Invoice enviado • aguardando webhook de confirmação</div>
                      </div>
                    )}
                  </div>

                  {/* Release installation */}
                  {canRelease && (
                    <button onClick={() => setModal({ type: "release", clientId: c.id })}
                      style={{ width: "100%", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px #1D9E7530", marginBottom: 8 }}>
                      ✓ Pagamento completo — Liberar instalação
                    </button>
                  )}
                  {canManualRelease && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#856404", fontWeight: 600, marginBottom: 8 }}>
                        ⚠ Saldo de ${balance.toLocaleString()} pendente
                      </div>
                      <button onClick={() => setModal({ type: "manual-release", clientId: c.id })}
                        style={{ width: "100%", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        ⚡ Liberar mesmo assim (decisão gerencial)
                      </button>
                    </div>
                  )}
                  {c.released && (
                    <div style={{ borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "center", background: c.releasedManual ? "#FFF8E1" : "#D5F5E3", color: c.releasedManual ? "#856404" : "#1E8449", border: c.releasedManual ? "1px solid #FFE082" : "none" }}>
                      {c.releasedManual ? `⚡ Liberação manual — ${c.releaseNote}` : "✓ Instalação liberada — SMS enviado à Montagem"}
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 100 }}>
        {[["💰","Contas"],["📤","Invoices"],["📅","Parcelas"],["📊","Relatório"]].map(([icon, label]) => (
          <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: label === "Contas" ? "#3B7DD8" : "#AAA", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MODAL — Liberar instalação (manual) */}
      {modal?.type === "manual-release" && client && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && (setModal(null), setReleaseNote(""))}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }}/>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Liberação gerencial</div>
              <div style={{ fontSize: 13, color: "#888" }}>{client.name} — {client.product}</div>
            </div>

            {/* Balance warning */}
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", marginBottom: 2 }}>⚠ Saldo pendente: ${getBalance(client).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#C0392B" }}>Você está liberando a instalação sem pagamento integral. Isso ficará registrado.</div>
            </div>

            {/* Justification — required */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, color: "#B91C1C" }}>Justificativa obrigatória</label>
              <textarea
                placeholder="Ex: cliente pagará o saldo na entrega, autorizado pelo gerente João..."
                value={releaseNote}
                onChange={e => setReleaseNote(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "none", border: releaseNote ? "1px solid #F59E0B" : "1px solid #FECACA" }}
              />
            </div>

            <button onClick={() => releaseInstallation(client.id, releaseNote)} disabled={!releaseNote.trim()}
              style={{ width: "100%", background: releaseNote.trim() ? "#F59E0B" : "#F0F0F0", color: releaseNote.trim() ? "#fff" : "#BBB", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 800, cursor: releaseNote.trim() ? "pointer" : "default", marginBottom: 10, transition: "all 0.2s" }}>
              ⚡ Confirmar liberação + SMS Montagem
            </button>
            <button onClick={() => { setModal(null); setReleaseNote(""); }}
              style={{ width: "100%", background: "transparent", border: "none", color: "#AAA", fontSize: 13, cursor: "pointer", padding: "8px" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}


      {modal?.type === "release" && client && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }}/>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Liberar instalação</div>
              <div style={{ fontSize: 13, color: "#888" }}>{client.name} — {client.product}</div>
            </div>
            <div style={{ background: "#F7F6F3", borderRadius: 12, padding: "14px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#888" }}>Total do projeto</span>
                <span style={{ fontWeight: 700 }}>${client.total.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#888" }}>Total recebido</span>
                <span style={{ fontWeight: 700, color: "#1D9E75" }}>${getPaid(client).toLocaleString()}</span>
              </div>
              <div style={{ height: 1, background: "#E0E0E0", margin: "8px 0" }}/>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Saldo</span>
                <span style={{ fontWeight: 800, color: getBalance(client) === 0 ? "#1D9E75" : "#E53935" }}>${getBalance(client).toLocaleString()}</span>
              </div>
            </div>
            <button onClick={() => releaseInstallation(client.id, "")} style={{ width: "100%", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
              ✓ Confirmar liberação + SMS Montagem
            </button>
            <button onClick={() => setModal(null)} style={{ width: "100%", background: "transparent", border: "none", color: "#AAA", fontSize: 13, cursor: "pointer", padding: "8px" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
