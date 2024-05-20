import os from "os";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import util from "util";
import { exec } from "child_process";
import { installTailwind } from "./tailwind";
import { PresetDetails, PrimeConfig } from "../interface/preset";
import { getEngine } from "./project";
import { Engine } from "../interface/base";

export async function exportPresets(
	preset: string,
	presetName: string,
	components: string[],
	projectType: string = "vue"
) {
	const cacheDirectory = getCacheDirectory();
	const currentDir = process.cwd();
	const engine = getEngine();
	const engineBasedPath = engine === Engine.Vite ? "src" : "";
	const presetDir = path.join(
		currentDir,
		engineBasedPath,
		"presets",
		presetName
	);

	await fs.promises.mkdir(presetDir, { recursive: true });

	let indexContent = "import global from './global.js';\n";

	for (let component of components) {
		const filePath = path.join(
			cacheDirectory,
			"presets",
			projectType,
			preset,
			component,
			"index.js"
		);

		if (!fs.existsSync(filePath)) {
			continue;
		}

		const componentDir = path.join(presetDir, component);
		await fs.promises.mkdir(componentDir, { recursive: true });

		const fileContent = await fs.promises.readFile(filePath, "utf-8");

		await fs.promises.writeFile(
			path.join(presetDir, component, "index.js"),
			fileContent
		);

		const presetData = {
			name: presetName,
			type: preset,
			source: `https://github.com/primefaces/primevue-tailwind/tree/main/presets/${preset}`,
			components
		};

		await fs.promises.writeFile(
			path.join(presetDir, "preset.config.json"),
			JSON.stringify(presetData, null, 2)
		);

		indexContent += `import ${component} from './${component}';\n`;
	}

	const globalContent = await fs.promises.readFile(
		path.join(cacheDirectory, "presets", projectType, preset, "global.js"),
		"utf-8"
	);

	await fs.promises.writeFile(
		path.join(presetDir, "global.js"),
		globalContent
	);

	indexContent +=
		"\nexport default {\n    global,\n    " +
		components.join(",\n    ") +
		"\n};";
	await fs.promises.writeFile(path.join(presetDir, "index.js"), indexContent);

	await addPresetToPrimeConfig({
		name: presetName,
		base: preset,
		path: presetDir
	});

	return presetDir;
}

export async function presetSelection(projectType: string = "vue") {
	const cacheDirectory = getCacheDirectory();

	let builder;
	builder = JSON.parse(
		fs.readFileSync(
			path.join(cacheDirectory, "presets", projectType, "builder.json"),
			"utf-8"
		)
	);

	const componentChoices = Object.values(builder.data).flatMap(
		(category: any) =>
			category.components
				.filter((component: any) => !component.disabled)
				.map((component: any) => ({
					name: component.name,
					value: component.path,
					checked: !component.disabled,
					disabled: component.disabled
				}))
	);

	let presetCohices = builder.presets.map((preset: any) => ({
		name: preset.name,
		value: preset.value
	}));

	// This will be removed after official presets or preset marketplace is available
	presetCohices = presetCohices.filter(
		(preset: any) => preset.value === "lara"
	);

	presetCohices.unshift({ name: "None", value: "none" });

	const presetAnswer = await inquirer.prompt({
		type: "list",
		name: "preset",
		message: "Which preset do you want to use?",
		choices: presetCohices
	});

	if (presetAnswer.preset === "none") {
		return { presetDir: "", name: "", components: "" };
	}

	const questions = [
		{
			type: "input",
			name: "name",
			message: "What is your preset name?",
			default: "myPreset"
		},
		{
			type: "checkbox",
			name: "components",
			message: "Which components do you want to use?",
			choices: componentChoices
		}
	];

	let presetDir;

	const answers = await inquirer.prompt(questions);
	const { name, components } = answers;

	presetDir = await exportPresets(presetAnswer.preset, name, components);

	return { presetDir, name, components };
}

