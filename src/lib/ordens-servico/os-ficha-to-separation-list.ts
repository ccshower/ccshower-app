import type { FichaTecnicaItemInput } from "@/lib/ordens-servico/os-ficha-tecnica";
import type { SupabaseClient } from "@supabase/supabase-js";

const CATALOG_CATEGORIA_PDF = "SHOWER FITTINGS";

export function formatPdfItemNotes(item: FichaTecnicaItemInput): string | null {
  const parts: string[] = [];
  if (item.glass_spec?.trim()) parts.push(item.glass_spec.trim());
  if (item.finish?.trim()) parts.push(item.finish.trim());
  return parts.length ? parts.join(" · ") : null;
}

/** Separa notas geradas por `formatPdfItemNotes` em vidro e acabamento. */
export function parsePdfSeparationNotes(notes: string | null | undefined): {
  glass: string | null;
  finish: string | null;
} {
  if (!notes?.trim()) return { glass: null, finish: null };
  const parts = notes.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { glass: parts[0], finish: parts[parts.length - 1] };
  }
  return { glass: notes.trim(), finish: null };
}

export async function resolveCatalogItemIdBySku(
  supabase: SupabaseClient,
  sku: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const normalized = sku.trim().toUpperCase();
  if (!normalized) return { ok: false, message: "SKU vazio" };

  const { data: existing, error: selErr } = await supabase
    .from("catalogo_itens")
    .select("id")
    .eq("nome", normalized)
    .maybeSingle();

  if (selErr) return { ok: false, message: selErr.message };
  if (existing?.id) return { ok: true, id: existing.id as string };

  const { data: created, error: insErr } = await supabase
    .from("catalogo_itens")
    .insert({
      nome: normalized,
      categoria: CATALOG_CATEGORIA_PDF,
      unidade: "un",
      ativo: true,
    })
    .select("id")
    .single();

  if (insErr || !created?.id) {
    return {
      ok: false,
      message: insErr?.message ?? "Falha ao criar item no catalogo",
    };
  }

  return { ok: true, id: created.id as string };
}

/** Substitui a lista de separação da OS pelos itens extraídos do PDF. */
export async function syncSeparationListFromPdfItems(
  supabase: SupabaseClient,
  params: {
    ordem_servico_id: string;
    empresa_id: string | null;
    items: FichaTecnicaItemInput[];
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delErr } = await supabase
    .from("os_separation_list_items")
    .delete()
    .eq("ordem_servico_id", params.ordem_servico_id);

  if (delErr) return { ok: false, message: delErr.message };
  if (params.items.length === 0) return { ok: true };

  const rows: Array<{
    ordem_servico_id: string;
    empresa_id: string | null;
    item_id: string;
    quantity: number;
    notes: string | null;
    sort_order: number;
  }> = [];

  for (let i = 0; i < params.items.length; i++) {
    const item = params.items[i];
    const catalog = await resolveCatalogItemIdBySku(supabase, item.sku);
    if (!catalog.ok) return catalog;

    rows.push({
      ordem_servico_id: params.ordem_servico_id,
      empresa_id: params.empresa_id,
      item_id: catalog.id,
      quantity: item.quantity,
      notes: formatPdfItemNotes(item),
      sort_order: item.sort_order ?? i,
    });
  }

  const { error: insErr } = await supabase
    .from("os_separation_list_items")
    .insert(rows);

  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}
