import inquirer from "inquirer";
import { startTranslation } from "./twConverter";

export async function translateToTailwind() {
	const currentDirectoryAnswer = await inquirer.prompt([
		{
			type: "confirm",
			name: "useCurrentDirectory",
			message: "Do you want to use the current directory?"
		}
	]);

	let folderDirectory = "";

	if (currentDirectoryAnswer.useCurrentDirectory !== true) {
		const folderPathAnswer = await inquirer.prompt([
			{
				type: "input",
				name: "folderPath",
				placeholder: "(press enter to use the current directory)",
				message: `What is the folder path?`
			}
		]);

		folderDirectory = folderPathAnswer.folderPath;
	} else {
		folderDirectory = process.cwd();
	}

	await startTranslation(folderDirectory);
}
