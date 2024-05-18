import { Engine, Framework } from "./base";
import { FrameworkConfig } from "./frameworkConfig";

export interface Workspace {
	framework: Framework;
	engine?: Engine;
	engineOptions?: FrameworkConfig[Framework]["options"];
}
