#!/usr/bin/env node

import { widgets } from "./routes/widgets";
import { Command } from "commander";
import Spinner from "./utils/misc/spinner";
import { translateToTailwind } from "./utils/helpers/primeflex";
import { uninstall } from "./utils/helpers/clt";

const program = new Command();
const spinner = new Spinner();

program.description("Our New CLI");
program.option("-v, --verbose", "verbose logging");
program.version("0.1.1", "--version", "output the current version");

program.addCommand(widgets);

program
	.command("pf2tw")
	.description("Translate PrimeFlex classes to Tailwind CSS classes")
	.action(async () => {
		await translateToTailwind();
	});

program
	.command("uninstall")
	.description("Uninstall PrimeCLT")
	.action(async () => {
		await uninstall();
	});

async function main() {
	await program.parseAsync();
}

main();

process.on("unhandledRejection", function (err: Error) {
	const debug = program.opts().verbose;
	if (debug) {
		console.error(err.stack);
	}
	spinner.spinnerError();
	spinner.stopSpinner();
	program.error("", { exitCode: 1 });
});
