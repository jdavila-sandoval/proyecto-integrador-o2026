import type {
  CreatedVideo,
  PlaybackInfo,
  VideoFormData,
  VideoItem,
} from "../types";
import { apiRequest } from "./apiClient";

export const videoService = {
  list: () => apiRequest<VideoItem[]>("/videos"),

  get: (id: string) =>
    apiRequest<VideoItem>(`/videos/${encodeURIComponent(id)}`),

  create: (data: VideoFormData, file: File) =>
    apiRequest<CreatedVideo>("/videos", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        content_type: file.type,
        size_bytes: file.size,
      }),
    }),

  complete: (id: string) =>
    apiRequest<VideoItem>(`/videos/${encodeURIComponent(id)}/complete`, {
      method: "POST",
    }),

  playback: (id: string) =>
    apiRequest<PlaybackInfo>(`/videos/${encodeURIComponent(id)}/playback`),
};
