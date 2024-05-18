import inquirer from "inquirer";
import fs from "fs";
import { exec } from "child_process";
import { chdir, cwd } from "process";
import Spinner from "../utils/misc/spinner";
import {
	deleteCacheDirectory,
	downloadPresets,
	uninstall,
	updateCachedPresets,
	updateWorkspacePreset
} from "../utils/helpers/preset";
import frameworks from "../utils/data/frameworks.json";
import engines from "../utils/data/engines.json";
import {
	createVueViteProject,
	setPresetForVite,
	installPrimeVueViteV4
} from "../utils/helpers/vite";
import {
	installPrimeVueNuxt,
	createNuxtVueProject,
	setNuxtUnstyled,
	setPresetForNuxt,
	configureNuxtPrimeVue
} from "../utils/helpers/nuxt";
import {
	checkBeta,
	checkPrimeVueV4,
	checkProjectTypes,
	getEngine,
	hasDependency
} from "../utils/helpers/project";
import { Command } from "commander";
import OpenAI from "openai";
import { translateToTailwind } from "../utils/helpers/primeflex";
import { Engine, Framework } from "../utils/interface/base";
import {
	installTailwind,
	modifyTailwindConfig
} from "../utils/helpers/tailwind";

export const widgets = new Command("vue").description("PrimeVue CLI commands");

const spinner = new Spinner();

widgets.command("preset").action(async () => {
	const presetConfig = await downloadPresets();

	let presetDir = presetConfig?.presetDir;
	let name = presetConfig?.name;

	if (!presetDir) {
		console.log("Failed to download presets.");
		return;
	}

	const setup = await inquirer.prompt([
		{
			type: "confirm",
			name: "setup",
			message:
				"Would you like to set up your project with PrimeVue presets now?"
		}
	]);

	if (!setup.setup) {
		return;
	}

	const primevueInstalled = hasDependency("primevue");
	const { subTypes } = checkProjectTypes();

	if (!primevueInstalled) {
		const installPrimeVue = await inquirer.prompt([
			{
				type: "confirm",
				name: "installPrimeVue",
				message:
					"PrimeVue is not installed. Do you want to install PrimeVue?"
			}
		]);

		if (!installPrimeVue.installPrimeVue) {
			console.log(
				"PrimeVue is not installed. Please install PrimeVue to use presets."
			);

			return;
		}
	}

	if (subTypes.vite) {
		if (!primevueInstalled || !checkPrimeVueV4()) {
			await installPrimeVueViteV4(false);
		}

		await setPresetForVite(cwd(), presetDir, { presetDir, name });
	} else if (subTypes.nuxt) {
		await setPresetForNuxt(cwd(), presetDir);
	}

	await installTailwind();
});

widgets.command("update-cached-presets").action(async () => {
	await updateCachedPresets();
});

widgets.command("create").action(async () => {
	try {
		// Depreacted until all frameworks are supported
		// let choices = Object.values(frameworks).map((framework) => ({
		// 	...framework,
		// 	checked: false
		// }));

		// const projectTypeAnswers = await inquirer.prompt([
		// 	{
		// 		type: "list",
		// 		name: "projectType",
		// 		message: `Which framework do you want to use?`,
		// 		choices
		// 	}
		// ]);

		// const selectedFramework = projectTypeAnswers.projectType;

		// if (selectedFramework !== "vue") {
		// 	spinner.spinnerInfo(
		// 		`You are using ${selectedFramework} framework. PrimeCLI will support other frameworks in the future.`
		// 	);
		// 	return;
		// }

		const engineChoices = engines.vue.map((engine) => {
			return {
				...engine
			};
		});

		const engineTypeAnswers = await inquirer.prompt([
			{
				type: "list",
				name: "engineType",
				message: `Which engine do you want to use?`,
				choices: engineChoices
			}
		]);

		const selectedEngine = engineTypeAnswers.engineType;

		const projectNameAnswers = await inquirer.prompt([
			{
				type: "input",
				name: "projectName",
				default: "primevue-app",
				message: `What is your project name?`
			}
		]);

		if (selectedEngine === "vite") {
			const typescriptAnswers = await inquirer.prompt([
				{
					type: "confirm",
					name: "typescript",
					message: "Would you like to use TypeScript?"
				}
			]);

			await createVueViteProject(
				projectNameAnswers.projectName,
				typescriptAnswers.typescript
			);
		} else {
			console.log("Nuxt is not supported for beta version.");
			return;

			await createNuxtVueProject(projectNameAnswers.projectName);

			await chdir("./" + projectNameAnswers.projectName);
			await installPrimeVueNuxt();
			console.log(
				"Nuxt and PrimeVue installation completed successfully. You're ready to code! Project directory: cd " +
					projectNameAnswers.projectName
			);
		}
	} catch (err) {
		console.error(err);
		spinner.spinnerError("Failed to create Vue project");
	}
});

