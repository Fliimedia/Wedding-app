# Trouwplanner — Sten & Nyarayek

Een gedeelde, gesynchroniseerde trouwplanner (To Do, Budget, Gasten, Schema).
Jij en Nyarayek zien dezelfde lijst: een wijziging op de ene telefoon verschijnt
binnen ~12 seconden op de andere.

Gebouwd met React + Vite. De gedeelde gegevens staan in een kleine database
(Upstash Redis) en worden gelezen/geschreven via een serverless functie
(`/api/state`), zodat er geen inloggegevens in de app zelf zitten.

---

## In het kort

1. Zet deze bestanden in een nieuwe GitHub-repo.
2. Importeer de repo in Vercel.
3. Voeg een Upstash Redis-database toe (gratis) en koppel de twee
   omgevingsvariabelen.
4. Deploy. Klaar.

---

## Stap voor stap

### 1. GitHub-repo
Maak een nieuwe (private) repo aan en voeg alle bestanden uit dit pakket toe
(`package.json`, `index.html`, `vite.config.js`, de map `src/` en de map `api/`).

### 2. Importeer in Vercel
- Ga naar https://vercel.com → **Add New… → Project** → kies je repo.
- Framework Preset: **Vite** (detecteert Vercel meestal automatisch).
- Build Command: `npm run build` · Output Directory: `dist` (standaard).
- Klik nog **niet** op een definitieve deploy zonder de database (stap 3),
  anders werkt het opslaan nog niet.

### 3. Database koppelen (Upstash Redis — gratis)

**Makkelijkste weg (via Vercel):**
- In je Vercel-project: tab **Storage → Create Database → Upstash (Redis)**.
- Vercel maakt de database en zet de omgevingsvariabelen er automatisch bij.

**Of handmatig (via Upstash):**
- Maak een gratis account op https://upstash.com → **Create Database** (Redis).
- Open de database → kopieer onder **REST API** de twee waarden.
- Zet ze in Vercel onder **Settings → Environment Variables**:
  - `UPSTASH_REDIS_REST_URL`  = de REST-URL
  - `UPSTASH_REDIS_REST_TOKEN` = het REST-token

> De code accepteert ook de namen die Vercel's eigen integratie soms gebruikt
> (`KV_REST_API_URL` / `KV_REST_API_TOKEN`), dus beide werken.

### 4. (Her)deploy
Trigger een nieuwe deploy (Vercel doet dit automatisch na het toevoegen van de
variabelen, of via **Deployments → Redeploy**). Open de URL op beide telefoons.

---

## Lokaal draaien (optioneel)
```bash
npm install
npm run dev
```
Voor lokaal opslaan heb je dezelfde twee variabelen nodig in een bestand
`.env.local`. Zonder database draait de app wel, maar bewaart hij niets.

---

## Hoe de synchronisatie werkt
- De volledige planner-staat staat als één JSON-object onder de sleutel
  `wedding:planner:v1` in Redis.
- De app laadt die bij het openen, slaat wijzigingen ~0,8 sec na een aanpassing
  op, en haalt elke ~12 sec op of de ander iets heeft gewijzigd.
- **Laatste wijziging wint:** bewerken jullie *exact tegelijk* dezelfde regel,
  dan overschrijft de laatste opslag de andere. Voor twee personen die samen
  plannen is dat in de praktijk prima; het is geen realtime co-editing.

## Wil je het strakker?
- Per-gebruiker login of een wijzigingsgeschiedenis is mogelijk, maar vraagt
  meer werk. Zeg het maar als dat nodig is.
