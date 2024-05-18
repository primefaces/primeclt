import { exec, spawn } from "child_process";
import { Project, Node, PropertyAssignment, StructureKind } from "ts-morph";
import { pickPrimeIcons, pickStyledTheme } from "./answers";
import Spinner from "../misc/spinner";
import path from "path";
import fs from "fs";
import { installTailwind } from "./tailwind";
import { presetSelection } from "./preset";

const spinner = new Spinner();

export async function updateNuxtMainFile(
	nuxtConfigPath: string,
	installPrimeIcons: boolean = false
) {
	const project = new Project();
	const sourceFile = project.addSourceFileAtPath(
		nuxtConfigPath + "/nuxt.config.ts"
	);
	const exportAssignment = sourceFile.getExportAssignment(() => true);
	const configObject = exportAssignment?.getExpression();

	if (configObject && Node.isCallExpression(configObject)) {
		const args = configObject.getArguments();
		if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
			const configObjectLiteral = args[0];

			const modulesProperty = configObjectLiteral.getProperty("modules");
			if (modulesProperty && Node.isPropertyAssignment(modulesProperty)) {
				const initializer = (
					modulesProperty as PropertyAssignment
				).getInitializer();
				if (initializer && Node.isArrayLiteralExpression(initializer)) {
					const elements = initializer.getElements();
					if (
						!elements.some((e) =>
							e.getText().includes("nuxt-primevue")
						)
					) {
						initializer.addElement("'nuxt-primevue'");
					}
				}
			} else {
				configObjectLiteral.addProperty({
					name: "modules",
					kind: StructureKind.PropertyAssignment,
					initializer: "['nuxt-primevue']"
				});
			}

			const cssProperty = configObjectLiteral.getProperty("css");

			if (cssProperty && Node.isPropertyAssignment(cssProperty)) {
				const initializer = (
					cssProperty as PropertyAssignment
				).getInitializer();

				if (initializer && Node.isArrayLiteralExpression(initializer)) {
					const elements = initializer.getElements();
					const primeIconsCssPath = "'primeicons/primeicons.css'";

					const primevueThemeElement = elements.find((e) =>
						e.getText().includes("primevue/resources/themes")
					);

					if (primevueThemeElement) {
						initializer.removeElement(primevueThemeElement);
					}

					if (
						installPrimeIcons &&
						!elements.some((e) =>
							e.getText().includes("primeicons.css")
						)
					) {
						initializer.addElement(primeIconsCssPath);
					}
				}
			} else {
				if (installPrimeIcons) {
					configObjectLiteral.addProperty({
						name: "css",
						kind: StructureKind.PropertyAssignment,
						initializer: `['primeicons/primeicons.css']`
					});
				}
			}

			await project.save();

			const themeName = await pickStyledTheme();

			const installTheme = themeName !== "unstyled";
			const quickstart = themeName === "styled-quickstart";

			const oldPrimeVueProperty =
				configObjectLiteral.getProperty("primevue");

			if (oldPrimeVueProperty) {
				oldPrimeVueProperty.remove();
			}

			if (installTheme) {
				if (quickstart) {
					configObjectLiteral.addPropertyAssignment({
						name: "primevue",
						initializer: "{ usePrimeVue: true }"
					});
				} else {
					const primeonePathImport = sourceFile.getImportDeclaration(
						(declaration) => {
							const moduleSpecifier = declaration
								.getModuleSpecifier()
								.getLiteralText();
							return (
								moduleSpecifier === "primevue/themes/primeone"
							);
						}
					);

					if (!primeonePathImport) {
						sourceFile.addImportDeclaration({
							defaultImport: "PrimeOne",
							moduleSpecifier: "primevue/themes/primeone"
						});
					}

					const auraPathImport = sourceFile.getImportDeclaration(
						(declaration) => {
							const moduleSpecifier = declaration
								.getModuleSpecifier()
								.getLiteralText();
							return (
								moduleSpecifier ===
								"primevue/themes/primeone/aura"
							);
						}
					);

					if (!auraPathImport) {
						sourceFile.addImportDeclaration({
							defaultImport: "Aura",
							moduleSpecifier: "primevue/themes/primeone/aura"
						});
					}

					configObjectLiteral.addPropertyAssignment({
						name: "primevue",
						initializer:
							'{ base: PrimeOne, preset: Aura, options: { prefix: "p", darkModeSelector: "system", cssLayer: false} }'
					});
				}

				await project.save();
			} else {
				const { presetDir } = await presetSelection();

				await setPresetForNuxt(nuxtConfigPath, presetDir, project);
				project.save();

				await installTailwind();
			}

			await project.save();

			console.log("✅ Nuxt config updated successfully.");
		}
	} else {
		console.log(
			"No config object found. Please check your nuxt config file."
		);
	}
}

