import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import Network from "../../WorldBankFrontend/world-bank-app/src/Components/Network.js";

const network = new Network();

Deno.test("fetchIndicatorNames fetches all indicators", async () => {
  const indicators = await network.fetchIndicatorNames();
  assertEquals(indicators.length === 1344, true);
});
