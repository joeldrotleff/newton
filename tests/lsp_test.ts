import { assertEquals } from "@std/assert";
import { updateBuildServerConfig, xcodeBuildServerWorkspacePath } from "../src/commands/lsp.ts";

Deno.test("xcodeBuildServerWorkspacePath maps project containers to their workspace", () => {
  assertEquals(
    xcodeBuildServerWorkspacePath({ kind: "project", path: "/tmp/AtomChatbot.xcodeproj" }),
    "/tmp/AtomChatbot.xcodeproj/project.xcworkspace",
  );
});

Deno.test("updateBuildServerConfig preserves generated config while pinning Newton paths", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      "buildServer.json",
      JSON.stringify({
        name: "xcode build server",
        kind: "xcode",
        scheme: "AtomChatbot",
        build_root: "/Users/joel/Library/Developer/Xcode/DerivedData/AtomChatbot-abc",
      }),
    );

    const workspace = xcodeBuildServerWorkspacePath({
      kind: "project",
      path: `${tempDir}/AtomChatbot.xcodeproj`,
    });
    await updateBuildServerConfig("buildServer.json", ".newton/DerivedData", workspace);

    const config = JSON.parse(await Deno.readTextFile("buildServer.json"));
    assertEquals(config.kind, "xcode");
    assertEquals(config.scheme, "AtomChatbot");
    assertEquals(config.workspace, `${tempDir}/AtomChatbot.xcodeproj/project.xcworkspace`);
    assertEquals(config.build_root, `${Deno.cwd()}/.newton/DerivedData`);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
