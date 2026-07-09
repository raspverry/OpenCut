import type { SidecarProvider } from "./types";

const MODEL_PRESETS_BY_PROVIDER: Record<SidecarProvider, string[]> = {
	openai: ["gpt-5.5", "gpt-4.1"],
	anthropic: ["claude-sonnet-5", "claude-opus-4-8", "claude-opus-4-7"],
};

export function defaultModelForProvider(provider: SidecarProvider) {
	return MODEL_PRESETS_BY_PROVIDER[provider][0];
}

export function nextModelForProvider({
	currentModel,
	currentProvider,
	nextProvider,
}: {
	currentModel: string;
	currentProvider: SidecarProvider;
	nextProvider: SidecarProvider;
}) {
	const normalizedModel = currentModel.trim();
	if (
		!normalizedModel ||
		MODEL_PRESETS_BY_PROVIDER[currentProvider].includes(normalizedModel)
	) {
		return defaultModelForProvider(nextProvider);
	}
	return normalizedModel;
}
