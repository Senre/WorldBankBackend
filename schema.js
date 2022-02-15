import { DB } from "https://deno.land/x/sqlite/mod.ts";

try {
  await Deno.remove("wbd-db.db");
} catch {
  // nothing to remove
}

const db = new DB("./wbd-db.db");

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
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    search_terms 
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`
);

//run using
// deno run --allow-net --allow-read --allow-write schema.js
