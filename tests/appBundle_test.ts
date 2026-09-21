import { assertEquals } from "@std/assert";
import { builtAppPath } from "../src/ios/appBundle.ts";

Deno.test("builtAppPath joins the app target's build dir and wrapper name", () => {
  const path = builtAppPath([
    { buildSettings: { WRAPPER_NAME: "QuestWidgets.appex", TARGET_BUILD_DIR: "/ignored" } },
    {
      buildSettings: {
        WRAPPER_NAME: "Quest.app",
        TARGET_BUILD_DIR: "/dd/Build/Products/QuestStaging Debug-iphonesimulator",
      },
    },
  ]);

  assertEquals(path, "/dd/Build/Products/QuestStaging Debug-iphonesimulator/Quest.app");
});

Deno.test("builtAppPath returns null without an app target", () => {
  assertEquals(builtAppPath([]), null);
  assertEquals(builtAppPath([{ buildSettings: { WRAPPER_NAME: "Tool.framework" } }]), null);
  assertEquals(builtAppPath([{ buildSettings: { WRAPPER_NAME: "Quest.app" } }]), null);
});
