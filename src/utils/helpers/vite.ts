import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import { pickPrimeIcons, pickStyledTheme } from "./answers";
import { calculateRelativeImport, hasDependency } from "./project";
import inquirer from "inquirer";
import Spinner from "../misc/spinner";
import { presetSelection } from "./preset";
import { installTailwind } from "./tailwind";

const spinner = new Spinner();

function sanitizePresetName(presetDirectory: string) {
	let presetName = presetDirectory.split(path.sep).pop() || "";

	presetName = presetName.replace(/[^a-zA-Z0-9_$]/g, "_");

	if (!/^[a-zA-Z_$]/.test(presetName)) {
		presetName = "_" + presetName;
	}

	return presetName;
}

function addPrimeVuePresetOption(
	mainFileContent: string,
	mainFilePath: string,
	presetDirectory: string
) {
	const presetName = sanitizePresetName(presetDirectory);
	const relativePresetPath = path.relative(
		path.dirname(mainFilePath),
		presetDirectory
	);
	const formattedRelativePath = relativePresetPath
		.replace(/\\/g, "/")
		.startsWith(".")
		? relativePresetPath.replace(/\\/g, "/")
		: `./${relativePresetPath.replace(/\\/g, "/")}`;

	const importStatement = `import ${presetName} from "${formattedRelativePath}";\n`;

	if (!mainFileContent.includes(importStatement)) {
		mainFileContent = importStatement + mainFileContent;
	}

	const primeVueUseRegex = /(\.use\(PrimeVue)(, \{[^\}]*\})?\)/;
	mainFileContent = mainFileContent.replace(
		primeVueUseRegex,
		(match, primeVueUse, existingOptions) => {
			let updatedOptions;
			if (existingOptions) {
				if (/\bpt:/.test(existingOptions)) {
					updatedOptions = existingOptions.replace(
						/(pt:\s*)[^,}]+/,
						`$1${presetName}`
					);
				} else {
					updatedOptions = existingOptions.replace(
						/\{/,
						`{ pt: ${presetName}, `
					);
				}
			} else {
				updatedOptions = `, { pt: ${presetName} }`;
			}
			return `${primeVueUse}${updatedOptions})`;
		}
	);

	return mainFileContent;
}

export async function setPresetForVite(
	projectPath: string,
	presetDirectory: string,
	preset?: null | { name: string; presetDir: string }
) {
	const isTypescript = hasDependency("typescript");
	let fileType = isTypescript ? "ts" : "js";

	const mainFilePath = path.join(projectPath, `src/main.${fileType}`);
	let mainFileContent = fs.readFileSync(mainFilePath, "utf8");
	const lines = addPrimeVuePresetOption(
		mainFileContent,
		mainFilePath,
		presetDirectory
	).split("\n");

	mainFileContent = lines.join("\n");

	fs.writeFileSync(mainFilePath, mainFileContent, "utf8");

	await primeVueViteConfiguration(
		projectPath,
		mainFilePath,
		fileType,
		"PrimeVueUnstyled",
		preset
	);
}

export async function createVueViteProject(
	projectName: string,
	typescript = false
) {
	const isWindows = process.platform === "win32";
	const createCommand =
		(isWindows ? "npm " : "") +
		`create vite@latest ${projectName} -- --template ${
			typescript ? "vue-ts" : "vue"
		}`;
	const cmd = isWindows ? "cmd" : "npm";
	const args = isWindows ? ["/c"] : [];
	args.push(createCommand);

	return new Promise((resolve, reject) => {
		const vueCreate = spawn(cmd, args, { stdio: "inherit", shell: true });

		vueCreate.on("error", reject);

		vueCreate.on("close", async (code) => {
			if (code !== 0) {
				reject(new Error("Failed to create Vite project"));
			} else {
				process.chdir(projectName);

				await installPrimeVueViteV4();
				resolve(true);
			}
		});
	});
}

export async function installPrimeVueViteV4(useConfiguration: boolean = true) {
	const installPrimeIcons = await pickPrimeIcons();

	await exec(
		`npm install primevue@beta ${
			installPrimeIcons ? "&& npm install primeicons" : ""
		}`,
		async (error, stdout, stderr) => {
			spinner.spinnerSuccess(
				"PrimeVue installation completed successfully."
			);

			if (useConfiguration) {
				await configuration();
			}

			console.log("✅ PrimeVue setup completed successfully.");
		}
	);
}

