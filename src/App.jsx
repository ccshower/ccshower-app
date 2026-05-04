import { useState } from "react";

import Comercial from "./pages/Comercial";
import Projeto from "./pages/Projeto";
import Financeiro from "./pages/Financeiro";
import Montagem from "./pages/Montagem";
import Admin from "./pages/Admin";

export default function App() {
  const [page, setPage] = useState("comercial");

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 8,
        padding: 10,
        background: "#111",
        color: "#fff"
      }}>
        <button onClick={() => setPage("comercial")}>Comercial</button>
        <button onClick={() => setPage("projeto")}>Projeto</button>
        <button onClick={() => setPage("financeiro")}>Financeiro</button>
        <button onClick={() => setPage("montagem")}>Montagem</button>
        <button onClick={() => setPage("admin")}>Admin</button>
      </div>

      {page === "comercial" && <Comercial />}
      {page === "projeto" && <Projeto />}
      {page === "financeiro" && <Financeiro />}
      {page === "montagem" && <Montagem />}
      {page === "admin" && (
        <Admin currentUser={{ role: "admin", activeCompanyId: 1 }} />
      )}
    </div>
  );
}