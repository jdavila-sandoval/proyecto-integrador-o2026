export type UserRole = "Alumno" | "Profesor";
export type VideoStatus = "ready" | "pending" | "metadata_only";


export interface NotificationState {
  message: string;
  type: "success" | "error";
}

export interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterFormData {
  name: string;
  institutionId: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface VideoItem {
  id: string;
  title: string;
  subject: string;
  code: string;
  duration: string;
  uploadedAt: string;
  views: number;
  thumbnailClass: string;
  unit?: string;
  description?: string;
  visibility?: "campus" | "group";
  progress?: number;
  currentTime?: string;
  status?: VideoStatus;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface VideoFormData {
  title: string;
  subject_id: string;
  unit: string;
  description: string;
  visibility: "campus" | "group";
}

export interface UploadTarget {
  url: string;
  fields: Record<string, string>;
}

export interface CreatedVideo extends VideoItem {
  upload: UploadTarget;
}

export interface PlaybackInfo {
  url: string;
  expiresIn: number;
}

export type VideoFieldErrors = Partial<Record<keyof VideoFormData, string>>;

export interface CourseMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "purple" | "orange" | "blue" | "green";
}
