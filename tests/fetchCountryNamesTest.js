import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import Network from "../../WorldBankFrontend/world-bank-app/src/Components/Network.js";

const network = new Network();

Deno.test("fetchCountryNames fetches all countries", async () => {
  const countries = await network.fetchCountryNames();
  assertEquals(countries.length === 247, true);
});
