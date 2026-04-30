import { assertEquals } from "@std/assert";
import { parseCertificateSubject } from "../src/ios/signing.ts";

Deno.test("parseCertificateSubject handles escaped RFC2253 subject values", () => {
  const fields = parseCertificateSubject(
    "subject=C=US,O=Eternis Labs\\, Inc.,OU=ZMQ7Q4Q5YJ,CN=Apple Development: Joel Drotleff (3BCR4YADG5),UID=FBS2SA3HBM",
  );

  assertEquals(fields.O, "Eternis Labs, Inc.");
  assertEquals(fields.OU, "ZMQ7Q4Q5YJ");
  assertEquals(fields.CN, "Apple Development: Joel Drotleff (3BCR4YADG5)");
});
