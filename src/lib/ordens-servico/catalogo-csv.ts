export type CatalogoCsvRow = {
  nome: string;
  categoria: string;
  unidade: string;
  /** Ausente quando a coluna não veio no CSV — não sobrescreve no update. */
  quantidade?: number;
};

export type CatalogoCsvParseResult = {
  rows: CatalogoCsvRow[];
  errors: string[];
};

import { parseCatalogoQuantidade } from "@/lib/ordens-servico/catalogo-quantidade";

const HEADER_ALIASES: Record<keyof CatalogoCsvRow, string[]> = {
  nome: ["nome", "name", "produto", "product", "item", "descricao", "descrição", "insumo"],
  categoria: ["categoria", "category", "tipo", "grupo"],
  unidade: ["unidade", "unit", "um", "uom"],
  quantidade: ["quantidade", "qtd", "qty", "quantity", "estoque", "saldo"],
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function detectDelimiter(line: string): "," | ";" {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Parse simples de linha CSV com aspas opcionais. */
function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function mapHeaderIndexes(headers: string[]): Partial<Record<keyof CatalogoCsvRow, number>> {
  const indexes: Partial<Record<keyof CatalogoCsvRow, number>> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const field of Object.keys(HEADER_ALIASES) as (keyof CatalogoCsvRow)[]) {
      if (HEADER_ALIASES[field].includes(normalized)) {
        indexes[field] = index;
      }
    }
  });
  return indexes;
}

function rowFromCells(
  cells: string[],
  indexes: Partial<Record<keyof CatalogoCsvRow, number>>,
  lineNumber: number,
): { row?: CatalogoCsvRow; error?: string } {
  const read = (field: keyof CatalogoCsvRow) => {
    const idx = indexes[field];
    if (idx == null) return "";
    return (cells[idx] ?? "").trim();
  };

  const nome = read("nome");
  const categoria = read("categoria") || "Outros";
  const unidade = read("unidade") || "un";
  const quantidadeRaw = indexes.quantidade != null ? read("quantidade") : "";
  const quantidadeParsed = parseCatalogoQuantidade(quantidadeRaw);

  if (!nome) {
    return { error: `Linha ${lineNumber}: nome do insumo é obrigatório.` };
  }

  if (quantidadeRaw && quantidadeParsed === undefined) {
    return {
      error: `Linha ${lineNumber}: quantidade inválida ("${quantidadeRaw}").`,
    };
  }

  return {
    row: {
      nome,
      categoria,
      unidade,
      ...(quantidadeParsed !== undefined ? { quantidade: quantidadeParsed } : {}),
    },
  };
}

export function parseCatalogoCsv(rawText: string): CatalogoCsvParseResult {
  const errors: string[] = [];
  const rows: CatalogoCsvRow[] = [];

  const text = rawText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    return { rows: [], errors: ["Arquivo CSV vazio."] };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["Arquivo CSV vazio."] };
  }

  const delimiter = detectDelimiter(lines[0]!);
  const headerCells = splitCsvLine(lines[0]!, delimiter);
  let indexes = mapHeaderIndexes(headerCells);
  let startLine = 1;

  if (indexes.nome == null && lines.length > 1) {
    indexes = { nome: 0, categoria: 1, unidade: 2, quantidade: 3 };
    startLine = 0;
  } else if (indexes.nome == null) {
    return {
      rows: [],
      errors: [
        "Cabeçalho inválido. Use: nome, categoria, unidade, quantidade.",
      ],
    };
  }

  const seen = new Set<string>();

  for (let i = startLine; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const cells = splitCsvLine(lines[i]!, delimiter);
    const parsed = rowFromCells(cells, indexes, lineNumber);
    if (parsed.error) {
      errors.push(parsed.error);
      continue;
    }
    const key = parsed.row!.nome.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed.row!);
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Nenhum insumo válido encontrado no arquivo.");
  }

  return { rows, errors };
}
