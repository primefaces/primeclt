import { deleteCacheDirectory } from "./preset";
import { exec } from "child_process";

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
