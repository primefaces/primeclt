import fs from "fs";
import { Engine } from "../interface/base";
import path from "path";

const hasDependency = (
	depName: string,
	packageJsonPath: string = "package.json"
): boolean => {
	const dependency = getDependency(depName, packageJsonPath);

	return !!dependency;
};

const getDependency = (
	packageName: string,
	packageJsonPath: string = "package.json"
) => {
	let packageJson: any;

	try {
		packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
	} catch (error) {
		console.error("Error reading package.json file: ", error);
		return false;
	}

	const { dependencies, devDependencies } = packageJson;

	return dependencies[packageName] || devDependencies[packageName];
};

const getFramework = () => {
	if (hasDependency("vue")) {
		return "vue";
	} else if (hasDependency("@angular/core")) {
		return "angular";
	} else if (hasDependency("react")) {
		return "react";
	} else if (!hasDependency("react") && fs.existsSync("index.html")) {
		return "js";
	}
};

const checkProjectTypes = () => {
	const framework = getFramework();
	let subTypes = {
		nuxt: false,
		vite: false,
		typescript: false
	};

	if (framework === "vue") {
		subTypes = {
			nuxt: hasDependency("nuxt"),
			vite: hasDependency("vite"),
			typescript: hasDependency("typescript")
		};
	}

	return { framework, subTypes };
};

const getEngine = () => {
	const { subTypes } = checkProjectTypes();

	if (subTypes.vite) {
		return Engine.Vite;
	} else {
		return Engine.Nuxt;
	}
};

const calculateRelativeImport = (
	presetDirectory: string,
	srcFolderPath: string
) => {
	const normalizedPresetDir = path.normalize(presetDirectory);
	const normalizedNuxtConfigPath = path.normalize(srcFolderPath);

	let relativePath = path.relative(
		normalizedNuxtConfigPath,
		normalizedPresetDir
	);

	relativePath = relativePath.replace(/\\/g, "/");

	const importPTValue = `./${relativePath}`;

	return importPTValue;
};

const checkBeta = () => {
	const isVite = hasDependency("vite");

	if (!isVite) {
		console.log("PrimeVue Beta is only available for Vite projects.");
		return false;
	}

	return true;
};

const checkPrimeVueV4 = () => {
	let primeVueVersion = getDependency("primevue");

	primeVueVersion = primeVueVersion.replace(/[^0-9.]/g, "");

	if (primeVueVersion && primeVueVersion.startsWith("4")) {
		return true;
	}

	return false;
};

export {
	hasDependency,
	getFramework,
	checkProjectTypes,
	getEngine,
	checkBeta,
	checkPrimeVueV4,
	getDependency,
	calculateRelativeImport
};
