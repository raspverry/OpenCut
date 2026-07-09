import { describe, expect, test } from "bun:test";
import {
	defaultModelForProvider,
	nextModelForProvider,
} from "@/lib/ai-shorts/models";

describe("ai-shorts model helpers", () => {
	test("uses sidecar-compatible provider defaults", () => {
		expect(defaultModelForProvider("openai")).toBe("gpt-5.5");
		expect(defaultModelForProvider("anthropic")).toBe("claude-sonnet-5");
	});

	test("switches preset models when the provider changes", () => {
		expect(
			nextModelForProvider({
				currentModel: "gpt-5.5",
				currentProvider: "openai",
				nextProvider: "anthropic",
			}),
		).toBe("claude-sonnet-5");
	});

	test("keeps a custom model when the provider changes", () => {
		expect(
			nextModelForProvider({
				currentModel: "custom-routing-model",
				currentProvider: "openai",
				nextProvider: "anthropic",
			}),
		).toBe("custom-routing-model");
	});
});
