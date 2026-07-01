// Serverless proxy naar de Anthropic API.
// De sleutel blijft server-side (Vercel Environment Variable ANTHROPIC_API_KEY)
// en komt nooit in de browser terecht.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const CATEGORIES = [
  "Bloemen & styling",
  "Kleding & accessoires",
  "Bridal party",
  "Muziek & entertainment",
  "Uitnodigingen & gasten",
  "Planning & logistiek",
  "Wettelijk huwelijk",
  "Leveranciers",
  "Receptie, diner & feest",
  "Kerk & ceremonie",
  "Beauty & voorbereiding",
  "Laatste week",
];

function schema(nameA, nameB) {
  const owners = [nameA || "Partner 1", nameB || "Partner 2", "Samen"];
  return `Geef UITSLUITEND geldige JSON terug (geen markdown, geen uitleg, geen \`\`\`). Structuur:
{
  "coupleA": "voornaam 1 of leeg",
  "coupleB": "voornaam 2 of leeg",
  "weddingDate": "YYYY-MM-DD of leeg",
  "budget": geheel getal in euro's (0 als onbekend),
  "description": "korte beschrijving van de bruiloft in 2-3 zinnen",
  "schedule": [ { "time": "HH:MM", "title": "programmaonderdeel" } ],
  "tasks": [ { "name": "taak", "category": "<één van: ${CATEGORIES.join(" | ")}>", "owner": "<${owners.join(" | ")}>", "deadline": "YYYY-MM-DD", "details": "korte toelichting of leeg" } ],
  "posten": [ { "name": "budgetpost", "amount": geheel getal in euro's } ],
  "guests": [ { "name": "naam", "category": "Familie & vrienden", "side": "<${(nameA || "Partner 1")} | ${(nameB || "Partner 2")}>", "inv": true, "pres": false } ],
  "guestBreakdown": [ { "group": "groep (bv. Familie bruid)", "count": aantal } ]
}
Regels:
- Gebruik Nederlandse teksten.
- Gebruik voor "category" alleen exact een van de opgegeven categorieën.
- Gebruik voor "owner" alleen exact "${owners.join('", "')}".
- Vul "guests" alleen met echte namen als die bekend zijn (bij het interpreteren van een document). Anders "guests": [] en gebruik "guestBreakdown" voor een verdeling met aantallen.
- Zorg dat deadlines vóór de trouwdatum vallen en logisch gespreid zijn.`;
}

async function callAnthropic(apiKey, system, content) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) {
    throw new Error("Anthropic API fout (" + resp.status + "): " + raw.slice(0, 400));
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("Kon Anthropic-antwoord niet lezen.");
  }
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

function parsePlan(text) {
  let t = (text || "").trim();
  t = t.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Methode niet toegestaan" });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Geen AI-sleutel geconfigureerd. Stel ANTHROPIC_API_KEY in als Environment Variable in Vercel.",
    });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { mode, nameA, nameB, weddingDate } = body;
    const sys =
      "Je bent een ervaren Nederlandse trouwplanner. Je zet input om in een concreet, realistisch trouwplan. " +
      schema(nameA, nameB);

    let content;

    if (mode === "import") {
      if (body.pdf) {
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf } },
          { type: "text", text: "Interpreteer dit trouwplan-document en zet het om naar het JSON-schema. Neem taken, budgetposten en (indien aanwezig) gasten met echte namen over." },
        ];
      } else {
        content = [
          { type: "text", text: "Interpreteer dit trouwplan en zet het om naar het JSON-schema. Neem taken, budgetposten en (indien aanwezig) gasten met echte namen over.\n\nDOCUMENT:\n" + String(body.text || "").slice(0, 60000) },
        ];
      }
    } else if (mode === "generate") {
      const tierLabel = { budget: "Budgetvriendelijk", standaard: "Standaard", luxe: "Luxe" }[body.tier] || "Standaard";
      const qa = (body.answers || []).map((a) => "- " + a.q + ": " + a.a).join("\n");
      content = [
        {
          type: "text",
          text:
            "Genereer een compleet trouwplan.\n" +
            "Namen: " + (nameA || "onbekend") + " & " + (nameB || "onbekend") + "\n" +
            "Trouwdatum: " + (weddingDate || "nog onbekend") + "\n" +
            "Niveau: " + tierLabel + "\n\n" +
            "Keuzes:\n" + qa + "\n\n" +
            "Bijzondere wensen 1: " + (body.wish1 || "-") + "\n" +
            "Bijzondere wensen 2: " + (body.wish2 || "-") + "\n\n" +
            "Maak een dagschema, een gecategoriseerde takenlijst, een budgetverdeling passend bij het niveau, en een gastenverdeling (guestBreakdown met aantallen; guests leeg laten). Geef ook een korte beschrijving.",
        },
      ];
    } else {
      return res.status(400).json({ error: "Onbekende modus" });
    }

    const text = await callAnthropic(apiKey, sys, content);
    let plan;
    try {
      plan = parsePlan(text);
    } catch (e) {
      return res.status(502).json({ error: "AI gaf geen geldige JSON terug. Probeer opnieuw." });
    }
    return res.status(200).json({ ok: true, plan });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
