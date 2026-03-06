// UploadMovieInput is expected to be of type FormData

export type Response<T> = {
  status: number;
  data: T;
  message: string;
};

export type MovieMetadataParams = FormData;

export interface Movie {
  id: number;
  title: string;
  poster: string;
  year?: number | string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GlobalMovie {
  id: string;
  title: string;
  year?: string | null;
  rating?: string | null;
  genres: string[];
  poster?: string | null;
  url: string;
  magnetLink?: string | null;
}

export type LibraryStatus = "REQUESTED" | "DOWNLOADING" | "TRANSCODING" | "READY" | "FAILED";
export type JobStatus = "DOWNLOADING" | "TRANSCODING" | "COMPLETED" | "FAILED";

export interface DownloadJob {
  id: string;
  status: JobStatus;
  downloadProgress: number;
  transcodeProgress: number;
  errorMessage?: string | null;
  updatedAt: string;
}

export interface UserLibraryItem {
  id: string;
  globalMovieId: string;
  status: LibraryStatus;
  hlsPath?: string | null;
  hlsUrl?: string | null;
  createdAt: string;
  globalMovie: GlobalMovie;
  downloadJob?: DownloadJob | null;
}

export interface ProgressMessage {
  jobId: string;
  userId: string;
  stage: "download" | "transcode";
  progress: number;
  speedMBps: number;
  status: string;
  ts: string;
}
