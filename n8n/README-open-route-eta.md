# N8N — Open Route + ETA + SMS (CCSHOWER)

Workflow importável: **`ccshower-open-route-eta-sms.json`**.

Quando o app recebe o clique de **Open route**, ele envia um webhook para o
n8n. O workflow envia SMS exclusivamente para `cliente.telefone`; ele não
envia mensagens a técnicos, equipes ou números internos.

Especificação do fluxo: `docs/OPEN_ROUTE_ETA_SMS.md`.

## 1. Importar e configurar

1. No n8n, abra **Workflows** → **Import from File** e selecione
   `ccshower-open-route-eta-sms.json`.
2. No nó **Twilio - Enviar SMS cliente**, selecione a credencial Twilio já
   criada: `ccshower_twilio`.
3. No mesmo nó, substitua `YOUR_TWILIO_FROM_E164` pelo número remetente
   Twilio em E.164, por exemplo `+19045550123`.
4. No nó **Webhook Open Route**, selecione/crie a credencial Header Auth
   `ccshower_open_route_webhook_auth`:
   - Header name: `Authorization`
   - Header value: `Bearer <N8N_WEBHOOK_SECRET>`
5. Salve e ative o workflow. Copie a **Production URL** do Webhook (não a
   URL de teste).

O Header Auth é a validação do segredo. Não deixe o webhook ativo sem essa
credencial: o app envia `Authorization: Bearer <N8N_WEBHOOK_SECRET>`.

Twilio fica somente no n8n; não adicione SID, Auth Token ou número remetente
ao Next.js/Vercel.

## 2. Variáveis da Vercel

Configure e faça redeploy:

```env
N8N_WEBHOOK_OPEN_ROUTE_URL=https://SEU-N8N/webhook/ccshower-open-route-eta
N8N_WEBHOOK_SECRET=token-longo-aleatorio-compartilhado-com-o-header-auth
GOOGLE_MAPS_SERVER_API_KEY=AIzaSy...
```

`N8N_WEBHOOK_SECRET` deve ter exatamente o mesmo valor usado no Header Auth
do Webhook. `GOOGLE_MAPS_SERVER_API_KEY` é usada pelo app para calcular ETA;
não é usada pelo n8n.

## 3. Mensagens enviadas

Com ETA:

- Instalação: `Hi {firstName}, our installation team is on the way to {shortAddress}. Estimated arrival: about {etaMinutes} minutes (around {etaTime}). — CC Shower`
- Visita técnica: `Hi {firstName}, our team is on the way for your technical visit at {shortAddress}. Estimated arrival: about {etaMinutes} minutes (around {etaTime}). — CC Shower`

Sem ETA, o workflow troca a estimativa por “will arrive shortly”. Se
`cliente.telefone` estiver vazio, ele responde HTTP 200 com
`sms_sent: false` e não chama o Twilio.

## 4. Teste manual

Com o workflow ativo, envie para a Production URL (troque o segredo e os
UUIDs):

```bash
curl -X POST 'https://SEU-N8N/webhook/ccshower-open-route-eta' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_N8N_WEBHOOK_SECRET' \
  --data '{
    "event": "installer_open_route",
    "os_id": "00000000-0000-0000-0000-000000000001",
    "empresa_id": "00000000-0000-0000-0000-000000000002",
    "etapa_atual": "installation",
    "cliente": {
      "id": "00000000-0000-0000-0000-000000000003",
      "nome": "STEPHANIE C.",
      "telefone": "+19045551234",
      "endereco_formatado": "3178 WAVERING LN, MIDDLEBURG, FL 32068"
    },
    "destino": { "latitude": 30.12, "longitude": -81.86 },
    "origem": {
      "latitude": 30.05,
      "longitude": -81.72,
      "captured_at": "2026-08-03T18:30:00.000Z"
    },
    "eta": {
      "minutos": 28,
      "chegada_local": "2:45 PM",
      "chegada_iso": "2026-08-03T18:45:00-04:00",
      "distancia_milhas": 12.4,
      "com_trafego": true
    },
    "equipe_nome": "Design & Projects",
    "tecnico_nome": "John Smith",
    "timezone": "America/New_York"
  }'
```

O campo atual é `tecnico_nome` (não `instalador_nome`). Para testar o
fallback sem ETA, envie `eta.minutos` e `eta.chegada_local` como `null`.
