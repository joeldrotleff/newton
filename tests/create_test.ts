import { assertEquals, assertStringIncludes } from "@std/assert";
import { createProject, swiftModuleName } from "../src/ios/create.ts";

Deno.test("swiftModuleName removes unsafe characters and prefixes leading numbers", () => {
  assertEquals(swiftModuleName("My Camera"), "MyCamera");
  assertEquals(swiftModuleName("freysa-ios"), "freysaios");
  assertEquals(swiftModuleName("123 Notes"), "App123Notes");
});

Deno.test("createProject writes a self-contained Newton iOS project", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const config = await createProject({
      name: "My Camera",
      output: tempDir,
      bundleId: "com.example.camera",
    });

    assertEquals(config.scheme, "MyCamera");
    assertEquals(config.project, "ios/MyCamera.xcodeproj");

    const project = await Deno.readTextFile(`${tempDir}/ios/MyCamera.xcodeproj/project.pbxproj`);
    assertStringIncludes(project, "PRODUCT_BUNDLE_IDENTIFIER = com.example.camera;");
    assertStringIncludes(project, 'INFOPLIST_KEY_CFBundleDisplayName = "My Camera";');

    const app = await Deno.readTextFile(`${tempDir}/ios/MyCamera/MyCameraApp.swift`);
    assertStringIncludes(app, "struct MyCameraApp: App");

    const newtonConfig = await Deno.readTextFile(`${tempDir}/newton.json`);
    assertStringIncludes(newtonConfig, '"scheme": "MyCamera"');

    const gitignore = await Deno.readTextFile(`${tempDir}/.gitignore`);
    assertStringIncludes(gitignore, ".newton/\n");
    assertEquals(gitignore.includes("newton.json"), false);

    const generatedFiles = await readGeneratedTextFiles(`${tempDir}/ios`);
    for (const contents of generatedFiles.values()) {
      assertEquals(contents.includes("__MODULE_NAME__"), false);
      assertEquals(contents.includes("__DISPLAY_NAME_SWIFT__"), false);
      assertEquals(contents.includes("${"), false);
      assertEquals(contents.includes("`;"), false);
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

async function readGeneratedTextFiles(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function readDirectory(path: string): Promise<void> {
    for await (const entry of Deno.readDir(path)) {
      const childPath = `${path}/${entry.name}`;
      if (entry.isDirectory) await readDirectory(childPath);
      else if (entry.isFile) files.set(childPath, await Deno.readTextFile(childPath));
    }
  }

  await readDirectory(root);
  return files;
}

Deno.test("createProject writes development team when provided", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    await createProject({
      name: "Team App",
      output: tempDir,
      bundleId: "com.example.teamapp",
      teamId: "4DQ648JWVG",
    });

    const project = await Deno.readTextFile(`${tempDir}/ios/TeamApp.xcodeproj/project.pbxproj`);
    assertStringIncludes(project, "DEVELOPMENT_TEAM = 4DQ648JWVG;");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
