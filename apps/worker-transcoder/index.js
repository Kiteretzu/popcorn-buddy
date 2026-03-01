const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const { Kafka } = require("kafkajs");
const fs = require("fs").promises;
const fsOld = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

console.log("Starting HLS transcoding...");

const DOWNLOAD_JOB_ID = process.env.DOWNLOAD_JOB_ID;
const USER_ID = process.env.USER_ID;
const BUCKET_NAME = process.env.BUCKET_NAME;
const KEY = process.env.KEY;
const MOVIE_SLUG = process.env.MOVIE_SLUG;
const KAFKA_BROKER = process.env.KAFKA_BROKER;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET || "production.smarthverma.xyz";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

let kafkaProducer = null;

async function setupKafka() {
  if (!KAFKA_BROKER) return;
  const kafka = new Kafka({ clientId: "worker-transcoder", brokers: [KAFKA_BROKER] });
  kafkaProducer = kafka.producer();
  await kafkaProducer.connect();
}

async function publishProgress(stage, progress, status) {
  if (!kafkaProducer || !DOWNLOAD_JOB_ID) return;
  const msg = {
    jobId: DOWNLOAD_JOB_ID,
    userId: USER_ID || "",
    stage,
    progress,
    status,
    ts: new Date().toISOString(),
  };
  await kafkaProducer.send({
    topic: "job-progress",
    messages: [{ value: JSON.stringify(msg) }],
  }).catch((err) => console.error("Kafka publish error:", err.message));
}

async function updateJobProgress(transcodeProgress) {
  if (!DOWNLOAD_JOB_ID) return;
  await prisma.downloadJob.update({
    where: { id: DOWNLOAD_JOB_ID },
    data: { transcodeProgress, status: "TRANSCODING" },
  }).catch((err) => console.error("DB update error:", err.message));
}

async function markCompleted(hlsPath) {
  if (!DOWNLOAD_JOB_ID) return;
  const job = await prisma.downloadJob.update({
    where: { id: DOWNLOAD_JOB_ID },
    data: { transcodeProgress: 100, status: "COMPLETED" },
  });
  await prisma.userLibraryItem.update({
    where: { id: job.userLibraryItemId },
    data: { status: "READY", hlsPath },
  });
}

async function markFailed(errorMessage) {
  if (!DOWNLOAD_JOB_ID) return;
  const job = await prisma.downloadJob.update({
    where: { id: DOWNLOAD_JOB_ID },
    data: { status: "FAILED", errorMessage },
  }).catch(() => null);
  if (job) {
    await prisma.userLibraryItem.update({
      where: { id: job.userLibraryItemId },
      data: { status: "FAILED" },
    }).catch(() => null);
  }
}

async function init() {
  await setupKafka();
  await publishProgress("transcode", 0, "in_progress");
  await updateJobProgress(0);

  // Download the original video
  const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: KEY });
  const result = await s3Client.send(getCommand);

  const originalFilePath = "videos/original-video.mp4";
  await fs.mkdir("videos", { recursive: true });
  await fs.writeFile(originalFilePath, result.Body);

  const originalVideoPath = path.resolve(originalFilePath);
  const outputDir = path.resolve("transcoded");
  await fs.mkdir(outputDir, { recursive: true });

  const variants = [
    { name: "360p", width: 640, height: 360, bandwidth: 800000 },
    { name: "480p", width: 854, height: 480, bandwidth: 1400000 },
    { name: "720p", width: 1280, height: 720, bandwidth: 2800000 },
    { name: "1080p", width: 1920, height: 1080, bandwidth: 5000000 },
  ];

  let completedVariants = 0;
  const totalVariants = variants.length;

  await Promise.all(
    variants.map(async (variant) => {
      const variantDir = path.join(outputDir, variant.name);
      await fs.mkdir(variantDir, { recursive: true });

      return new Promise((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .size(`${variant.width}x${variant.height}`)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-profile:v baseline",
            "-level 3.0",
            "-start_number 0",
            "-hls_time 10",
            "-hls_list_size 0",
            "-f hls",
          ])
          .output(path.join(variantDir, "index.m3u8"))
          .on("end", async () => {
            completedVariants++;
            const pct = Math.round((completedVariants / totalVariants) * 90);
            console.log(`Finished: ${variant.name} (${pct}%)`);
            await publishProgress("transcode", pct, "in_progress");
            await updateJobProgress(pct);
            resolve();
          })
          .on("error", reject)
          .run();
      });
    })
  );

  // Create master playlist
  let masterPlaylist = "#EXTM3U\n";
  for (const variant of variants) {
    masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}\n`;
    masterPlaylist += `${variant.name}/index.m3u8\n`;
  }
  const masterPath = path.join(outputDir, "master.m3u8");
  await fs.writeFile(masterPath, masterPlaylist);

  // Upload all HLS files to S3
  await publishProgress("transcode", 92, "in_progress");

  const uploadDir = async (dirPath, s3Prefix) => {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      const key = `hls/${MOVIE_SLUG}/${s3Prefix}${file.name}`;
      if (file.isDirectory()) {
        await uploadDir(filePath, `${s3Prefix}${file.name}/`);
      } else {
        const putCommand = new PutObjectCommand({
          Bucket: PRODUCTION_BUCKET,
          Key: key,
          Body: fsOld.createReadStream(filePath),
        });
        await s3Client.send(putCommand);
        console.log(`Uploaded: ${key}`);
      }
    }
  };

  await uploadDir(outputDir, "");

  const hlsPath = `hls/${MOVIE_SLUG}`;
  await markCompleted(hlsPath);
  await publishProgress("transcode", 100, "completed");
  console.log("Transcoding complete. hlsPath:", hlsPath);
}

init()
  .catch(async (err) => {
    console.error("Transcoder error:", err);
    await markFailed(err.message).catch(() => {});
    await publishProgress("transcode", 0, "failed").catch(() => {});
    process.exit(1);
  })
  .finally(async () => {
    if (kafkaProducer) await kafkaProducer.disconnect().catch(() => {});
    await prisma.$disconnect().catch(() => {});
  });
