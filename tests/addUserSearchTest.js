import {
  assertEquals,
  assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import Network from "../../WorldBankFrontend/world-bank-app/src/Components/Network.js";
import { DB } from "https://deno.land/x/sqlite@v2.5.0/mod.ts";

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

const startYear = 1960;
const endYear = 2015;
const network = new Network();

Deno.test(
  "Adds a search when addUserSearch called with right information",
  async () => {
    const indicator = "";
    const user_id = 1;
    const response = await network.addUserSearch(
      ["Afghanistan"],
      indicator,
      startYear,
      endYear,
      user_id
    );
    await response.text();
    assertEquals(response.status, 200);
  }
);

Deno.test(
  "Adds a search when addUserSearch called with right information and an indicator",
  async () => {
    const indicator = "tariff";
    const user_id = 1;
    const response = await network.addUserSearch(
      ["Afghanistan"],
      indicator,
      startYear,
      endYear,
      user_id
    );
    await response.text();
    assertEquals(response.status, 200);
  }
);

Deno.test(
  "Adds a search when addUserSearch called with two countries",
  async () => {
    const indicator = "";
    const user_id = 1;
    const response = await network.addUserSearch(
      ["Afghanistan", "Albania"],
      indicator,
      startYear,
      endYear,
      user_id
    );
    await response.text();
    assertEquals(response.status, 200);
  }
);

Deno.test("Doesn't add search when user_id is missing", async () => {
  const indicator = "";

  const response = await network.addUserSearch(
    ["Afghanistan"],
    indicator,
    startYear,
    endYear,
    undefined
  );
  await response.text();
  assertEquals(response.status != 200, true);
});

Deno.test(
  "Doesn't add search when country, startYear or endYear is missing",
  async () => {
    const indicator = "";
    const user_id = 1;
    const response = await network.addUserSearch(
      undefined,
      indicator,
      startYear,
      startYear,
      user_id
    );
    await response.text();
    assertEquals(response.status != 200, true);

    const response2 = await network.addUserSearch(
      ["Afghanistan"],
      indicator,
      undefined,
      endYear,
      user_id
    );
    await response2.text();
    assertEquals(response2.status != 200, true);

    const response3 = await network.addUserSearch(
      ["Afghanistan"],
      indicator,
      undefined,
      endYear,
      user_id
    );
    await response3.text();
    assertEquals(response3.status != 200, true);
  }
);

await Deno.remove("mockDB.db");
