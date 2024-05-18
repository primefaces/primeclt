import fs from "fs";
import { exec } from "child_process";
import { Project, Node, PropertyAssignment } from "ts-morph";
import tailwind from "../data/tailwind.json";
import { Engine } from "../interface/base";
import { getEngine } from "./project";

export async function installTailwind() {
	if (fs.existsSync(`${process.cwd()}/tailwind.config.js`)) {
		console.log("Tailwind is already installed.");
		await tailwindConfiguration();
		return;
	}

	console.log("Installing Tailwind CSS...");

	await exec(
		`npm install tailwindcss postcss autoprefixer`,
		async (error, stdout, stderr) => {
			console.log("Tailwind installation completed successfully.");
		}
	);

	await exec(`npx tailwindcss init -p`, async (error, stdout, stderr) => {
		await tailwindConfiguration();
	});
}

export async function checkTailwindInstalled(path?: string) {
	const fullPath = path ? path : process.cwd();
	const isTailwindInstalled = fs.existsSync(`${fullPath}/tailwind.config.js`);

	return isTailwindInstalled;
}

export async function getProjectTailwindContent(engine: Engine) {
	const content = tailwind[engine].content;
	return content;
}

export async function getProjectTailwindTheme(engine: Engine) {
	const theme = tailwind[engine].theme;
	return theme;
}

export async function modifyTailwindConfig(engine: Engine) {
	if (!engine) {
		console.log("Workspace information is missing.");
		return;
	}

	const project = new Project();
	const currentDir = process.cwd();
	const tailwindConfigPath = `${currentDir}/tailwind.config.js`;

	if (!fs.existsSync(tailwindConfigPath)) {
		console.log("Tailwind config file not found.");
		return;
	}

	const sourceFile = project.addSourceFileAtPath(tailwindConfigPath);
	const content = await getProjectTailwindContent(engine);
	const theme = await getProjectTailwindTheme(engine);
	const themeString = JSON.stringify(theme);
	const contentString = content.join(",\n    ");

	const exportAssignment = sourceFile.getExportAssignment(() => true);

	const configObject = exportAssignment?.getExpression();

	if (configObject && Node.isObjectLiteralExpression(configObject)) {
		const contentProperty = configObject.getProperty("content");

		if (contentProperty && Node.isPropertyAssignment(contentProperty)) {
			const contentInitializer = contentProperty.getInitializer();
			if (Node.isArrayLiteralExpression(contentInitializer)) {
				const existingElements = contentInitializer
					.getElements()
					.map((element) => element.getText());

				const uniqueElements = [
					...new Set([...existingElements, ...content])
				];

				contentInitializer.replaceWithText(
					`[${uniqueElements.join(", ")}]`
				);
			}
		} else {
			configObject.addPropertyAssignment({
				name: "content",
				initializer: `[${contentString}]`
			});
		}

		const themeProperty = configObject.getProperty("theme");

		if (themeProperty && Node.isPropertyAssignment(themeProperty)) {
			const themeInitializer = themeProperty.getInitializer();

			if (
				themeInitializer &&
				Node.isObjectLiteralExpression(themeInitializer)
			) {
				const extendProperty = themeInitializer.getProperty("extend");

				if (
					extendProperty &&
					Node.isPropertyAssignment(extendProperty)
				) {
					const extendInitializer = extendProperty.getInitializer();

					if (
						extendInitializer &&
						Node.isObjectLiteralExpression(extendInitializer)
					) {
						const colorsProperty =
							extendInitializer.getProperty("colors");

						if (
							colorsProperty &&
							Node.isPropertyAssignment(colorsProperty)
						) {
							const colorsInitializer =
								colorsProperty.getInitializer();

							if (
								colorsInitializer &&
								Node.isObjectLiteralExpression(
									colorsInitializer
								)
							) {
								const newColors = Object.entries(
									theme.extend.colors
								).map(([key, value]) => {
									key = JSON.stringify(key);
									value = JSON.stringify(value);
									const colorProperty =
										colorsInitializer.getProperty(key);

									if (!colorProperty) {
										return {
											key,
											value
										};
									}
								});

								newColors.forEach((color) => {
									if (color) {
										colorsInitializer.addPropertyAssignment(
											{
												name: color.key,
												initializer: color.value
											}
										);
									}
								});
							}
						} else {
							extendInitializer.addPropertyAssignment({
								name: "colors",
								initializer: JSON.stringify(theme.extend.colors)
							});
						}
					}
				} else {
					themeInitializer.addPropertyAssignment({
						name: "extend",
						initializer: JSON.stringify(theme.extend)
					});
				}
			}
		} else {
			configObject.addPropertyAssignment({
				name: "theme",
				initializer: themeString
			});
		}
	} else {
		console.log("Tailwind config file not found.");
		return;
	}

	await project.save();
	console.log("✅ Tailwind config updated successfully.");
}