async function selectStyledTheme() {
	const answers = await inquirer.prompt([
		{
			type: "list",
			name: "selectedPreset",
			message: "Select a PrimeVue configuration",
			choices: [
				{ name: "Aura", value: "aura" },
				{ name: "Lara", value: "Lara" },
				{ name: "Nora", value: "Nora" }
			]
		}
	]);

	return answers.selectedPreset;
}

export async function advancedPrimeVueViteSetup(
	projectPath: string,
	selectedType: "PrimeVue" | "PrimeVueUnstyled",
	preset?: null | { name: string; presetDir: string }
) {
	if (selectedType === "PrimeVue") {
		const selectedPreset = await selectStyledTheme();

		const presetName = selectedPreset;
		const pathName = presetName.toLowerCase();

		console.log(selectedPreset);

		return {
			options: `{ theme: { preset: ${presetName}, options: { prefix: "p", darkModeSelector: "system", cssLayer: false }} }`,
			imports: [
				{
					path: `import ${presetName} from 'primevue/themes/${pathName}';`,
					name: presetName
				}
			]
		};
	} else if (selectedType === "PrimeVueUnstyled") {
		// PRESET SELECTION DISABLED FOR BETA RELEASE
		return {
			options: `{ unstyled: true }`,
			imports: []
		};

		const { presetDir, name } = preset ? preset : await presetSelection();
		const engineBasedPath = "src";
		const srcFolderPath = path.join(projectPath, engineBasedPath);

		if (!fs.existsSync(srcFolderPath)) {
			console.log("Invalid project path.");
		}

		if (!name || name === "") {
			console.log("Failed to download presets.");
		}

		const presetRelativePath = calculateRelativeImport(
			presetDir,
			srcFolderPath
		);

		const presetName = name.charAt(0).toUpperCase() + name.slice(1);
		const presetImport = `import ${presetName} from "${presetRelativePath}";`;
		const imports =
			presetImport && presetName
				? [{ path: presetImport, name: presetName }]
				: [];

		await installTailwind();

		return {
			options: `{ unstyled: true, pt: ${presetName} }`,
			imports: []
		};
	} else {
		return {
			options: ``
		};
	}
}

export async function importPrimeIcons(mainFilePath: string) {
	const packagePath = "primeicons/primeicons.css";
	const primeIconsCssPath = `import "${packagePath}"\n`;
	const projectPath = process.cwd();

	if (!fs.existsSync(mainFilePath)) {
		console.log("Main file not found. PrimeIcons import failed.");
		return;
	}

	let mainCssContent = fs.readFileSync(mainFilePath, "utf8");

	if (!mainCssContent.includes(packagePath)) {
		mainCssContent = primeIconsCssPath + mainCssContent;

		fs.writeFileSync(mainFilePath, mainCssContent);

		console.log("✅ PrimeIcons imported successfully.");
	}
}

export async function primeVueViteConfiguration(
	projectPath: string,
	mainFilePath: string,
	fileType: string,
	selectedType: "PrimeVue" | "PrimeVueUnstyled",
	preset?: null | { name: string; presetDir: string }
) {
	let options;

	let mainFileContent = fs.readFileSync(mainFilePath, "utf8");

	let setup = await advancedPrimeVueViteSetup(
		projectPath,
		selectedType,
		preset
	);

	options = setup?.options;

	if (selectedType === "PrimeVue" || selectedType === "PrimeVueUnstyled") {
		let imports = setup?.imports;

		if (imports) {
			imports.forEach((importStatement) => {
				if (!isImported(importStatement.name, mainFileContent)) {
					mainFileContent =
						importStatement.path + "\n" + mainFileContent;
				}
			});
		}
	}

	const existingImportRegex =
		/import\s+(?:\w+,\s*)?{?\s*(.*?)\s*}?\s+from\s+['"]primevue\/config['"]/;

	const importMatch = mainFileContent.match(existingImportRegex);
	let existingType: "PrimeVue" | "PrimeVueUnstyled" | null = null;

	if (importMatch) {
		const configImports = importMatch?.[1]
			.split(",")
			.map((name) => name.trim());

		if (configImports) {
			if (
				configImports.some(
					(importName) => importName === "PrimeVueUnstyled"
				)
			) {
				existingType = "PrimeVueUnstyled";
			} else if (
				configImports.some((importName) => importName === "PrimeVue")
			) {
				existingType = "PrimeVue";
			}
		}
	}

	if (existingType !== selectedType) {
		mainFileContent = importPrimeVueVite(
			mainFileContent,
			selectedType,
			existingType
		);
	}

	const isVariable = isCreateAppAssignedToVariable(mainFileContent);

	if (isVariable) {
		mainFileContent = addWithVariable4(
			mainFileContent,
			selectedType,
			options
		);
	} else {
		mainFileContent = addWithoutVariable4(
			mainFileContent,
			selectedType,
			options
		);
	}

	fs.writeFileSync(
		path.join(projectPath, `src/main.${fileType}`),
		mainFileContent
	);

	console.log(`✅ PrimeVue configured with ${selectedType}!`);
}

function removeUsePrimeVue(mainFileContent: string) {
	const usePattern = /\.use\(PrimeVue(?:Styled|Unstyled)?\s*[^)]*\)/gs;
	const outputCode = mainFileContent.replaceAll(usePattern, "");

	return outputCode;
}

