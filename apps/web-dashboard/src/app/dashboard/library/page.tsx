"use client";
import { useState, useEffect } from "react";
import { getLibrary } from "@/lib/api";
import { UserLibraryItem, LibraryStatus } from "@/lib/types";
import { useJobProgress } from "@/hooks/use-job-progress";
import Image from "next/image";
import Link from "next/link";

const STATUS_LABEL: Record<LibraryStatus, string> = {
  REQUESTED: "Requested",
  DOWNLOADING: "Downloading",
  TRANSCODING: "Transcoding",
  READY: "Ready",
  FAILED: "Failed",
};

const STATUS_COLOR: Record<LibraryStatus, string> = {
  REQUESTED: "text-gray-400 bg-gray-400/10",
  DOWNLOADING: "text-blue-400 bg-blue-400/10",
  TRANSCODING: "text-yellow-400 bg-yellow-400/10",
  READY: "text-green-400 bg-green-400/10",
  FAILED: "text-red-400 bg-red-400/10",
};

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<UserLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const liveProgress = useJobProgress();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getLibrary();
        setItems(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/5 rounded-xl h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Library</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} movie{items.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/browse"
          className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Browse Movies
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-gray-500 space-y-3">
          <p className="text-lg">Your library is empty.</p>
          <Link href="/dashboard/browse" className="text-green-400 hover:underline text-sm">
            Browse the global library to add movies
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const job = item.downloadJob;
            const live = job ? liveProgress[job.id] : null;

            const downloadPct = live?.stage === "download" ? live.progress : (job?.downloadProgress ?? 0);
            const transcodePct = live?.stage === "transcode" ? live.progress : (job?.transcodeProgress ?? 0);

            const effectiveStatus: LibraryStatus =
              live?.stage === "download" && live.status === "in_progress"
                ? "DOWNLOADING"
                : live?.stage === "transcode" && live.status === "in_progress"
                ? "TRANSCODING"
                : item.status;

            return (
              <div
                key={item.id}
                className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden flex gap-4 p-4"
              >
                <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                  {item.globalMovie.poster ? (
                    <Image
                      src={item.globalMovie.poster}
                      alt={item.globalMovie.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                      No img
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-white font-semibold text-sm truncate">
                      {item.globalMovie.title}
                    </p>
                    <p className="text-gray-500 text-xs">{item.globalMovie.year}</p>
                  </div>

                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[effectiveStatus]}`}
                  >
                    {STATUS_LABEL[effectiveStatus]}
                  </span>

                  {(effectiveStatus === "DOWNLOADING" || effectiveStatus === "TRANSCODING" || effectiveStatus === "READY") && job && (
                    <div className="space-y-2 pt-1">
                      <ProgressBar label="Downloading" value={downloadPct} />
                      {effectiveStatus === "DOWNLOADING" && live?.speedMBps != null && live.speedMBps > 0 && (
                        <p className="text-xs text-gray-500">{live.speedMBps.toFixed(2)} MB/s</p>
                      )}
                      {(effectiveStatus === "TRANSCODING" || effectiveStatus === "READY") && (
                        <ProgressBar label="Transcoding" value={transcodePct} />
                      )}
                    </div>
                  )}

                  {effectiveStatus === "READY" && (
                    <a
                      href={item.hlsUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg transition mt-1"
                    >
                      Watch
                    </a>
                  )}

                  {effectiveStatus === "FAILED" && job?.errorMessage && (
                    <p className="text-red-400 text-xs truncate">{job.errorMessage}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
