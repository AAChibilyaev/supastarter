import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A single timed video moment (segment/scene).
 */
export interface VideoMoment {
	/** Zero-based moment index within the video */
	momentIndex: number;
	/** Start time in seconds */
	startTime: number;
	/** End time in seconds */
	endTime: number;
	/** Transcribed text for this segment */
	transcript: string;
	/** Human-readable timecode (e.g. "0:42") */
	timecode: string;
	/** Duration of this moment in seconds */
	durationSeconds: number;
	/** Scene detection confidence (0-1) if available */
	sceneChangeScore?: number;
}

/**
 * Parsed video with moments.
 */
export interface ParsedVideoMoments {
	title: string;
	mimeType: string;
	durationSeconds: number;
	moments: VideoMoment[];
	metadata: Record<string, unknown>;
}

/**
 * Ffmpeg scene detection method.
 * - `ffmpeg_scene`: Uses ffmpeg's scene detection filter (threshold-based)
 * - `ffprobe_shot`: Uses ffprobe's shot detection
 */
type SceneDetectionMethod = "ffmpeg_scene" | "uniform_split";

/**
 * Options for video moment parsing.
 */
export interface VideoMomentsOptions {
	/** Scene detection method */
	method?: SceneDetectionMethod;
	/** Scene change threshold (0.1-1.0, lower = more sensitive). Default: 0.3 */
	sceneThreshold?: number;
	/** Minimum moment duration in seconds (shorter moments are merged). Default: 10 */
	minMomentDuration?: number;
	/** Uniform split duration in seconds (used when method=uniform_split). Default: 30 */
	uniformSegmentDuration?: number;
}

const DEFAULT_OPTIONS: Required<VideoMomentsOptions> = {
	method: "ffmpeg_scene",
	sceneThreshold: 0.3,
	minMomentDuration: 10,
	uniformSegmentDuration: 30,
};

/**
 * Parse a video into timed moments/scenes.
 *
 * Pipeline:
 *   1. Detect scene boundaries using ffmpeg scene filter
 *   2. For each scene segment, extract audio and transcribe with Whisper
 *   3. Return an array of VideoMoment with transcript + timecode
 *
 * Supported formats: MP4, WebM, AVI, MOV, MKV
 * Requires: ffmpeg + whisper-cli or openai-whisper
 */
