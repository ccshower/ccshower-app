#!/usr/bin/env node
/**
 * Copia itens de os_ficha_tecnica_items → os_separation_list_items (por OS).
 * Uso: node scripts/backfill-ficha-to-separation.mjs [ordem_servico_id]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const osId = process.argv[2]?.trim();

if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function resolveCatalogItemIdBySku(sku) {
  const normalized = sku.trim().toUpperCase();
  const { data: existing } = await supabase
    .from("catalogo_itens")
    .select("id")
    .eq("nome", normalized)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("catalogo_itens")
    .insert({
      nome: normalized,
      categoria: "SHOWER FITTINGS",
      unidade: "un",
      ativo: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

function formatNotes(item) {
  const parts = [];
  if (item.glass_spec?.trim()) parts.push(item.glass_spec.trim());
  if (item.finish?.trim()) parts.push(item.finish.trim());
  return parts.length ? parts.join(" · ") : null;
}

async function backfillOs(ordemServicoId) {
  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select("id, empresa_id")
    .eq("id", ordemServicoId)
    .single();
  if (osErr || !os) throw osErr ?? new Error("OS nao encontrada");

  const { data: fichaItems, error: fErr } = await supabase
    .from("os_ficha_tecnica_items")
    .select("sku, quantity, glass_spec, finish, sort_order")
    .eq("ordem_servico_id", ordemServicoId)
    .order("sort_order", { ascending: true });
  if (fErr) throw fErr;
  if (!fichaItems?.length) {
    console.log("Sem itens em os_ficha_tecnica_items");
    return;
  }

  await supabase
    .from("os_separation_list_items")
    .delete()
    .eq("ordem_servico_id", ordemServicoId);

  const rows = [];
  for (let i = 0; i < fichaItems.length; i++) {
    const item = fichaItems[i];
    const item_id = await resolveCatalogItemIdBySku(item.sku);
    rows.push({
      ordem_servico_id: ordemServicoId,
      empresa_id: os.empresa_id,
      item_id,
      quantity: item.quantity,
      notes: formatNotes(item),
      sort_order: item.sort_order ?? i,
    });
  }

  const { error: insErr } = await supabase
    .from("os_separation_list_items")
    .insert(rows);
  if (insErr) throw insErr;

  console.log(`OK — ${rows.length} itens copiados para lista de separacao`);
}

async function main() {
  if (osId) {
    await backfillOs(osId);
    return;
  }

  const { data: groups, error } = await supabase
    .from("os_ficha_tecnica_items")
    .select("ordem_servico_id");
  if (error) throw error;

  const ids = [...new Set((groups ?? []).map((g) => g.ordem_servico_id))];
  for (const id of ids) {
    const { count } = await supabase
      .from("os_separation_list_items")
      .select("id", { count: "exact", head: true })
      .eq("ordem_servico_id", id);
    if (count && count > 0) {
      console.log(`Pulando ${id} — ja tem lista de separacao`);
      continue;
    }
    console.log(`Backfill ${id}...`);
    await backfillOs(id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