export async function setNuxtUnstyled(nuxtConfigPath: string) {
	const project = new Project();
	const sourceFile = project.addSourceFileAtPath(
		nuxtConfigPath + "/nuxt.config.ts"
	);

	const exportAssignment = sourceFile.getExportAssignment(() => true);
	const configObject = exportAssignment?.getExpression();

	if (configObject && Node.isCallExpression(configObject)) {
		const args = configObject.getArguments();
		if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
			const configObjectLiteral = args[0];

			const primeVueProperty =
				configObjectLiteral.getProperty("primevue");

			if (
				primeVueProperty &&
				Node.isPropertyAssignment(primeVueProperty)
			) {
				const primeVueInitializer = (
					primeVueProperty as PropertyAssignment
				).getInitializer();

				if (
					primeVueInitializer &&
					Node.isObjectLiteralExpression(primeVueInitializer)
				) {
					const primeVueOptionsProperty =
						primeVueInitializer.getProperty("options");

					if (
						primeVueOptionsProperty &&
						Node.isPropertyAssignment(primeVueOptionsProperty)
					) {
						const primeVueOptionsInitializer = (
							primeVueOptionsProperty as PropertyAssignment
						).getInitializer();

						if (
							primeVueOptionsInitializer &&
							Node.isObjectLiteralExpression(
								primeVueOptionsInitializer
							)
						) {
							const unstyledProperty =
								primeVueOptionsInitializer.getProperty(
									"unstyled"
								);
							if (Node.isPropertyAssignment(unstyledProperty)) {
								unstyledProperty.set({
									initializer: "true"
								});
							} else {
								primeVueOptionsInitializer.addPropertyAssignment(
									{
										name: "unstyled",
										initializer: "true"
									}
								);
							}
						} else {
							primeVueInitializer.addPropertyAssignment({
								name: "options",
								initializer: "{ unstyled: true }"
							});
						}
					} else {
						primeVueInitializer.addPropertyAssignment({
							name: "options",
							initializer: "{ unstyled: true }"
						});
					}
				}
			} else {
				configObjectLiteral.addPropertyAssignment({
					name: "primevue",
					initializer: "{options: { unstyled: true }}"
				});
			}
			await project.save();

			console.log("✅ Nuxt config updated successfully.");
		}
	} else {
		console.log(
			"No config object found. Please check your nuxt config file."
		);
	}
}

function calculateRelativeImport(
	presetDirectory: string,
	nuxtConfigPath: string
) {
	const normalizedPresetDir = path.normalize(presetDirectory);
	const normalizedNuxtConfigPath = path.normalize(nuxtConfigPath);

	let relativePath = path.relative(
		normalizedNuxtConfigPath,
		normalizedPresetDir
	);

	relativePath = relativePath.replace(/\\/g, "/");

	if (!relativePath.startsWith(".")) {
		relativePath = "./" + relativePath;
	}

	const importPTValue = `path.resolve(__dirname, '${relativePath}')`;

	return importPTValue;
}

export async function setPresetForNuxt(
	nuxtConfigPath: string,
	presetDirectory: string,
	baseProject?: Project
) {
	if (!fs.existsSync(nuxtConfigPath) || !fs.existsSync(presetDirectory)) {
		console.log("Nuxt config or preset directory not found.");
		return;
	}

	const project = baseProject ? baseProject : new Project();
	const sourceFile = project.addSourceFileAtPath(
		nuxtConfigPath + "/nuxt.config.ts"
	);

	const exportAssignment = sourceFile.getExportAssignment(() => true);
	const configObject = exportAssignment?.getExpression();

	if (configObject && Node.isCallExpression(configObject)) {
		const args = configObject.getArguments();
		const configObjectLiteral = args[0];

		if (
			args.length > 0 &&
			Node.isObjectLiteralExpression(configObjectLiteral)
		) {
			let formattedPath = calculateRelativeImport(
				presetDirectory,
				nuxtConfigPath
			);
			let importPTValue = `from: "${formattedPath}"`;

			let pathImport = sourceFile.getImportDeclaration((declaration) => {
				const moduleSpecifier = declaration
					.getModuleSpecifier()
					.getLiteralText();
				return moduleSpecifier === "path";
			});

			if (!pathImport) {
				sourceFile.addImportDeclaration({
					defaultImport: "path",
					moduleSpecifier: "path"
				});
			}

			configObjectLiteral.addPropertyAssignment({
				name: "primevue",
				initializer: `{ options: { unstyled: true, importPT: { ${importPTValue}}}}`
			});

			await project.save();
		}
	} else {
		console.log(
			"No config object found. Please check your Nuxt config file."
		);
	}
}

export async function createNuxtVueProject(projectName: string) {
	const isWindows = process.platform === "win32";
	const cmd = isWindows ? "cmd" : "npx";
	const args = isWindows
		? ["/c", `npx nuxi@latest init ${projectName}`]
		: [`npx nuxi@latest init ${projectName}`];

	return new Promise((resolve, reject) => {
		const vueCreate = spawn(cmd, args, { stdio: "inherit", shell: true });

		vueCreate.on("error", reject);

		vueCreate.on("close", (code) => {
			if (code !== 0) {
				reject(new Error("Failed to create Nuxt Vue project"));
			} else {
				resolve(true);
			}
		});
	});
}

export async function configureNuxtPrimeVue(unstyled: boolean = false) {
	const installPrimeIcons = await pickPrimeIcons();
	await updateNuxtMainFile(".", installPrimeIcons.unstyled);
}

export async function installPrimeVueNuxt() {
	const primeIconsInstall = await pickPrimeIcons();

	spinner.updateSpinnerText(
		"Installing PrimeVue and PrimeVue Nuxt module..."
	);

	await exec(
		`npm install primevue@beta && npm install --save-dev nuxt-primevue@latest${
			primeIconsInstall ? "&& npm install primeicons" : ""
		}`,
		async (error, stdout, stderr) => {
			spinner.spinnerSuccess(
				"PrimeVue and PrimeVue Nuxt module installed successfully."
			);
			if (error) {
				console.error(`Error installing nuxt-primevue: ${error}`);
				return;
			}
			await updateNuxtMainFile(".", primeIconsInstall);
		}
	);
}
