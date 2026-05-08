import { assertEquals, assertRejects } from "@std/assert";
import { discoverProject } from "../src/ios/project.ts";
import { CONFIG_FILE } from "../src/ios/config.ts";

async function withTempCwd(work: (root: string) => Promise<void>): Promise<void> {
  const original = Deno.cwd();
  const root = await Deno.makeTempDir();
  Deno.chdir(root);
  try {
    await work(Deno.cwd());
  } finally {
    Deno.chdir(original);
    await Deno.remove(root, { recursive: true });
  }
}

Deno.test("discoverProject prefers project from newton.json over filesystem scan", async () => {
  await withTempCwd(async (root) => {
    await Deno.mkdir(`${root}/Other.xcodeproj`);
    await Deno.mkdir(`${root}/Configured.xcodeproj`);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ project: "Configured.xcodeproj" }),
    );

    const container = await discoverProject();
    assertEquals(container.kind, "project");
    assertEquals(container.path, `${root}/Configured.xcodeproj`);
  });
});

Deno.test("discoverProject prefers workspace from newton.json", async () => {
  await withTempCwd(async (root) => {
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ workspace: "App.xcworkspace" }),
    );

    const container = await discoverProject();
    assertEquals(container.kind, "workspace");
    assertEquals(container.path, `${root}/App.xcworkspace`);
  });
});

Deno.test("discoverProject picks the lone .xcworkspace over .xcodeproj", async () => {
  await withTempCwd(async (root) => {
    await Deno.mkdir(`${root}/App.xcodeproj`);
    await Deno.mkdir(`${root}/App.xcworkspace`);

    const container = await discoverProject();
    assertEquals(container.kind, "workspace");
    assertEquals(container.path, `${root}/App.xcworkspace`);
  });
});

Deno.test("discoverProject picks the lone .xcodeproj when no workspace exists", async () => {
  await withTempCwd(async (root) => {
    await Deno.mkdir(`${root}/App.xcodeproj`);

    const container = await discoverProject();
    assertEquals(container.kind, "project");
    assertEquals(container.path, `${root}/App.xcodeproj`);
  });
});

Deno.test("discoverProject ignores SPM-generated .swiftpm workspaces", async () => {
  await withTempCwd(async (root) => {
    await Deno.mkdir(`${root}/.swiftpm/xcode/package.xcworkspace`, { recursive: true });
    await Deno.mkdir(`${root}/App.xcodeproj`);

    const container = await discoverProject();
    assertEquals(container.kind, "project");
    assertEquals(container.path, `${root}/App.xcodeproj`);
  });
});

Deno.test("discoverProject fails when no Xcode container is found", async () => {
  await withTempCwd(async () => {
    await assertRejects(() => discoverProject(), Error, "No .xcworkspace or .xcodeproj found");
  });
});

Deno.test("discoverProject fails when multiple containers are found and config is empty", async () => {
  await withTempCwd(async (root) => {
    await Deno.mkdir(`${root}/A.xcodeproj`);
    await Deno.mkdir(`${root}/B.xcodeproj`);

    await assertRejects(
      () => discoverProject(),
      Error,
      "Multiple Xcode projects/workspaces found",
    );
  });
});
