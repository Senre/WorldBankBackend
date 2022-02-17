import { Client } from "https://deno.land/x/postgres@v0.15.0/mod.ts";
const config =
  "postgres://czreijar:TJ2StTuQIl2CoRoinQTwPxk8pBGfdf6t@kandula.db.elephantsql.com/czreijar";
const client = new Client(config);

// const result = await client.queryArray(
//   `SELECT DISTINCT ShortName FROM countries`
// );

// console.log(result.rows.flat());

// const result2 = await client.queryArray(
//   `SELECT DISTINCT indicatorname FROM indicators`
// );

// console.log(result2.rows.flat());

const starttime = Date.now();

const indicatorInfo = await client.queryObject({
  text: `SELECT * FROM indicators WHERE countryName IN ($countryName, $secondCountryName) AND indicatorname = $indicator ORDER BY countryname, indicatorname`,
  args: {
    countryName: "Afghanistan",
    secondCountryName: "Albania",
    indicator: "urban population",
  },
});

// const indicatorInfo2 = await client.queryObject({
//   text: `SELECT * FROM indicators WHERE countryName = $countryName AND indicatorname = $indicator ORDER BY indicatorname`,
//   args: { countryName: "Afghanistan", indicator: "urban population" },
// });

// const indicatorInfo3 = await client.queryObject({
//   text: `SELECT * FROM indicators WHERE countryName = $countryName AND indicatorname = $indicator ORDER BY indicatorname`,
//   args: { countryName: "Albania", indicator: "urban population" },
// });

console.log(Date.now() - starttime);
