# N8N — Open Route + ETA + SMS (CCSHOWER)

**Status:** planejado — workflow ainda **não** importado.

Especificação completa: **`docs/OPEN_ROUTE_ETA_SMS.md`**

---

## Visão geral

1. App dispara webhook quando instalador clica **Open route**.
2. Payload inclui telefone do cliente, ETA em minutos e horário local.
3. n8n envia SMS via **Twilio**.

Arquivo de workflow previsto: `ccshower-open-route-eta-sms.json` (criar na implantação).

---

## Credenciais n8n (na implantação)

| Credencial | Uso |
|------------|-----|
| Twilio API | Envio SMS |
| (opcional) HTTP Header Auth | Validar `N8N_WEBHOOK_SECRET` no trigger |

Twilio **não** deve ficar no Next.js — apenas no n8n.

---

## Variáveis no app (Vercel)

```env
N8N_WEBHOOK_OPEN_ROUTE_URL=https://...
N8N_WEBHOOK_SECRET=...
GOOGLE_MAPS_SERVER_API_KEY=...
```

Ver `.env.example` (seção comentada) e `docs/OPEN_ROUTE_ETA_SMS.md`.

---

## Padrão a seguir

Reutilizar o mesmo estilo do workflow de ficha técnica:

- `n8n/README-ficha-tecnica.md`
- `src/lib/ordens-servico/os-ficha-tecnica-webhook.ts`
