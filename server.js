import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import inconsistentCountryNames from "./inconsistentCountryNames.js";

import { config } from "https://deno.land/x/dotenv/mod.ts";

const DENO_ENV = (await Deno.env.get("DENO_ENV")) ?? "development";

config({ path: `./.env.${DENO_ENV}`, export: true });

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT"));

const worldBankConfig =
  "postgres://czreijar:TJ2StTuQIl2CoRoinQTwPxk8pBGfdf6t@kandula.db.elephantsql.com/czreijar";
const client = new Client(worldBankConfig);

const userDatabaseConfig =
  "postgres://cgfgilii:YQgWoyUWXmD0CWvww7Bs2QSWTJvFT14e@tyke.db.elephantsql.com/cgfgilii";
const userDatabase = new Client(userDatabaseConfig);

await client.connect();
await userDatabase.connect();

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
  origin: /^.+fkmt-world-bank.herokuapp.com$/,
};

app.use(abcCors(corsInputs));
app.get("/:country", showCountryData);
app.get("/indicators", getAllIndicators);
app.get("/countries", getAllCountries);
app.get("/searches/:user_id", getUserSearches);
app.get("/searches", getAllSearches);
app.post("/login", checkUserLogin);
app.post("/sessions", createSession);
app.post("/register", registerUser);
app.post("/searches/:user_id", addUserSearch);
app.start({ port: PORT });

async function createSession(server, user_id) {
  const sessionId = v4.generate();
  await userDatabase.queryArray({
    text: `INSERT INTO sessions (uuid, user_id, created_at) VALUES ($sessionId, $user_id, current_timestamp)`,
    args: { sessionId: sessionId, user_id: user_id },
  });

  const user = await userDatabase.queryObject({
    text: "SELECT * FROM users WHERE id = $user_id",
    args: { user_id: user_id },
  });

  const [userRows] = user.rows;

  const expiryDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  await server.setCookie({
    name: "sessionId",
    value: sessionId,
    expires: expiryDate,
    path: "/",
    sameSite: "none",
    secure: true,
  });
  await server.setCookie({
    name: "user_id",
    value: user_id,
    expires: expiryDate,
    path: "/",
    sameSite: "none",
    secure: true,
  });
  await server.setCookie({
    name: "email",
    value: userRows.email,
    expires: expiryDate,
    path: "/",
    sameSite: "none",
    secure: true,
  });
}

async function findCurrentUserId(email) {
  const checkEmail = await userDatabase.queryObject({
    text: "SELECT * FROM users WHERE email = $email",
    args: { email: email },
  });
  const [checkEmailRows] = checkEmail.rows;
  return checkEmailRows.id;
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
  let checkEmail = await userDatabase.queryObject({
    text: `SELECT email FROM users WHERE email = $username`,
    args: { username: username },
  });
  const [theEmail] = checkEmail.rows;
  if (theEmail) {
    return server.json({ error: "User already exists" }, 400);
  } else {
    const query = `INSERT INTO users (email, password, salt, created_at, updated_at) 
                   VALUES ($username, $passwordEncrypted, $salt, current_timestamp, current_timestamp)`;
    await userDatabase.queryArray({
      text: query,
      args: {
        username: username,
        passwordEncrypted: passwordEncrypted,
        salt: salt,
      },
    });
    const user_id = await findCurrentUserId(username);
    await createSession(server, user_id);
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
  const checkEmail = await userDatabase.queryObject({
    text: "SELECT * FROM users WHERE email = $email",
    args: { email: email },
  });
  const [checkEmailRows] = checkEmail.rows;

  if (checkEmailRows) {
    if (await bcrypt.compare(password, checkEmailRows.password)) {
      await createSession(server, checkEmailRows.id);
      return server.json(checkEmailRows, 200);
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

  if (country.length > 1) {
    country = country.flat().reduce((acc, val) => acc + " vs " + val);
  } else {
    country = country[0];
  }

  await userDatabase.queryArray({
    text: `INSERT INTO searches (created_at, country, indicator, start_year, end_year, user_id) 
           VALUES (current_timestamp, $country, $indicator, $start_year, $end_year, $user_id)`,
    args: { country, indicator: indicator[0], start_year, end_year, user_id },
  });

  server.json({ success: "search added" }, 200);
}

async function getUserSearches(server) {
  const { user_id } = server.params;

  const response = await userDatabase.queryObject({
    text: "SELECT created_at, country, indicator, start_year, end_year FROM searches WHERE user_id = $user_id",
    args: { user_id },
  });

  const responseRows = response.rows;

  return server.json(responseRows);
}

async function getAllSearches(server) {
  const response = await userDatabase.queryObject("SELECT * FROM searches");

  return server.json(response);
}

console.log(`Server running on localhost:/${PORT}`);
