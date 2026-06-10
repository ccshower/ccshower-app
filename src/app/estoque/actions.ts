"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth/is-admin";
import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";
import { isUsuarioProjeto } from "@/lib/auth/usuario-campo";
import { parseCatalogoCsv } from "@/lib/ordens-servico/catalogo-csv";
import { parseCatalogoQuantidade } from "@/lib/ordens-servico/catalogo-quantidade";
import { createClient } from "@/lib/supabase/server";

export type CatalogoActionResult =
  | {
      ok: true;
      created: number;
      updated: number;
      warnings: string[];
    }
  | { ok: false; message: string; warnings?: string[] };

type CatalogoUpsertRow = {
  nome: string;
  categoria: string;
  unidade: string;
  quantidade?: number;
};

async function requireCatalogoManageAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");

  const { usuario, equipe } = await getUsuarioWithEquipe();
  if (!usuario?.ativo) throw new Error("Inactive user");

  const allowed =
    isAdmin(usuario) ||
    isUsuarioProjeto(usuario, equipe) ||
    usuario.pode_gerenciar_estoque;

  if (!allowed) throw new Error("No permission to manage inventory");

  return supabase;
}

function normalizeInput(
  nome: string,
  categoria: string,
  unidade: string,
  quantidadeRaw: string,
): CatalogoUpsertRow | { error: string } {
  const n = nome.trim();
  if (!n) return { error: "Enter the item name." };

  const quantidade = parseCatalogoQuantidade(quantidadeRaw);
  if (quantidadeRaw.trim() && quantidade === undefined) {
    return { error: "Invalid quantity." };
  }

  return {
    nome: n,
    categoria: categoria.trim() || "Other",
    unidade: unidade.trim() || "un",
    quantidade: quantidade ?? 0,
  };
}

async function upsertCatalogoRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CatalogoUpsertRow[],
): Promise<CatalogoActionResult> {
  if (rows.length === 0) {
    return { ok: false, message: "No items to import." };
  }

  const { data: existing, error: loadErr } = await supabase
    .from("catalogo_itens")
    .select("id, nome");

  if (loadErr) {
    return { ok: false, message: loadErr.message };
  }

  const existingByLower = new Map<string, string>();
  for (const row of existing ?? []) {
    const nome = String(row.nome);
    existingByLower.set(nome.toLowerCase(), nome);
  }

  const toInsert = rows
    .filter((row) => !existingByLower.has(row.nome.toLowerCase()))
    .map((row) => ({
      nome: row.nome,
      categoria: row.categoria,
      unidade: row.unidade,
      quantidade: row.quantidade ?? 0,
      ativo: true,
    }));

  let created = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("catalogo_itens").insert(toInsert);
    if (insertErr) {
      return { ok: false, message: insertErr.message };
    }
    created = toInsert.length;
  }

  const toUpdate = rows.filter((row) =>
    existingByLower.has(row.nome.toLowerCase()),
  );

  for (const row of toUpdate) {
    const dbNome = existingByLower.get(row.nome.toLowerCase()) ?? row.nome;
    const patch: Record<string, unknown> = {
      categoria: row.categoria,
      unidade: row.unidade,
      ativo: true,
    };
    if (row.quantidade !== undefined) {
      patch.quantidade = row.quantidade;
    }

    const { error: updateErr } = await supabase
      .from("catalogo_itens")
      .update(patch)
      .eq("nome", dbNome);

    if (updateErr) {
      return {
        ok: false,
        message: updateErr.message,
        warnings: [`Failed to update "${row.nome}".`],
      };
    }
    updated += 1;
  }

  revalidatePath("/estoque");
  revalidatePath("/estoque/novo");

  return { ok: true, created, updated, warnings: [] };
}

export async function criarCatalogoItem(formData: FormData): Promise<CatalogoActionResult> {
  try {
    const supabase = await requireCatalogoManageAuth();
    const parsed = normalizeInput(
      String(formData.get("nome") ?? ""),
      String(formData.get("categoria") ?? ""),
      String(formData.get("unidade") ?? ""),
      String(formData.get("quantidade") ?? ""),
    );

    if ("error" in parsed) {
      return { ok: false, message: parsed.error };
    }

    return upsertCatalogoRows(supabase, [parsed]);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving item",
    };
  }
}

export async function importarCatalogoCsv(
  formData: FormData,
): Promise<CatalogoActionResult> {
  try {
    const supabase = await requireCatalogoManageAuth();
    const file = formData.get("arquivo");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Select a valid CSV file." };
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return { ok: false, message: "File must have a .csv extension" };
    }

    if (file.size > 512_000) {
      return { ok: false, message: "File too large (max. 512 KB)." };
    }

    const text = await file.text();
    const { rows, errors } = parseCatalogoCsv(text);

    if (rows.length === 0) {
      return {
        ok: false,
        message: errors[0] ?? "No valid items in the CSV.",
        warnings: errors.slice(1),
      };
    }

    const result = await upsertCatalogoRows(supabase, rows);
    if (!result.ok) return result;

    return {
      ...result,
      warnings: [...errors, ...result.warnings],
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error importing CSV",
    };
  }
}
