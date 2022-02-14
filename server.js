import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v2.5.0/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";

const db = new DB("database.sqlite");
const app = new Application();
const PORT = 8080;

const corsInputs = {
  methods: "POST,GET",
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "User-Agent",
  ],
  credentials: true,
};

app.use(abcCors(corsInputs)).get("/:country", showCountryData);

async function showCountryData(server) {
  const { country } = await server.params;
  const { indicator, startYear, endYear } = await server.body;

  let query = `SELECT * FROM Indicators WHERE countryName = ?`;
  const queryFilters = [country];

  if (indicator) {
    query += ` AND IndicatorName = ?`;
    queryFilters.push(indicator);
  }
  if (startYear) {
    query += ` AND Year BETWEEN ? AND ?`;
    queryFilters.push(startYear, endYear);
  }

  const countryData = [...(await db.query(query, queryFilters).asObjects())];
  server.json(countryData, 200);
}