async function deleteFolderRecursive(folderPath: string) {
	if (fs.existsSync(folderPath)) {
		for (const entry of await fs.promises.readdir(folderPath, {
			withFileTypes: true
		})) {
			const currentPath = path.join(folderPath, entry.name);
			if (entry.isDirectory()) {
				await deleteFolderRecursive(currentPath);
			} else {
				await fs.promises.unlink(currentPath);
			}
		}
		await fs.promises.rmdir(folderPath);
	}
}

async function updateBuilderJson(
	builderJsonPath: string,
	presetNames: string[]
) {
	try {
		const builderData = JSON.parse(
			await fs.promises.readFile(builderJsonPath, "utf8")
		);
		builderData.presets = presetNames.map((name) => ({
			name: name,
			value: name.toLowerCase()
		}));
		await fs.promises.writeFile(
			builderJsonPath,
			JSON.stringify(builderData, null, 2)
		);
	} catch (error) {
		console.error("Error updating builder.json:", error);
	}
}

async function cloneAndFilterRepo(
	repoUrl: string,
	branchName: string,
	subFolderPath: string,
	outputPath: string,
	additionalFiles: string[]
) {
	const cacheDirectory = getCacheDirectory();

	try {
		const execProm = util.promisify(exec);
		const tempDir = path.join(cacheDirectory, "temp-clone");

		console.log(`Clontoing the reposiry ${repoUrl}...`);
		await execProm(
			`git clone --depth 1 --branch ${branchName} ${repoUrl} "${tempDir}"`
		);

		await fs.promises.mkdir(outputPath, { recursive: true });

		console.log(`Moving the folder ${subFolderPath}...`);
		const subFolderFullPath = path.join(tempDir, subFolderPath);
		const subFolderContents = await fs.promises.readdir(subFolderFullPath);
		for (const content of subFolderContents) {
			await fs.promises.rename(
				path.join(subFolderFullPath, content),
				path.join(outputPath, content)
			);
		}

		try {
			const presetNames = await fs.promises.readdir(
				path.join(outputPath)
			);

			for (const file of additionalFiles) {
				const fullFilePath = path.join(tempDir, file);
				const destFilePath = path.join(outputPath, path.basename(file));
				if (fs.existsSync(fullFilePath)) {
					await fs.promises.mkdir(outputPath, { recursive: true });
					await fs.promises.copyFile(fullFilePath, destFilePath);
				}
			}

			const builderJsonPath = path.join(outputPath, "builder.json");
			await updateBuilderJson(builderJsonPath, presetNames);
		} catch (error) {
			console.error("Error during additional file handling:", error);
			deleteCacheDirectory();
		}

		await deleteFolderRecursive(tempDir);

		console.log(
			`The '${subFolderPath}' folder and additional files have been successfully saved.`
		);
	} catch (error) {
		console.error("Error during repository clone and filter:", error);
		deleteCacheDirectory();
	}
}

export function deleteCacheDirectory() {
	const cacheDirectory = getCacheDirectory();
	fs.rm(cacheDirectory, { recursive: true }, (err) => {
		if (err) {
			console.error(`Error deleting cache directory: ${err.message}`);
		} else {
			console.log("Cache folder removed.");
		}
	});
}

function getCacheDirectory() {
	const homeDirectory = os.homedir();
	const cacheDirectory = path.join(homeDirectory, ".prime-cli");
	if (!fs.existsSync(cacheDirectory)) {
		fs.mkdirSync(cacheDirectory, { recursive: true });
	}
	return cacheDirectory;
}

function arePresetsCached(cacheDirectory: string, subFolderPath: string) {
	const presetsPath = path.join(cacheDirectory, subFolderPath);
	return fs.existsSync(presetsPath);
}

