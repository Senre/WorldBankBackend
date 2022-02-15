import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";

const app = new Application();
const PORT = 8080;

const config =
  "postgres://czreijar:TJ2StTuQIl2CoRoinQTwPxk8pBGfdf6t@kandula.db.elephantsql.com/czreijar";
const client = new Client(config);
await client.connect();

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

app.use(abcCors(corsInputs));
app.get("/:country", showCountryData);
app.post("/login", checkUserLogin);
app.start({ port: PORT });

async function showCountryData(server) {
  console.log(await server);
  const { country } = await server.params;
  const countryDecoded = decodeURIComponent(country);

  const { indicator, startYear, endYear } = await server.queryParams;
  const indicatorDecoded = `%${decodeURIComponent(indicator)}%`;

  const countryExists = await client.queryObject({
    text: "SELECT ShortName FROM Countries WHERE ShortName = $1",
    args: [countryDecoded],
  });
  if (countryExists.rows[0]) {
    let query = `SELECT * FROM Indicators WHERE countryName = $countryName`;
    const queryFilters = { countryName: countryDecoded };

    if (indicator) {
      query += ` AND IndicatorName LIKE $indicatorName`;
      queryFilters.indicatorName = indicatorDecoded;
    }
    if (startYear) {
      query += ` AND Year BETWEEN $startYear AND $endYear`;
      queryFilters.startYear = startYear;
      queryFilters.endYear = endYear;
    }

    query += ` ORDER BY IndicatorName`;

    const countryData = await client.queryObject({
      text: query,
      args: queryFilters,
    });

    const countryDataRows = countryData.rows;

    if (countryDataRows[0]) {
      server.json(countryDataRows, 200);
    } else {
      server.json(
        {
          statusCode: 204,
          message: "204: No content. No data found with those restraints",
        },
        204
      );
    }
  } else {
    server.json(
      {
        statusCode: 400,
        message:
          "400: Bad Request. That country does not exist in our database",
      },
      400
    );
  }
}

async function checkUserLogin(server) {
  const { email, password } = await server.body;
  let exists =
    `IF EXISTS (SELECT email, password FROM wbd-db WHERE AND email = ? AND password = ?)`[
      (email, password)
    ];
  if (exists) {
    await getSearchPage;
  } else {
    throw new Error("User not found");
  }
}

console.log(`Server running on localhost:/${PORT}`);