export async function parseVideoMoments(
	content: Buffer | string,
	filename: string,
	options?: VideoMomentsOptions,
): Promise<ParsedVideoMoments> {
	const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
	const opts = { ...DEFAULT_OPTIONS, ...options };

	const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
	const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`);

	try {
		writeFileSync(tmpPath, buffer);

		const durationSeconds = getVideoDuration(tmpPath);
		if (durationSeconds <= 0) {
			return {
				title: filename.replace(/\.[^.]+$/, ""),
				mimeType: getVideoMimeType(ext),
				durationSeconds: 0,
				moments: [],
				metadata: { error: "Could not determine video duration" },
			};
		}

		// Phase 1: Detect scene boundaries
		const scenes = detectScenes(tmpPath, durationSeconds, opts);

		// Phase 2: For each scene, transcribe audio and build moments
		const moments: VideoMoment[] = [];
		for (let i = 0; i < scenes.length; i++) {
			const { start, end, score } = scenes[i];
			const transcript = transcribeSegment(tmpPath, start, end, i);
			moments.push({
				momentIndex: i,
				startTime: Math.round(start),
				endTime: Math.round(end),
				transcript: transcript || "",
				timecode: formatTimecode(start),
				durationSeconds: Math.round(end - start),
				sceneChangeScore: score,
			});
		}

		return {
			title: filename.replace(/\.[^.]+$/, ""),
			mimeType: getVideoMimeType(ext),
			durationSeconds,
			moments,
			metadata: {
				momentCount: moments.length,
				totalTranscriptWords: moments.reduce((s, m) => s + m.transcript.split(/\s+/).filter(Boolean).length, 0),
				transcribedMoments: moments.filter((m) => m.transcript.length > 0).length,
				format: ext,
				sceneDetectionMethod: opts.method,
			},
		};
	} finally {
		try {
			unlinkSync(tmpPath);
		} catch {
			// cleanup best-effort
		}
	}
}

/**
 * Detect scene boundaries in the video.
 * Returns an array of {start, end} segments.
 */
function detectScenes(
	videoPath: string,
	durationSeconds: number,
	opts: Required<VideoMomentsOptions>,
): Array<{ start: number; end: number; score?: number }> {
	if (durationSeconds <= 0) return [];

	if (opts.method === "uniform_split") {
		return splitUniformly(durationSeconds, opts.uniformSegmentDuration);
	}

	// ffmpeg_scene: Use ffmpeg scene detection filter
	try {
		const segmentDuration = Math.max(1, Math.min(opts.uniformSegmentDuration, 60));
		const sceneData = execSync(
			`ffmpeg -i "${videoPath}" -filter:v "select='gt(scene,${opts.sceneThreshold})',showinfo" -f null - 2>&1`,
			{ encoding: "utf-8", timeout: 300000 },
		);

		// Parse scene change timestamps from ffmpeg showinfo output
		const timestamps: number[] = [0];
		const scores: number[] = [];
		const regex = /pts_time:([\d.]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(sceneData)) !== null) {
			const ts = parseFloat(match[1]);
			if (!isNaN(ts) && ts > 0 && ts < durationSeconds) {
				timestamps.push(ts);
				// Extract scene score from lavfi metadata if available
				const scoreMatch = sceneData.match(new RegExp(`lavfi\\.scene_score[=:]([\\d.]+)`, "i"));
				if (scoreMatch) {
					scores.push(parseFloat(scoreMatch[1]));
				}
			}
		}
		timestamps.push(durationSeconds);

		// Merge segments that are shorter than minMomentDuration
		return mergeShortScenes(timestamps, scores, opts.minMomentDuration, durationSeconds);
	} catch {
		// Fall back to uniform split if ffmpeg scene detection fails
		return splitUniformly(durationSeconds, opts.uniformSegmentDuration);
	}
}

/**
 * Split video duration into uniform segments.
 */
function splitUniformly(durationSeconds: number, segmentDuration: number): Array<{ start: number; end: number }> {
	const segments: Array<{ start: number; end: number }> = [];
	for (let start = 0; start < durationSeconds; start += segmentDuration) {
		const end = Math.min(start + segmentDuration, durationSeconds);
		segments.push({ start, end });
	}
	if (segments.length === 0) {
		segments.push({ start: 0, end: durationSeconds });
	}
	return segments;
}

/**
 * Merge scene segments that are shorter than minDuration into adjacent segments.
 */
function mergeShortScenes(
	timestamps: number[],
	scores: number[],
	minDuration: number,
	totalDuration: number,
): Array<{ start: number; end: number; score?: number }> {
	if (timestamps.length <= 2) {
		return [{ start: 0, end: totalDuration, score: undefined }];
	}

	const segments: Array<{ start: number; end: number; score?: number }> = [];
	for (let i = 0; i < timestamps.length - 1; i++) {
		segments.push({
			start: timestamps[i],
			end: timestamps[i + 1],
			score: scores[i] ?? undefined,
		});
	}

	// Merge short segments
	const merged: Array<{ start: number; end: number; score?: number }> = [];
	for (const seg of segments) {
		const duration = seg.end - seg.start;
		if (duration < minDuration && merged.length > 0) {
			// Merge into previous segment
			merged[merged.length - 1].end = seg.end;
		} else {
			merged.push({ ...seg });
		}
	}

	return merged;
}

/**
 * Extract audio for a time segment and transcribe it.
 * Falls back: whisper-cli → openai-whisper Python → empty string.
 */
function transcribeSegment(videoPath: string, startSeconds: number, endSeconds: number, segmentIndex: number): string {
	const duration = endSeconds - startSeconds;
	if (duration <= 0) return "";

	const audioPath = join(tmpdir(), `seg-${randomUUID()}-${segmentIndex}.wav`);

	try {
		// Extract audio segment: 16kHz mono WAV
		execSync(
			`ffmpeg -y -ss ${startSeconds} -t ${duration} -i "${videoPath}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}" 2>/dev/null`,
			{ timeout: 180000 },
		);

		// Try whisper-cli first
		try {
			const text = execSync(
				`whisper-cli --file "${audioPath}" --output-txt --no-timestamps 2>/dev/null`,
				{ encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
			).trim();
			if (text) return text;
		} catch {
			// fallthrough
		}

		// Try whisper-cli with alternate flags
		try {
			const text = execSync(`whisper-cli -f "${audioPath}" -otxt -nt 2>/dev/null`, {
				encoding: "utf-8",
				timeout: 300000,
				maxBuffer: 50 * 1024 * 1024,
			}).trim();
			if (text) return text;
		} catch {
			// fallthrough
		}

		// Fall back to Python whisper
		try {
			const text = execSync(
				`python3 -c "
import sys
try:
    import whisper
    model = whisper.load_model('base')
    result = model.transcribe('${audioPath.replace(/'/g, "'\\''")}')
    print(result['text'])
except Exception as e:
    print(f'[WHISPER_ERROR] {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null`,
				{ encoding: "utf-8", timeout: 600000, maxBuffer: 50 * 1024 * 1024 },
			).trim();
			if (text && !text.startsWith("[WHISPER_ERROR]")) return text;
		} catch {
			// fallthrough
		}

		return "";
	} catch {
		return "";
	} finally {
		try {
			unlinkSync(audioPath);
		} catch {
			// cleanup best-effort
		}
	}
}

function getVideoDuration(videoPath: string): number {
	try {
		const result = execSync(
			`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}" 2>/dev/null`,
			{ encoding: "utf-8", timeout: 10000 },
		).trim();
		const seconds = parseFloat(result);
		return isNaN(seconds) ? 0 : Math.round(seconds);
	} catch {
		return 0;
	}
}

function formatTimecode(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getVideoMimeType(ext: string): string {
	const mimeMap: Record<string, string> = {
		mp4: "video/mp4",
		webm: "video/webm",
		avi: "video/x-msvideo",
		mov: "video/quicktime",
		mkv: "video/x-matroska",
	};
	return mimeMap[ext] ?? "application/octet-stream";
}
