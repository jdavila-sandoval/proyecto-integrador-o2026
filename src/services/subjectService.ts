import type { Subject } from "../types";
import { apiRequest } from "./apiClient";

export const subjectService = {
  list: () => apiRequest<Subject[]>("/subjects")
};
