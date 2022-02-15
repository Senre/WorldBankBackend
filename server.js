import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v2.5.0/mod.ts";
import { abcCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";

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

app.use(abcCors(corsInputs));

app
  .get("/:country", showCountryData)
  .post("/login", checkUserLogin)
  .post("/sessions", createSession)
  .post("/register", registerUser)


async function registerUser(server) {
  const { email, password } = await server.body;
  const salt = await bcrypt.genSalt(8);
  const passwordEncrypted = await bcrypt.hash(password, salt)
  let exists =
    `IF EXISTS (SELECT email FROM wbd-db WHERE email = ?)`,[
      email
    ];
  if (exists) {
      return server.json({error: "User already exists"}, 400)
  } else {
      const query = (`INSERT INTO users (email, password, salt, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,[email, passwordEncrypted, salt])
      await db.query(query)
      return server.json({success: "User registered successfully."}, 200)
  }    

async function createSession(server) {
  const sessionId = v4.generate();
  await db.query(
    `INSERT INTO sessions (uuid, user_id, created_at) VALUES (?, ?, datetime('now'))`,
    [sessionId, user_id]
  );

  const user = [
    ...(
      await db.query("SELECT * FROM users WHERE id = ?", [user_id])
    ).asObjects(),
  ][0];

  const expiryDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  server.setCookie({
    name: "sessionId",
    value: sessionId,
    expires: expiryDate,
    path: "/home",
  });
  server.setCookie({
    name: "user_id",
    value: user_id,
    expires: expiryDate,
    path: "/home",
  });
  server.setCookie({
    name: "email",
    value: user.email,
    expires: expiryDate,
    path: "/home",
  });
}

async function getCurrentUser(sessionId) {
  const [session] = await [
    ...db
      .query(
        `SELECT * FROM sessions WHERE JULIANDAY(datetime('now')) - JULIANDAY(created_at) < 7 AND uuid = ?`,
        [sessionId]
      )
      .asObjects()
  ]
  const [user] = await [
    ...db
      .query('SELECT * FROM users WHERE id = ?', [session.user_id])
      .asObjects()
  ]
  return user
}

async function showCountryData(server) {
  const { country } = await server.params;
  const countryDecoded = decodeURIComponent(country);
  const { indicator, startYear, endYear } = await server.body;

  const [countryExists] = [
    ...(await db.query(`SELECT ShortName FROM Country WHERE ShortName = ?`, [
      countryDecoded,
    ])),
  ];
  if (countryExists) {
    let query = `SELECT * FROM Indicators WHERE countryName = ?`;
    const queryFilters = [countryDecoded];

    if (indicator) {
      query += ` AND IndicatorName = ?`;
      queryFilters.push(indicator);
    }
    if (startYear) {
      query += ` AND Year BETWEEN ? AND ?`;
      queryFilters.push(startYear, endYear);
    }

    const countryData = [...(await db.query(query, queryFilters).asObjects())];
    if (countryData) {
      server.json(countryData, 200);
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
    `IF EXISTS (SELECT email, password FROM wbd-db WHERE email = ? AND password = ?)`[
      (email, password)
    ];
  if (exists) {
    await getSearchPage;
  } else {
    throw new Error("User not found");
  }
}
