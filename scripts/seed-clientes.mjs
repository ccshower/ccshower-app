/**
 * Popula public.clientes com registros de teste (endereços na Flórida, US).
 *
 * Uso:
 *   node scripts/seed-clientes.mjs          # 40 clientes
 *   node scripts/seed-clientes.mjs 80       # quantidade customizada
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local não encontrado");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const COUNT = Math.min(500, Math.max(1, parseInt(process.argv[2] ?? "40", 10) || 40));

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FIRST = [
  "James", "Maria", "John", "Ana", "Robert", "Carlos", "Michael", "Laura",
  "David", "Sofia", "William", "Isabella", "Richard", "Patricia", "Joseph", "Camila",
  "Thomas", "Jennifer", "Daniel", "Linda",
];
const LAST = [
  "Smith", "Garcia", "Johnson", "Martinez", "Williams", "Brown", "Jones", "Rodriguez",
  "Miller", "Davis", "Wilson", "Lopez", "Anderson", "Hernandez", "Taylor", "Moore",
  "Jackson", "Martin", "Thompson", "White",
];

const STREETS = [
  "Oak Ave", "Pine St", "Maple Dr", "Cedar Ln", "Palm Blvd", "Sunset Way",
  "Bay Harbor Rd", "Lakeview Cir", "Magnolia Ct", "Banyan Trl", "Collins Ave",
  "Flagler St", "Brickell Key Dr", "International Dr", "Colonial Dr",
];

const CITIES = [
  { city: "Miami", state: "FL", zip: "33101", lat: 25.7617, lng: -80.1918 },
  { city: "Orlando", state: "FL", zip: "32801", lat: 28.5383, lng: -81.3792 },
  { city: "Tampa", state: "FL", zip: "33602", lat: 27.9506, lng: -82.4572 },
  { city: "Jacksonville", state: "FL", zip: "32202", lat: 30.3322, lng: -81.6557 },
  { city: "Fort Lauderdale", state: "FL", zip: "33301", lat: 26.1224, lng: -80.1373 },
  { city: "West Palm Beach", state: "FL", zip: "33401", lat: 26.7153, lng: -80.0534 },
  { city: "Naples", state: "FL", zip: "34102", lat: 26.142, lng: -81.7948 },
  { city: "Sarasota", state: "FL", zip: "34236", lat: 27.3364, lng: -82.5307 },
  { city: "St. Petersburg", state: "FL", zip: "33701", lat: 27.7676, lng: -82.6403 },
  { city: "Hialeah", state: "FL", zip: "33010", lat: 25.8576, lng: -80.2781 },
];

const OBS = [
  null,
  null,
  "Preferência manhã para visita.",
  "Portão lateral — tocar interfone 12.",
  "Cliente indicado por vizinho.",
  "Reforma de banheiro master.",
  "Dois banheiros no projeto.",
  "Acesso por garagem.",
  null,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function phoneUS() {
  const area = pick([305, 321, 407, 561, 727, 754, 786, 813, 850, 941]);
  const mid = String(randInt(200, 999)).padStart(3, "0");
  const last = String(randInt(1000, 9999));
  return `+1 (${area}) ${mid}-${last}`;
}

function jitter(coord, spread = 0.08) {
  return Number((coord + (Math.random() - 0.5) * spread).toFixed(7));
}

function buildCliente(equipes, usuarios, i) {
  const first = pick(FIRST);
  const last = pick(LAST);
  const nome = `${first} ${last}`;
  const loc = pick(CITIES);
  const num = randInt(100, 9999);
  const street = pick(STREETS);
  const endereco_linha1 = `${num} ${street}`;
  const endereco_formatado = `${endereco_linha1}, ${loc.city}, ${loc.state} ${loc.zip}, US`;
  const lat = jitter(loc.lat);
  const lng = jitter(loc.lng);
  const equipe = equipes.length ? pick(equipes) : null;
  const resp = usuarios.length ? pick(usuarios) : null;
  const slug = `${first}-${last}-${i}`.toLowerCase().replace(/\s+/g, "-");

  return {
    nome,
    telefone: phoneUS(),
    email: Math.random() > 0.25 ? `${slug}@example.test` : null,
    endereco_formatado,
    endereco_linha1,
    cidade: loc.city,
    estado: loc.state,
    cep: loc.zip,
    pais: "US",
    google_place_id:
      Math.random() > 0.3 ? `ChIJ_seed_${slug}_${randInt(1000, 9999)}` : null,
    latitude: lat,
    longitude: lng,
    google_maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    observacoes: pick(OBS),
    equipe_id: equipe?.id ?? null,
    responsavel_comercial_id: resp?.id ?? null,
    criado_por: resp?.id ?? null,
    ativo: Math.random() > 0.08,
  };
}

async function main() {
  const [{ data: equipes, error: e1 }, { data: usuarios, error: e2 }] =
    await Promise.all([
      admin.from("equipes").select("id, nome").eq("ativo", true),
      admin.from("usuarios").select("id, nome").eq("ativo", true),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;

  if (!equipes?.length) {
    console.warn("Aviso: nenhuma equipe ativa — clientes serão criados sem equipe_id.");
  }
  if (!usuarios?.length) {
    console.warn("Aviso: nenhum usuário ativo — sem responsável/criado_por.");
  }

  const rows = Array.from({ length: COUNT }, (_, i) =>
    buildCliente(equipes ?? [], usuarios ?? [], i + 1),
  );

  const batchSize = 25;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await admin.from("clientes").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
    console.log(`Inseridos ${inserted}/${COUNT}…`);
  }

  console.log("");
  console.log(`Concluído: ${inserted} clientes de teste (Flórida, US).`);
  console.log("Abra http://localhost:3000/clientes e recarregue a página.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
