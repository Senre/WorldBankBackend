import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import Network from "../../WorldBankFrontend/world-bank-app/src/Components/Network.js";

const minYear = 1960;
const maxYear = 2015;
const network = new Network();

// need server.js in backend to be running

Deno.test("Get indicators only for a given country", async () => {
  const searchedCountry = "Afghanistan";
  const countryData = await network.fetchCountryData(
    searchedCountry,
    "",
    minYear,
    maxYear
  );

  assertEquals(countryData[0].countryname, searchedCountry);
  assertEquals(countryData[1].countryname, searchedCountry);
  assertEquals(countryData[2].countryname, searchedCountry);
  assertEquals(countryData[1000].countryname, searchedCountry);
  assertEquals(countryData[17401].countryname, searchedCountry);
});

Deno.test("Returns an error when invalid country name is used", async () => {
  const countryData = await network.fetchCountryData(
    "vkhjuhillijjljlk",
    "",
    minYear,
    maxYear
  );
  assertEquals(
    countryData.message,
    "400: Bad Request. That country does not exist in our database"
  );
});

Deno.test("Encodes and decodes fetch requests properly", async () => {
  const searchedCountry = "Côte d'Ivoire";
  const countryData = await network.fetchCountryData(
    searchedCountry,
    "",
    minYear,
    maxYear
  );
  console.log(countryData);
});

// encoder and decoders
// test indicator
// test start and end year
// test both indicator and years
// error when country but no results
// try sql injection