export async function handlePresets(projectName: string = "primevue") {
	const repoUrl = `https://github.com/primefaces/${projectName}-tailwind.git`;
	const branchName = "prod";
	const subFolderPath = `presets`;
	const folderPath = `presets/vue`;
	const additionalFiles = ["assets/data/builder.json", "package.json"];
	const cacheDirectory = getCacheDirectory();

	if (arePresetsCached(cacheDirectory, folderPath)) {
		console.log("Using cached presets.");
	} else {
		console.log("Downloading presets...");
		const outputPath = path.join(cacheDirectory, folderPath);
		await cloneAndFilterRepo(
			repoUrl,
			branchName,
			subFolderPath,
			outputPath,
			additionalFiles
		);
		console.log("Presets downloaded and cached.");
	}
}

export const unstyledSetup = async () => {
	await handlePresets();
	await presetSelection();
	return await installTailwind();
};

export const downloadPresets = async () => {
	await handlePresets();
	return await presetSelection();
};

export const updateCachedPresets = async () => {
	deleteCacheDirectory();
	await handlePresets();
};

export const updateWorkspacePreset = async () => {
	const presetPathAnswer = await inquirer.prompt([
		{
			type: "input",
			name: "path",
			message: "What is your preset or presets path?",
			default: "myPreset"
		}
	]);

	const presetPath = presetPathAnswer.path;

	const currentDir = process.cwd();
	const presetDir = path.join(currentDir, presetPath);
	const presetConfigPath = path.join(presetDir, "preset.config.json");

	const presetConfig = JSON.parse(fs.readFileSync(presetConfigPath, "utf-8"));

	const { type, components } = presetConfig;

	await compareAndApplyUpdates(presetDir, type, components);
};

async function addPresetToPrimeConfig(presetDetails: PresetDetails) {
	const primeConfigPath = path.join(process.cwd(), "prime.config.json");
	let primeConfig: PrimeConfig = { presets: [] };

	if (fs.existsSync(primeConfigPath)) {
		const configContents = await fs.promises.readFile(
			primeConfigPath,
			"utf-8"
		);
		primeConfig = JSON.parse(configContents);
	}

	const existingPresetIndex = primeConfig.presets.findIndex(
		(p) => p.name === presetDetails.name
	);

	if (existingPresetIndex !== -1) {
		primeConfig.presets[existingPresetIndex] = presetDetails;
	} else {
		primeConfig.presets.push(presetDetails);
	}

	await fs.promises.writeFile(
		primeConfigPath,
		JSON.stringify(primeConfig, null, 2)
	);
}

async function compareAndApplyUpdates(
	presetDir: string,
	preset: string,
	components: string
) {
	const cachedPresetDir = path.join(
		getCacheDirectory(),
		"presets",
		"vue",
		preset
	);

	try {
		for (const component of components) {
			await overwriteComponent(component, presetDir, cachedPresetDir);
		}
		console.log("✅ Project preset components updated!");
	} catch (error) {
		console.error("Error updating preset components:", error);
	}
}

async function overwriteComponent(
	component: string,
	projectPresetDir: string,
	cachedPresetDir: string
) {
	console.log(`Updating component ${component}...`);

	const sourcePath = path.join(cachedPresetDir, component, "index.js");
	const destinationPath = path.join(projectPresetDir, component);

	if (!fs.existsSync(sourcePath)) {
		console.error(`Source component ${component} not found in cache.`);
		return;
	}

	if (!fs.existsSync(destinationPath)) {
		console.error(
			`Destination component ${component} not found in project.`
		);
		return;
	}

	const indexJsPath = path.join(destinationPath, "index.js");

	if (fs.existsSync(indexJsPath)) {
		fs.unlinkSync(indexJsPath);
		console.log(`index.js removed from ${destinationPath}`);
	} else {
		console.error(`index.js not found in ${destinationPath}`);
	}

	await fs.promises.copyFile(
		sourcePath,
		path.join(destinationPath, "index.js")
	);
}

export const uninstall = async () => {
	await deleteCacheDirectory();
	await exec(
		"npm uninstall prime-cmd && npm uninstall prime-cmd -g",
		(error, stdout, stderr) => {
			if (error) {
				console.error(`Error uninstalling nuxt-primevue: ${error}`);
				return;
			}
			console.log(stdout);
		}
	);
};
