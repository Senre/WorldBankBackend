import {
  assertEquals,
  assertExists,
} from "https://deno.land/std/testing/asserts.ts";
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

Deno.test("Can get all results that include indicator input", async () => {
  const countryData = await network.fetchCountryData(
    "Afghanistan",
    "population",
    minYear,
    maxYear
  );
  assertExists(countryData.length);
});

Deno.test("Can get all results within time frame from browser", async () => {
  const country = "Afghanistan";
  const startYear = 1990;
  const endYear = 2000;
  const response = await fetch(
    `http://localhost:8080/${encodeURIComponent(
      country
    )}?startYear=${startYear}&endYear=${endYear}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const countryData = await response.json();
  const dataInYearRange = countryData.every(
    (country) => country["year"] >= startYear && country["year"] <= endYear
  );
  assertEquals(dataInYearRange, true);
});

Deno.test(
  "Can get all results with indicator and within timeframe",
  async () => {
    const startYear = 1990;
    const endYear = 2000;
    const indicator = "undernourishment";
    const countryData = await network.fetchCountryData(
      "Afghanistan",
      indicator,
      startYear,
      endYear
    );
    const dataInYearRangeAndHasIndicator = countryData.every(
      (country) =>
        country["year"] >= startYear &&
        country["year"] <= endYear &&
        country.indicatorname.includes(indicator)
    );
    assertEquals(dataInYearRangeAndHasIndicator, true);
  }
);

Deno.test(
  "Can get all results if only startYear or endYear directly in browser",
  async () => {
    const country = "Afghanistan";
    const startYear = 1990;
    const endYear = 2000;
    const indicator = "undernourishment";
    const response = await fetch(
      `http://localhost:8080/${encodeURIComponent(
        country
      )}?indicator=${encodeURIComponent(indicator)}&startYear=${startYear}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const countryData = await response.json();
    const dataInYearRange = countryData.every(
      (country) => country["year"] >= startYear
    );
    assertEquals(dataInYearRange, true);

    const response2 = await fetch(
      `http://localhost:8080/${encodeURIComponent(
        country
      )}?indicator=${encodeURIComponent(indicator)}&endYear=${endYear}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const countryData2 = await response2.json();
    const dataInYearRange2 = countryData2.every(
      (country) => country["year"] <= endYear
    );
    assertEquals(dataInYearRange2, true);
  }
);

Deno.test("Fetch request Encodes and Decodes properly", async () => {
  const countryData = await network.fetchCountryData(
    "Hong Kong SAR, China",
    "Rural population",
    minYear,
    maxYear
  );
  assertExists(countryData.length);
});

Deno.test("Check for naming inconsistencies between tables", async () => {
  const searchedCountry = "Côte d'Ivoire";
  const searchedCountry2 = "Dem. Rep. Congo";
  const countryData = await network.fetchCountryData(
    searchedCountry,
    "tariff",
    minYear,
    maxYear
  );
  const countryData2 = await network.fetchCountryData(
    searchedCountry2,
    "tariff",
    minYear,
    maxYear
  );
  assertExists(countryData.length);
  assertExists(countryData2.length);
});

Deno.test(
  "Returns error when country exist, but no indicator results",
  async () => {
    const countryData = await network.fetchCountryData(
      "Afghanistan",
      "aaaaaaaaaaa",
      minYear,
      maxYear
    );
    console.log(countryData);
  }
);

// error when country but no results
// try sql injection
