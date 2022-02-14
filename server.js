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

app.use(abcCors(corsInputs));

app.get('/searchpage' searchPageInfo)
.post("/login", checkUserLogin);

async function getSearchPage(server) {
    const query = 
      `SELECT  shortname, currencyunit, region
            FROM stories
            LEFT JOIN votes 
            ON stories.id = votes.story_id
            GROUP BY stories.id
            ORDER BY score DESC`
    const stories = await [
      ...db
        .query(
        
        )
        .asObjects()
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
