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

Deno.test("Receive all user searches when getUserSearches called", async () => {
  const user_id = 1;
  const response1 = await network.addUserSearch(
    ["Afghanistan"],
    "tariff",
    startYear,
    endYear,
    user_id
  );
  const response2 = await network.addUserSearch(
    ["Bulgaria", "Albania"],
    "",
    2010,
    2012,
    user_id
  );
  const response3 = await network.addUserSearch(
    ["Congo"],
    "population",
    startYear,
    1990,
    user_id
  );
  await response1.text();
  await response2.text();
  await response3.text();
  const searches = await network.getUserSearches(user_id);
  console.log(searches);
  assertEquals(searches.length, 3);
});

await Deno.remove("mockDB.db");
