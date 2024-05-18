import { Framework } from "./base";
import {
	NextEngineOptions,
	NuxtEngineOptions,
	ViteEngineOptions
} from "./engineOptions";

export interface FrameworkConfig {
	[Framework.Vue]: {
		options: ViteEngineOptions | NuxtEngineOptions;
	};
	[Framework.React]: {
		options: NextEngineOptions | ViteEngineOptions | NuxtEngineOptions;
	};
	[Framework.Angular]: {
		options: {};
	};
}
