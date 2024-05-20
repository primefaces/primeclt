import * as fs from "fs";
import * as path from "path";
import translation from "../data/translationDict.json";

function preprocessHtml(htmlContent: string): string {
	return htmlContent;
}

function directTranslateToTailwind(
	htmlContent: string,
	translationDict: Record<string, string>
): string {
	const stringPattern = /(["'`])((?:\\\1|(?:(?!\1)).)*)(\1)/g;

	const output = htmlContent.replace(
		stringPattern,
		(
			match: string,
			quoteStart: string,
			content: string,
			quoteEnd: string
		) => {
			const parts = content.split(" ");
			const translatedParts = parts.map((part) => {
				return translationDict[part] || part;
			});

			return `${quoteStart}${translatedParts.join(" ")}${quoteEnd}`;
		}
	);

	return output;
}

function processFolder(
	folderPath: string,
	translationDict: Record<string, string>
) {
	if (folderPath.includes("node_modules")) {
		return;
	}

	fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
		if (err) throw err;
		entries.forEach((entry) => {
			console.log(entry.name);
			if (entry.isDirectory()) {
				processFolder(
					path.join(folderPath, entry.name),
					translationDict
				);
			} else if (
				entry.name.endsWith(".vue") ||
				entry.name.endsWith(".js") ||
				entry.name.endsWith(".tsx") ||
				entry.name.endsWith(".jsx") ||
				entry.name.endsWith(".ts") ||
				entry.name.endsWith(".html")
			) {
				const filePath = path.join(folderPath, entry.name);
				fs.readFile(filePath, "utf8", (err, data) => {
					if (err) throw err;

					let vueContent = preprocessHtml(data);

					vueContent = directTranslateToTailwind(
						vueContent,
						translationDict
					);

					fs.writeFile(filePath, vueContent, "utf8", (err) => {
						if (err) throw err;
						console.log(`${filePath} has been processed.`);
					});
				});
			}
		});
	});
}

function loadTranslationDict(vueFolderPath: string) {
	processFolder(vueFolderPath, translation);
}

export function startTranslation(vueFolderPath: string) {
	try {
		loadTranslationDict(vueFolderPath);
		console.log("✅ Translation completed.");
	} catch (err) {
		console.error(err);
	}
}
