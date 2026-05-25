/**
 * MiniMax Integration Client
 * Handles: TTS, Image Gen, Video Gen, Music Gen via MiniMax API
 * API Base: https://api.minimax.chat
 */

export interface MiniMaxConfig {
  apiKey: string;
  groupId: string;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
}

export interface MiniMaxTTSResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    task_status: string;
    file_path?: string;
    duration?: number;
  };
}

export interface ImageGenRequest {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
}

export interface MiniMaxImageResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    task_status: string;
    images?: string[];
  };
}

export interface VideoGenRequest {
  images: string[];
  prompt?: string;
  model?: string;
  duration?: number;
}

export interface MusicGenRequest {
  prompt: string;
  genre?: string;
  mood?: string;
}

// ─── MiniMax Client ─────────────────────────────────────────────────────────

const MINIMAX_BASE = "https://api.minimax.chat";

function createMiniMaxClient(config: MiniMaxConfig) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };

  // ─── TTS (Text-to-Speech) ────────────────────────────────────────────────
  async function textToSpeech(req: TTSRequest): Promise<string> {
    const response = await fetch(`${MINIMAX_BASE}/t2aPro`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: req.model ?? "speech-01",
        text: req.text,
        voice_setting: {
          voice_id: req.voice ?? "male-qn-qingse",
          speed: req.speed ?? 1.0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
        },
      }),
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`MiniMax TTS: ${data.message}`);
    return data.data?.audio_file ?? "";
  }

  // ─── Image Generation (Flux) ─────────────────────────────────────────────
  async function generateImage(req: ImageGenRequest): Promise<string> {
    const response = await fetch(`${MINIMAX_BASE}/image_generation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: req.model ?? "image-01",
        prompt: req.prompt,
        width: req.width ?? 1024,
        height: req.height ?? 1024,
        num_steps: req.steps ?? 25,
        seed: req.seed ?? Math.floor(Math.random() * 999999),
      }),
    });
    const data: MiniMaxImageResponse = await response.json();
    if (data.code !== 0) throw new Error(`MiniMax Image: ${data.message}`);
    return data.data?.images?.[0] ?? "";
  }

  // ─── Video Generation ───────────────────────────────────────────────────
  async function generateVideo(req: VideoGenRequest): Promise<string> {
    const response = await fetch(`${MINIMAX_BASE}/video_generation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: req.model ?? "video-01",
        input_images: req.images,
        prompt: req.prompt ?? "smooth camera movement, cinematic lighting",
        duration: req.duration ?? 5,
      }),
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`MiniMax Video: ${data.message}`);
    return data.data?.video_url ?? "";
  }

  // ─── Music Generation ────────────────────────────────────────────────────
  async function generateMusic(req: MusicGenRequest): Promise<string> {
    const response = await fetch(`${MINIMAX_BASE}/music_generation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "music-01",
        prompt: req.prompt,
        genre: req.genre ?? "ambient",
        mood: req.mood ?? "calm",
      }),
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`MiniMax Music: ${data.message}`);
    return data.data?.audio_file ?? "";
  }

  // ─── Polling helper ──────────────────────────────────────────────────────
  async function pollTask(taskId: string, endpoint: string, maxWaitMs = 120000): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(`${MINIMAX_BASE}/${endpoint}/${taskId}`, {
        headers: { "Authorization": `Bearer ${config.apiKey}` },
      });
      const data = await res.json();
      if (data.data?.task_status === "success") return data.data;
      if (data.data?.task_status === "failed") throw new Error(`Task ${taskId} failed`);
    }
    throw new Error(`Polling timeout for task ${taskId}`);
  }

  return { textToSpeech, generateImage, generateVideo, generateMusic, pollTask };
}

export { createMiniMaxClient, MINIMAX_BASE };
export type { MiniMaxConfig };