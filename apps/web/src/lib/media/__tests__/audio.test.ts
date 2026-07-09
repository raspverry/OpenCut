import { describe, expect, test } from "bun:test";
import { getTimelineElementAudioDecodeRange } from "@/lib/media/audio";

describe("getTimelineElementAudioDecodeRange", () => {
	test("decodes only the visible source range for a trimmed clip", () => {
		expect(
			getTimelineElementAudioDecodeRange({
				trimStart: 2400,
				duration: 29,
			}),
		).toEqual({
			startTimestamp: 2400,
			endTimestamp: 2429,
		});
	});

	test("expands the source decode range for faster retimed clips", () => {
		expect(
			getTimelineElementAudioDecodeRange({
				trimStart: 2400,
				duration: 29,
				retime: { rate: 2 },
			}),
		).toEqual({
			startTimestamp: 2400,
			endTimestamp: 2458,
		});
	});

	test("shrinks the source decode range for slower retimed clips", () => {
		expect(
			getTimelineElementAudioDecodeRange({
				trimStart: 2400,
				duration: 29,
				retime: { rate: 0.5 },
			}),
		).toEqual({
			startTimestamp: 2400,
			endTimestamp: 2414.5,
		});
	});
});