export async function updateViteMainCSS() {
	try {
		const project = new Project();
		const currentDir = process.cwd();
		const tailwindConfigPath = `${currentDir}/src/style.css`;

		if (!fs.existsSync(tailwindConfigPath)) {
			console.log(
				"main css not found. Please add tailwind directives and root css options manually. Options:\n"
			);

			console.log(`${tailwind.directives.join("\n")}`);
			console.log(
				`:root {\n ${Object.entries(tailwind.vite.root)
					.map(([key, value]) => `    ${key}: ${value};`)
					.join("\n")}\n}`
			);

			return;
		}

		const indexCssFile = project.addSourceFileAtPath(tailwindConfigPath);
		const root = tailwind.vite.root;
		const directives = tailwind.directives;

		const rootCssOptionsCode = Object.entries(root)
			.filter(([key]) => !indexCssFile.getText().includes(key))
			.map(([key, value]) => `    ${key}: ${value};`)
			.join("\n");

		const rootCssOptions = rootCssOptionsCode
			? `\n:root {\n ${rootCssOptionsCode}\n}\n`
			: "";

		const directivesCode = directives
			.filter((directive) => !indexCssFile.getText().includes(directive))
			.join("\n");

		if (!indexCssFile) {
			console.log(
				"main css not found. Please add tailwind directives and root css options manually.\n"
			);
			console.log(`${directivesCode}${rootCssOptionsCode}`);
			return;
		}

		indexCssFile.insertText(0, `${directivesCode}${rootCssOptions}`);

		await indexCssFile.save();
		console.log(
			"✅ Tailwind directives added to main css file successfully."
		);
	} catch (error) {
		console.log(error);
	}
}

export async function nuxtConfiguration() {
	const project = new Project();
	const currentDir = process.cwd();
	const nuxtConfigPath = `${currentDir}/nuxt.config.ts`;
	const sourceFile = project.addSourceFileAtPath(nuxtConfigPath);

	const exportAssignment = sourceFile.getExportAssignment(() => true);
	const configObject = exportAssignment?.getExpression();

	if (configObject && Node.isCallExpression(configObject)) {
		const args = configObject.getArguments();
		if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
			const configObjectLiteral = args[0];
			let postcssProperty = configObjectLiteral.getProperty("postcss");

			if (!postcssProperty) {
				postcssProperty = configObjectLiteral.addPropertyAssignment({
					name: "postcss",
					initializer: "{ plugins: {} }"
				});
			}

			const postcssInitializer = (
				postcssProperty as PropertyAssignment
			).getInitializer();

			if (
				postcssInitializer &&
				Node.isObjectLiteralExpression(postcssInitializer)
			) {
				const pluginsProperty =
					postcssInitializer?.getProperty("plugins");

				const pluginsInitializer = (
					pluginsProperty as PropertyAssignment
				)?.getInitializer();

				if (
					pluginsProperty &&
					Node.isObjectLiteralExpression(pluginsInitializer)
				) {
					if (!pluginsInitializer.getProperty("tailwindcss")) {
						pluginsInitializer.addPropertyAssignment({
							name: "tailwindcss",
							initializer: "{}"
						});
					}

					if (!pluginsInitializer.getProperty("autoprefixer")) {
						pluginsInitializer.addPropertyAssignment({
							name: "autoprefixer",
							initializer: "{}"
						});
					}
				} else {
					postcssInitializer.addPropertyAssignment({
						name: "plugins",
						initializer: "{ tailwindcss: {}, autoprefixer: {} }"
					});
				}
			}
		}
	}

	await project.save();
}

export async function updateNuxtMainCSS() {
	const project = new Project();
	const currentDir = process.cwd();
	const nuxtMainStylePath = `${currentDir}/assets/css/main.css`;

	if (!fs.existsSync(nuxtMainStylePath)) {
		fs.mkdirSync(`${currentDir}/assets/css`, { recursive: true });
		fs.writeFileSync(nuxtMainStylePath, "");
	}

	const sourceFile = project.addSourceFileAtPath(nuxtMainStylePath);

	const root = tailwind.vite.root;
	const directives = tailwind.directives;

	const rootCssOptionsCode = Object.entries(root)
		.filter(([key]) => !sourceFile.getText().includes(key))
		.map(([key, value]) => `    ${key}: ${value};`)
		.join("\n");

	const rootCssOptions = rootCssOptionsCode
		? `\n:root {\n ${rootCssOptionsCode}\n}\n`
		: "";

	const directivesCode = directives
		.filter((directive) => !sourceFile.getText().includes(directive))
		.join("\n");

	sourceFile.insertText(0, `${directivesCode}${rootCssOptions}`);

	await sourceFile.save();
}

export async function tailwindConfiguration() {
	const engine = await getEngine();

	if (!engine) {
		console.log("Workspace information is missing.");
		return;
	}

	if (engine === Engine.Vite) {
		await updateViteMainCSS();
	} else if (engine === Engine.Nuxt) {
		await nuxtConfiguration();
		await updateNuxtMainCSS();
	}

	await modifyTailwindConfig(engine);
}
