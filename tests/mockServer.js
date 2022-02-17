import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v2.5.0/mod.ts";
import inconsistentCountryNames from "./../inconsistentCountryNames.js";

const app = new Application();
const PORT = 8080;

try {
  await Deno.remove("mockDB.db");
} catch {
  // nothing to remove
}

const db = new DB("mockDB.db");

await db.query(
  `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
  )`
);

await db.query(
  `CREATE TABLE sessions (
    uuid TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`
);

await db.query(
  `CREATE TABLE searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    country TEXT NOT NULL,
    indicator TEXT,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id)
  )`
);

await db.query(
  `INSERT INTO users (email,password,salt,created_at,updated_at) 
  VALUES ('fkmt@fkmt', '$2a$08$ozJ9poWs66sx6hO38puM4uv20cv3UeZam1qSPTF3honWyoPa4dS1C', 
    '$2a$08$ozJ9poWs66sx6hO38puM4u', 
    datetime('now'), datetime('now'))`
);
// fkmt@fkmt 12345678

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
app.get("/searches/:user_id", getUserSearches);
app.post("/login", checkUserLogin);
app.post("/sessions", createSession);
app.post("/register", registerUser);
app.post("/searches/:user_id", addUserSearch);
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

async function findCurrentUserId(email) {
  const checkEmail = [
    ...(
      await db.query("SELECT * FROM users WHERE email = ?", [email])
    ).asObjects(),
  ];

  console.log(checkEmail[0].id);
  return checkEmail[0].id;
}

async function showCountryData(server) {
  const { country } = await server.params;
  const countryDecoded = decodeURIComponent(country);

  const { indicator, startYear, endYear } = await server.queryParams;
  const indicatorDecoded = `%${indicator}%`;

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
    if (startYear || endYear) {
      const defStartYear = 1960;
      const defEndYear = 2015;
      query += ` AND Year BETWEEN $startYear AND $endYear`;
      queryFilters.startYear = startYear || defStartYear;
      queryFilters.endYear = endYear || defEndYear;
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
          statusCode: 404,
          message: "404: Not Found. No data found with those restraints",
        },
        404
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
  const { username, password } = await server.body;
  const salt = await bcrypt.genSalt(8);
  const passwordEncrypted = await bcrypt.hash(password, salt);
  let [checkEmail] = [
    ...(
      await db.query(`SELECT email FROM users WHERE email = ?`, [username])
    ).asObjects(),
  ];
  if (checkEmail) {
    return server.json({ error: "User already exists" }, 400);
  } else {
    const query = `INSERT INTO users (email, password, salt, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`;
    await db.query(query, [username, passwordEncrypted, salt]);
    createSession(server, await findCurrentUserId(username));
    return server.json({ success: "User registered successfully." }, 200);
  }
}

async function getAllIndicators(server) {
  let response = await client.queryArray(
    "SELECT DISTINCT IndicatorName FROM Indicators ORDER BY IndicatorName ASC"
  );

  server.json(response.rows.flat(), 200);
}

async function getAllCountries(server) {
  let response = await client.queryArray(
    "SELECT DISTINCT ShortName FROM Countries ORDER BY ShortName ASC"
  );

  server.json(response.rows.flat(), 200);
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

async function addUserSearch(server) {
  const { user_id } = server.params;
  let { country, indicator, start_year, end_year } = await server.body;
  console.log(country, indicator, start_year, end_year);

  if (country.length > 1) {
    country = country.flat().reduce((acc, val) => acc + " vs " + val);
  } else {
    country = country[0];
  }

  await db.query(
    "INSERT INTO searches (created_at, country, indicator, start_year, end_year, user_id) VALUES (datetime('now'), ?, ?, ?, ?, ?)",
    [country, indicator[0], start_year, end_year, user_id]
  );

  server.json({ success: "search added" }, 200);
}

async function getUserSearches(server) {
  const { user_id } = server.params;

  const response = [
    ...(
      await db.query(
        "SELECT created_at, country, indicator, start_year, end_year FROM searches WHERE user_id = ?",
        [user_id]
      )
    ).asObjects(),
  ];

  return server.json(response);
}

console.log(`Server running on localhost:/${PORT}`);
