import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";

const userDatabaseConfig =
  "postgres://cgfgilii:YQgWoyUWXmD0CWvww7Bs2QSWTJvFT14e@tyke.db.elephantsql.com/cgfgilii";
const userDatabase = new Client(userDatabaseConfig);

await userDatabase.connect();

await userDatabase.queryArray(`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
)`);

await userDatabase.queryArray(`CREATE TABLE sessions (
    uuid TEXT PRIMARY KEY,
    created_at timestamp with time zone NOT NULL,
    user_id INTEGER NOT NULL,cd test
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);

await userDatabase.queryArray(`CREATE TABLE searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    country TEXT NOT NULL,
    indicator TEXT,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    created_at timestamp with time zone NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

await userDatabase.end();