widgets.command("tw").action(async () => {
	const { framework, subTypes } = checkProjectTypes();

	if (framework !== "vue") {
		console.log(
			`You are using ${framework} framework. PrimeCLI will support other frameworks in the future.`
		);
		return;
	}

	modifyTailwindConfig(subTypes.vite ? Engine.Vite : Engine.Nuxt);
});

widgets.command("configure").action(async () => {
	if (!hasDependency("nuxt")) {
		await configureNuxtPrimeVue();
	} else {
	}
});

widgets.command("update-preset").action(async () => {
	await updateCachedPresets();
	await updateWorkspacePreset();
});

// const openai = new OpenAI({
// 	apiKey: "api-key"
// });

// widgets.command("ask").action(async () => {
// 	const { question } = await inquirer.prompt([
// 		{
// 			type: "input",
// 			name: "question",
// 			message: "What is your question?"
// 		}
// 	]);
// 	await openai.chat.completions
// 		.create({
// 			model: "gpt-4",
// 			messages: [{ role: "user", content: question }],
// 			max_tokens: 512
// 		})
// 		.then((response) => {
// 			console.log(response.choices[0].message.content?.trim());
// 		})
// 		.catch((err) => {
// 			console.log(err);
// 		});
// });

widgets.command("uninstall").action(async () => {
	await uninstall();
});

widgets.command("clear-cache").action(async () => {
	await deleteCacheDirectory();
});

widgets.command("install").action(async () => {
	const { framework, subTypes } = checkProjectTypes();

	if (!checkBeta()) {
		process.exit(1);
	}

	// THIS COMMANDS WILL BE USED IN THE FUTURE FOR OTHER FRAMEWORKS
	// let choices = Object.values(frameworks).map((framework) => ({
	// 	...framework,
	// 	checked: false
	// }));

	// const choice = choices.find((c) => c.value === framework);

	// if (choice) {
	// 	choice.name += " (default)";
	// }

	// const engineChoices = engines.vue.map((engine) => {
	// 	return {
	// 		...engine,
	// 		name:
	// 			engine.name +
	// 			(engine.value in subTypes &&
	// 			subTypes[engine.value as keyof typeof subTypes] === true
	// 				? " (default)"
	// 				: ""),
	// 		checked: false
	// 	};
	// });

	// const projectTypeAnswers = await inquirer.prompt([
	// {
	// 	type: "list",
	// 	name: "projectType",
	// 	default: framework,
	// 	message: `We detected that you are using ${framework} framework. We can add it for you. If you want to add manually please select your framework.`,
	// 	choices
	// },
	// {
	// 	type: "list",
	// 	name: "engineType",
	// 	default: subTypes.nuxt ? "nuxt" : "vite",
	// 	message: `We detected that you are using ${
	// 		subTypes.nuxt ? "Nuxt" : "Vite"
	// 	} engine. We can add it for you. If you want to add manually please select your engine from the list.`,
	// 	choices: engineChoices
	// }
	// ]);

	// const selectedFramework = projectTypeAnswers.projectType;

	if (framework !== "vue") {
		spinner.spinnerInfo(
			`You are using ${framework} framework. PrimeCLI will support other frameworks in the future.`
		);
		return;
	}

	const selectedEngine = subTypes.vite ? "vite" : "nuxt";

	if (selectedEngine === "nuxt") {
		console.log("Nuxt is not supported for beta version.");
		return;
		await installPrimeVueNuxt();
	} else {
		await installPrimeVueViteV4();
	}
});