function removeUsePrimeVueVariable(
	mainFileContent: string,
	variableName: string
) {
	const usePrimeVueRegex = new RegExp(
		`${variableName}\\.use\\((PrimeVue|PrimeVueUnstyled), \\{[\\s\\S]*?\\}\\);`,
		"g"
	);

	const outputCode = mainFileContent.replaceAll(usePrimeVueRegex, "");

	return outputCode;
}

function isImported(importName: string, content: string) {
	const importRegex = new RegExp(
		`import\\s+(\\* as )?${importName}(,\\s*\\{[^}]*\\})?\\s+from\\s+['"][^'"]+['"];`,
		"g"
	);
	const namedImportRegex = new RegExp(
		`import\\s+\\{[^}]*${importName}[^}]*\\}\\s+from\\s+['"][^'"]+['"];`,
		"g"
	);

	return importRegex.test(content) || namedImportRegex.test(content);
}

function addWithoutVariable4(
	mainFileContent: string,
	selectedType: string = "PrimeVue",
	options?: string
) {
	mainFileContent = removeUsePrimeVue(mainFileContent);

	const createAppPattern = /createApp\(\s*(\w+)\s*\)/;
	const createAppMatch = mainFileContent.match(createAppPattern);

	if (createAppMatch) {
		const appName = createAppMatch[1];
		mainFileContent = mainFileContent.replace(
			`createApp(${appName})`,
			`createApp(${appName}).use(${selectedType}${
				options ? `, ${options}` : ""
			})`
		);
	} else {
		console.error("Cannot find a suitable createApp() call to modify.");
	}

	return mainFileContent;
}

function addWithVariable4(
	mainFileContent: string,
	selectedType: string = "PrimeVue",
	options?: string
) {
	const createAppPattern = /const\s+(\w+)\s*=\s*createApp\(\s*(\w+)\s*\)/;
	const createAppMatch = mainFileContent.match(createAppPattern);

	if (createAppMatch) {
		const appName = createAppMatch[2];
		const variableName = createAppMatch[1];

		mainFileContent = removeUsePrimeVueVariable(
			mainFileContent,
			variableName
		);

		mainFileContent = removeUsePrimeVue(mainFileContent);

		mainFileContent = mainFileContent.replace(
			`createApp(${appName})`,
			`createApp(${appName}).use(${selectedType}${
				options ? `, ${options}` : ""
			})`
		);
	} else {
		console.error("Cannot find a suitable createApp() call to modify.");
	}

	return mainFileContent;
}

function importPrimeVueVite(
	mainFileContent: string,
	selectedType: string,
	existingType: string | null
) {
	const importStatement = `import ${selectedType} from 'primevue/config';\n`;

	if (existingType && existingType !== selectedType) {
		mainFileContent = mainFileContent.replaceAll(
			existingType,
			selectedType
		);

		return mainFileContent;
	}

	mainFileContent = importStatement + mainFileContent;

	return mainFileContent;
}

async function configuration() {
	const answers = await inquirer.prompt([
		{
			type: "list",
			name: "selectedType",
			message: "Select a PrimeVue configuration",
			choices: [
				{ name: "Styled", value: "PrimeVue" },
				{ name: "Unstyled", value: "PrimeVueUnstyled" }
			]
		}
	]);

	const projectPath = process.cwd();
	const isTypescript = hasDependency("typescript");
	const fileType = isTypescript ? "ts" : "js";
	const mainFilePath = path.join(projectPath, `src/main.${fileType}`);
	const primeIconsInstalled = hasDependency("primeicons");

	if (primeIconsInstalled) {
		await importPrimeIcons(mainFilePath);
	}

	await primeVueViteConfiguration(
		projectPath,
		mainFilePath,
		fileType,
		answers.selectedType
	);
}

function isCreateAppAssignedToVariable(mainFileContent: string): boolean {
	const createAppPattern = /(const\s+)?(\w+)?\s*=\s*createApp\((\w+)\)/;

	return createAppPattern.test(mainFileContent);
}
