import type { VideoFormData, VideoItem } from "../types";
import { apiRequest } from "./apiClient";

export const videoService = {
  list: () => apiRequest<VideoItem[]>("/videos"),
  get: (id: string) => apiRequest<VideoItem>(`/videos/${encodeURIComponent(id)}`),
  create: (data: VideoFormData) =>
    apiRequest<VideoItem>("/videos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // update: (id: string | number, data: VideoFormData) =>
  //   apiRequest<VideoItem>(`/videos/${encodeURIComponent(id)}`, {
  //     method: "PATCH",
  //     body: JSON.stringify(data),
  //   }),
  // remove: (id: string | number) =>
  //   apiRequest<void>(`/videos/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
