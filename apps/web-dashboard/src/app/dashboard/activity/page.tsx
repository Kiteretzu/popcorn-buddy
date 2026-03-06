"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getLibrary } from "@/lib/api";
import { UserLibraryItem, LibraryStatus } from "@/lib/types";
import { useJobProgress } from "@/hooks/use-job-progress";

const STATUS_LABEL: Record<LibraryStatus, string> = {
  REQUESTED: "Requested",
  DOWNLOADING: "Downloading",
  TRANSCODING: "Transcoding",
  READY: "Ready",
  FAILED: "Failed",
};

const STATUS_BADGE: Record<LibraryStatus, string> = {
  REQUESTED: "text-muted bg-foreground/30",
  DOWNLOADING: "text-blue-secondary bg-blue-primary/40",
  TRANSCODING: "text-purple bg-highlight",
  READY: "text-green bg-green/10",
  FAILED: "text-red-primary bg-red-primary/10",
};

function ProgressBar({
  label,
  value,
  barColor,
}: {
  label: string;
  value: number;
  barColor: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 bg-foreground/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ActivityPage() {
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

  const getEffectiveStatus = (item: UserLibraryItem): LibraryStatus => {
    const live = item.downloadJob ? liveProgress[item.downloadJob.id] : null;
    if (live?.stage === "download" && live.status === "in_progress") return "DOWNLOADING";
    if (live?.stage === "transcode" && live.status === "in_progress") return "TRANSCODING";
    return item.status;
  };

  const counts = {
    total: items.length,
    downloading: items.filter((i) => getEffectiveStatus(i) === "DOWNLOADING").length,
    transcoding: items.filter((i) => getEffectiveStatus(i) === "TRANSCODING").length,
    ready: items.filter((i) => getEffectiveStatus(i) === "READY").length,
    failed: items.filter((i) => getEffectiveStatus(i) === "FAILED").length,
  };

  const stats = [
    {
      label: "Total",
      value: counts.total,
      color: "text-subtle",
      bg: "bg-primary-dark",
      border: "border-foreground",
    },
    {
      label: "Downloading",
      value: counts.downloading,
      color: "text-blue-secondary",
      bg: "bg-blue-primary/30",
      border: "border-blue-tertiary/30",
    },
    {
      label: "Transcoding",
      value: counts.transcoding,
      color: "text-purple",
      bg: "bg-highlight",
      border: "border-purple/30",
    },
    {
      label: "Ready",
      value: counts.ready,
      color: "text-green",
      bg: "bg-green/5",
      border: "border-green/30",
    },
    {
      label: "Failed",
      value: counts.failed,
      color: "text-red-primary",
      bg: "bg-red-primary/5",
      border: "border-red-primary/30",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-primary-dark rounded-xl h-20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-primary-dark rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="text-muted text-sm mt-1">
          Track your downloads and transcoding jobs in real time
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border ${stat.border} rounded-xl p-4`}
          >
            <p className="text-muted text-xs font-medium mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Job list */}
      <div className="bg-primary-dark border border-foreground rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-foreground flex items-center justify-between">
          <h2 className="text-white font-semibold">Job History</h2>
          <div className="flex items-center gap-1.5 text-muted text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse inline-block" />
            Live
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-subtle text-base font-medium">No activity yet</p>
            <p className="text-muted text-sm">
              Add movies to your library to start tracking them here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-foreground/40">
            {items.map((item) => {
              const job = item.downloadJob;
              const live = job ? liveProgress[job.id] : null;
              const effectiveStatus = getEffectiveStatus(item);

              const downloadPct =
                live?.stage === "download" ? live.progress : (job?.downloadProgress ?? 0);
              const transcodePct =
                live?.stage === "transcode" ? live.progress : (job?.transcodeProgress ?? 0);

              return (
                <div key={item.id} className="p-4 flex gap-4 items-start hover:bg-primary/40 transition-colors">
                  {/* Poster */}
                  <div className="relative w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-foreground/20">
                    {item.globalMovie.poster ? (
                      <Image
                        src={item.globalMovie.poster}
                        alt={item.globalMovie.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {item.globalMovie.title}
                        </p>
                        <p className="text-muted text-xs mt-0.5">{item.globalMovie.year}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[effectiveStatus]}`}
                      >
                        {STATUS_LABEL[effectiveStatus]}
                      </span>
                    </div>

                    {/* Progress bars */}
                    {(effectiveStatus === "DOWNLOADING" ||
                      effectiveStatus === "TRANSCODING" ||
                      effectiveStatus === "READY") &&
                      job && (
                        <div className="space-y-1.5">
                          <ProgressBar
                            label="Download"
                            value={downloadPct}
                            barColor="bg-blue-tertiary"
                          />
                          {effectiveStatus === "DOWNLOADING" &&
                            live?.speedMBps != null &&
                            live.speedMBps > 0 && (
                              <p className="text-xs text-muted">
                                {live.speedMBps.toFixed(2)} MB/s
                              </p>
                            )}
                          {(effectiveStatus === "TRANSCODING" ||
                            effectiveStatus === "READY") && (
                            <ProgressBar
                              label="Transcode"
                              value={transcodePct}
                              barColor="bg-purple"
                            />
                          )}
                        </div>
                      )}

                    {effectiveStatus === "FAILED" && job?.errorMessage && (
                      <p className="text-red-primary text-xs truncate">
                        {job.errorMessage}
                      </p>
                    )}

                    {effectiveStatus === "READY" && item.hlsUrl && (
                      <a
                        href={item.hlsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs bg-blue-tertiary hover:bg-blue-secondary text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        Watch
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
