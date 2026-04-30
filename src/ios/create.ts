import { fail } from "../util/errors.ts";
import { dirname, exists, join, relative, resolve } from "../util/paths.ts";
import { ensureInitGitignoreEntries, NewtonConfig, writeConfig } from "./config.ts";

export interface CreateProjectOptions {
  name: string;
  output?: string;
  bundleId?: string;
  teamId?: string;
}

interface ProjectNames {
  displayName: string;
  moduleName: string;
  bundleId: string;
  teamId?: string;
  root: string;
  iosDir: string;
  sourceDir: string;
  projectDir: string;
}

export async function createProject(options: CreateProjectOptions): Promise<NewtonConfig> {
  const names = projectNames(options);
  await ensureCreateSafe(names);

  await writeProjectFiles(names);

  const config: NewtonConfig = {
    scheme: names.moduleName,
    project: relative(names.root, names.projectDir),
  };

  await writeConfig(config, names.root);
  const cwd = Deno.cwd();
  try {
    Deno.chdir(names.root);
    await ensureInitGitignoreEntries();
  } finally {
    Deno.chdir(cwd);
  }

  return config;
}

export function swiftModuleName(name: string): string {
  const sanitized = name.replace(/[^A-Za-z0-9_]/g, "");
  if (!sanitized) fail("Project name must contain at least one letter, number, or underscore.");
  return /^[0-9]/.test(sanitized) ? `App${sanitized}` : sanitized;
}

function projectNames(options: CreateProjectOptions): ProjectNames {
  const root = resolve(options.output ?? Deno.cwd());
  const moduleName = swiftModuleName(options.name);
  const iosDir = join(root, "ios");
  return {
    displayName: options.name,
    moduleName,
    bundleId: options.bundleId ?? `com.example.${moduleName}`,
    teamId: options.teamId,
    root,
    iosDir,
    sourceDir: join(iosDir, moduleName),
    projectDir: join(iosDir, `${moduleName}.xcodeproj`),
  };
}

async function ensureCreateSafe(names: ProjectNames): Promise<void> {
  if (await exists(names.iosDir)) fail(`${names.iosDir} already exists; not overwriting.`);
  if (await exists(join(names.root, "newton.json"))) {
    fail(`${join(names.root, "newton.json")} already exists; not overwriting.`);
  }
}

async function writeProjectFiles(names: ProjectNames): Promise<void> {
  await writeText(join(names.projectDir, "project.pbxproj"), projectPbxproj(names));
  await writeText(
    join(names.projectDir, "project.xcworkspace", "contents.xcworkspacedata"),
    workspaceData,
  );

  await writeText(join(names.sourceDir, `${names.moduleName}App.swift`), appSwift(names));
  await writeText(join(names.sourceDir, "ContentView.swift"), contentViewSwift(names));
  await writeText(join(names.sourceDir, "CameraScreen.swift"), cameraScreenSwift);
  await writeText(join(names.sourceDir, "Assets.xcassets", "Contents.json"), assetCatalogJson);
  await writeText(
    join(names.sourceDir, "Assets.xcassets", "AccentColor.colorset", "Contents.json"),
    accentColorJson,
  );
  await writeText(
    join(names.sourceDir, "Assets.xcassets", "AppIcon.appiconset", "Contents.json"),
    appIconJson,
  );
}

async function writeText(path: string, contents: string): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, contents);
}

