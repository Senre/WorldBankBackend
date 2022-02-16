import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v2.5.0/mod.ts";
import inconsistentCountryNames from "./inconsistentCountryNames.js";

const app = new Application();
const PORT = 8080;

const db = new DB("wbd-db.db");
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
  origin: /^.+localhost:(3000)$/,
};

app.use(abcCors(corsInputs));
app.get("/:country", showCountryData);
app.get("/indicators", getAllIndicators);
app.get("/countries", getAllCountries);
app.post("/login", checkUserLogin);
app.post("/sessions", createSession);
app.post("/register", registerUser);
app.post("/searches", addSearch);
app.start({ port: PORT });

async function createSession(server, user_id) {
  const sessionId = v4.generate();
  await db.query(
    `INSERT INTO sessions (uuid, user_id, created_at) VALUES (?, ?, datetime('now'))`,
    [sessionId, user_id]
  );

  const user = [
    ...(
      await db.query("SELECT * FROM users WHERE id = ?", [user_id])
    ).asObjects(),
  ];

  console.log("session");
  console.log(user);

  const expiryDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  server.setCookie({
    name: "sessionId",
    value: sessionId,
    expires: expiryDate,
    path: "/",
  });
  server.setCookie({
    name: "user_id",
    value: user_id,
    expires: expiryDate,
    path: "/",
  });
  server.setCookie({
    name: "email",
    value: user.email,
    expires: expiryDate,
    path: "/",
  });
}

async function showCountryData(server) {
  const { country } = await server.params;
  const countryDecoded = decodeURIComponent(country);

  const { indicator, startYear, endYear } = await server.queryParams;
  const indicatorDecoded = `%${decodeURIComponent(indicator)}%`;

  const countryExists = await client.queryObject({
    text: "SELECT ShortName FROM Countries WHERE ShortName = $1",
    args: [countryDecoded],
  });
  if (countryExists.rows[0]) {
    let countryName = countryDecoded;
    if (countryDecoded in inconsistentCountryNames) {
      countryName = inconsistentCountryNames[countryDecoded];
    }

    let query = `SELECT * FROM Indicators WHERE countryName = $countryName`;
    const queryFilters = { countryName: countryName };

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

async function registerUser(server) {
  const { email, password } = await server.body;
  const salt = await bcrypt.genSalt(8);
  const passwordEncrypted = await bcrypt.hash(password, salt);
  let [checkEmail] = [
    ...(
      await db.query(`SELECT email FROM users WHERE email = ?`, [email])
    ).asObjects(),
  ];
  if (checkEmail) {
    return server.json({ error: "User already exists" }, 400);
  } else {
    const query =
      (`INSERT INTO users (email, password, salt, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      [email, passwordEncrypted, salt]);
    await db.query(query);
    return server.json({ success: "User registered successfully." }, 200);
  }
}

async function getAllIndicators(server) {
  const response = await client.queryObject({
    text: "SELECT DISTINCT IndicatorName FROM Indicators ORDER BY IndicatorName ASC",
  });

  server.json(response, 200);
}

async function getAllCountries(server) {
  const response = await client.queryObject({
    text: "SELECT DISTINCT ShortName FROM Countries ORDER BY ShortName ASC",
  });

  server.json(response, 200);
}

async function checkUserLogin(server) {
  const { email, password } = await server.body;
  const checkEmail = [
    ...(
      await db.query("SELECT * FROM users WHERE email = ?", [email])
    ).asObjects(),
  ];

  console.log(checkEmail);

  if (checkEmail.length === 1) {
    if (await bcrypt.compare(password, checkEmail[0].password)) {
      createSession(server, checkEmail[0].id);
      return server.json(checkEmail[0], 200);
    } else {
      server.json({ error: "Incorrect password" }, 400);
    }
  } else {
    server.json({ error: "User not found." }, 404);
  }
}

console.log(`Server running on localhost:/${PORT}`);
