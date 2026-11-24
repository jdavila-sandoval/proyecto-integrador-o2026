import { useEffect, useState } from "react";
import { realtimeService } from "../services/realtimeService";
import type { RealtimeStatus } from "../types";

export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>(realtimeService.getStatus());
  useEffect(() => realtimeService.subscribeStatus(setStatus), []);
  return status;
}