function pbxString(value: string): string {
  if (/^[A-Za-z0-9_.$/]+$/.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function projectPbxproj(names: ProjectNames): string {
  const module = names.moduleName;
  const displayName = pbxString(names.displayName);
  const bundleId = pbxString(names.bundleId);
  const developmentTeam = names.teamId
    ? `\n\t\t\t\tDEVELOPMENT_TEAM = ${pbxString(names.teamId)};`
    : "";
  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 77;
	objects = {

/* Begin PBXFileReference section */
		5D2CAEB82FA173B100F3E60A /* ${module}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ${module}.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */

/* Begin PBXFileSystemSynchronizedRootGroup section */
		5D2CAEBA2FA173B100F3E60A /* ${module} */ = {
			isa = PBXFileSystemSynchronizedRootGroup;
			path = ${module};
			sourceTree = "<group>";
		};
/* End PBXFileSystemSynchronizedRootGroup section */

/* Begin PBXFrameworksBuildPhase section */
		5D2CAEB52FA173B100F3E60A /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		5D2CAEAF2FA173B100F3E60A = {
			isa = PBXGroup;
			children = (
				5D2CAEBA2FA173B100F3E60A /* ${module} */,
				5D2CAEB92FA173B100F3E60A /* Products */,
			);
			sourceTree = "<group>";
		};
		5D2CAEB92FA173B100F3E60A /* Products */ = {
			isa = PBXGroup;
			children = (
				5D2CAEB82FA173B100F3E60A /* ${module}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		5D2CAEB72FA173B100F3E60A /* ${module} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 5D2CAEC32FA173B200F3E60A /* Build configuration list for PBXNativeTarget \"${module}\" */;
			buildPhases = (
				5D2CAEB42FA173B100F3E60A /* Sources */,
				5D2CAEB52FA173B100F3E60A /* Frameworks */,
				5D2CAEB62FA173B100F3E60A /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			fileSystemSynchronizedGroups = (
				5D2CAEBA2FA173B100F3E60A /* ${module} */,
			);
			name = ${module};
			packageProductDependencies = (
			);
			productName = ${module};
			productReference = 5D2CAEB82FA173B100F3E60A /* ${module}.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		5D2CAEB02FA173B100F3E60A /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1600;
				LastUpgradeCheck = 1600;
				TargetAttributes = {
					5D2CAEB72FA173B100F3E60A = {
						CreatedOnToolsVersion = 16.0;
					};
				};
			};
			buildConfigurationList = 5D2CAEB32FA173B100F3E60A /* Build configuration list for PBXProject \"${module}\" */;
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 5D2CAEAF2FA173B100F3E60A;
			minimizedProjectReferenceProxies = 1;
			preferredProjectObjectVersion = 77;
			productRefGroup = 5D2CAEB92FA173B100F3E60A /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				5D2CAEB72FA173B100F3E60A /* ${module} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		5D2CAEB62FA173B100F3E60A /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		5D2CAEB42FA173B100F3E60A /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		5D2CAEC12FA173B200F3E60A /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LOCALIZATION_PREFERS_STRING_CATALOGS = YES;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		5D2CAEC22FA173B200F3E60A /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LOCALIZATION_PREFERS_STRING_CATALOGS = YES;
				MTL_ENABLE_DEBUG_INFO = NO;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
		5D2CAEC42FA173B200F3E60A /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;${developmentTeam}
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_KEY_CFBundleDisplayName = ${displayName};
				INFOPLIST_KEY_NSCameraUsageDescription = "This app uses the camera to show a live preview.";
				INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;
				INFOPLIST_KEY_UILaunchScreen_Generation = YES;
				INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
				INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				STRING_CATALOG_GENERATE_SYMBOLS = YES;
				SWIFT_APPROACHABLE_CONCURRENCY = YES;
				SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		5D2CAEC52FA173B200F3E60A /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;${developmentTeam}
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_KEY_CFBundleDisplayName = ${displayName};
				INFOPLIST_KEY_NSCameraUsageDescription = "This app uses the camera to show a live preview.";
				INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;
				INFOPLIST_KEY_UILaunchScreen_Generation = YES;
				INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
				INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				STRING_CATALOG_GENERATE_SYMBOLS = YES;
				SWIFT_APPROACHABLE_CONCURRENCY = YES;
				SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		5D2CAEB32FA173B100F3E60A /* Build configuration list for PBXProject \"${module}\" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				5D2CAEC12FA173B200F3E60A /* Debug */,
				5D2CAEC22FA173B200F3E60A /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		5D2CAEC32FA173B200F3E60A /* Build configuration list for PBXNativeTarget \"${module}\" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				5D2CAEC42FA173B200F3E60A /* Debug */,
				5D2CAEC52FA173B200F3E60A /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 5D2CAEB02FA173B100F3E60A /* Project object */;
}
`;
}

const workspaceData = `<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "self:">
   </FileRef>
</Workspace>
`;

function appSwift(names: ProjectNames): string {
  return `import SwiftUI

@main
struct ${names.moduleName}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;
}

function contentViewSwift(names: ProjectNames): string {
  return `import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(.tint)

                VStack(spacing: 8) {
                    Text("${names.displayName}")
                        .font(.largeTitle.weight(.bold))

                    Text("A Newton starter app with a camera preview screen.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                NavigationLink {
                    CameraScreen()
                } label: {
                    Label("Open Camera", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    ContentView()
}
`;
}

const cameraScreenSwift = `import AVFoundation
import SwiftUI
import UIKit

struct CameraScreen: View {
    @State private var authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        content
            .navigationTitle("Camera")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
            }
    }

    @ViewBuilder
    private var content: some View {
        switch authorizationStatus {
        case .authorized:
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                BasicCameraView()
                    .ignoresSafeArea(edges: .bottom)
            } else {
                ContentUnavailableView(
                    "Camera Unavailable",
                    systemImage: "camera.slash",
                    description: Text("Run on a physical device to see the live camera preview.")
                )
            }

        case .notDetermined:
            VStack(spacing: 16) {
                Image(systemName: "camera")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)

                Text("Camera Access")
                    .font(.title2.weight(.semibold))

                Text("Grant camera access to show a live preview.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    Task { await requestCameraAccess() }
                } label: {
                    Label("Allow Camera", systemImage: "camera.fill")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()

        case .denied, .restricted:
            ContentUnavailableView(
                "Camera Access Needed",
                systemImage: "camera.badge.ellipsis",
                description: Text("Enable camera access in Settings to use this screen.")
            )

        @unknown default:
            ContentUnavailableView(
                "Camera Status Unknown",
                systemImage: "questionmark.circle",
                description: Text("The app could not determine camera authorization status.")
            )
        }
    }

    private func requestCameraAccess() async {
        _ = await AVCaptureDevice.requestAccess(for: .video)
        authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    }
}

private struct BasicCameraView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.showsCameraControls = true
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_: UIImagePickerController, context _: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {}
}

#Preview {
    NavigationStack {
        CameraScreen()
    }
}
`;

const assetCatalogJson = `{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
`;

const accentColorJson = `{
  "colors" : [
    {
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
`;

const appIconJson = `{
  "images" : [
    {
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "tinted"
        }
      ],
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
`;
