export interface PresetDetails {
	name: string;
	base: string;
	path: string;
	version?: string;
}

export interface PrimeConfig {
	presets: PresetDetails[];
}
