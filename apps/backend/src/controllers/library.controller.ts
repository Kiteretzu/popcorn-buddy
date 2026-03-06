import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client } from "@repo/db/client";
import asyncHandler from "../utils/controller-utils/asynchandler";
import ApiResponse from "../utils/controller-utils/ApiResponse";
import ApiError from "../utils/controller-utils/ApiError";
import { AuthRequest } from "../middleware/requireAuth";
import { scrapeYTS } from "../helpers/crawler/crawl_yts";
import { movieSlug } from "../helpers/awsHelpers";

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function startTorrentTask(
  downloadJobId: string,
  magnetUrl: string,
  slug: string,
  userId: string
) {
  const command = new RunTaskCommand({
    taskDefinition: process.env.ECS_TASK_DEFINITION_TORRENT!,
    cluster: process.env.ECS_CLUSTER!,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        securityGroups: (process.env.ECS_SECURITY_GROUP ?? "").split(",").filter(Boolean),
        subnets: (process.env.ECS_SUBNETS ?? "").split(",").filter(Boolean),
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "torrent-handler",
          environment: [
            { name: "DOWNLOAD_JOB_ID", value: downloadJobId },
            { name: "USER_ID", value: userId },
            { name: "MAGNET_URL", value: magnetUrl },
            { name: "MOVIE_SLUG", value: slug },
            { name: "AWS_ACCESS_KEY_ID", value: process.env.AWS_ACCESS_KEY_ID! },
            { name: "AWS_SECRET_ACCESS_KEY", value: process.env.AWS_SECRET_ACCESS_KEY! },
            { name: "AWS_REGION", value: process.env.AWS_REGION! },
            { name: "AWS_S3_BUCKET_NAME", value: process.env.AWS_S3_RAW_VIDEOS_FOLDER! },
            { name: "KAFKA_BROKER", value: process.env.KAFKA_BROKER! },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);
}

export const addToLibrary = asyncHandler(async (req: AuthRequest, res: any) => {
  const { globalMovieId } = req.body;
  if (!globalMovieId) {
    return new ApiError(400, "globalMovieId is required").send(res);
  }

  const userId = req.user!.userId;

  const globalMovie = await client.globalMovie.findUnique({ where: { id: globalMovieId } });
  if (!globalMovie) {
    return new ApiError(404, "Movie not found in global library").send(res);
  }

  // Check if already in user's library
  const existing = await client.userLibraryItem.findUnique({
    where: { userId_globalMovieId: { userId, globalMovieId } },
  });
  if (existing) {
    return new ApiError(409, "Movie already in your library").send(res);
  }

  // Fetch magnet link if not cached
  let magnetLink = globalMovie.magnetLink;
  if (!magnetLink) {
    try {
      const scraped = await scrapeYTS(globalMovie.url);
      magnetLink = (scraped[0] as any)?.links?.[0]?.magnet ?? null;
      if (magnetLink) {
        await client.globalMovie.update({ where: { id: globalMovieId }, data: { magnetLink } });
      }
    } catch {
      // proceed without magnet
    }
  }

  if (!magnetLink) {
    return new ApiError(422, "Could not resolve magnet link for this movie").send(res);
  }

  const slug = movieSlug(globalMovie.title + (globalMovie.year ? `-${globalMovie.year}` : ""));

  // Create library item and download job atomically
  const libraryItem = await client.userLibraryItem.create({
    data: {
      userId,
      globalMovieId,
      status: "DOWNLOADING",
      downloadJob: {
        create: {
          magnetUrl: magnetLink,
          movieSlug: slug,
          status: "DOWNLOADING",
          downloadProgress: 0,
          transcodeProgress: 0,
        },
      },
    },
    include: { downloadJob: true },
  });

  // Start the Go torrent worker on ECS
  try {
    await startTorrentTask(libraryItem.downloadJob!.id, magnetLink, slug, userId);
  } catch (err: any) {
    // Mark as failed if ECS launch fails
    await client.downloadJob.update({
      where: { id: libraryItem.downloadJob!.id },
      data: { status: "FAILED", errorMessage: err.message },
    });
    await client.userLibraryItem.update({
      where: { id: libraryItem.id },
      data: { status: "FAILED" },
    });
    return new ApiError(500, "Failed to start download task").send(res);
  }

  return new ApiResponse(201, {
    libraryItemId: libraryItem.id,
    downloadJobId: libraryItem.downloadJob!.id,
    status: libraryItem.status,
  }, "Movie added to library, download started").send(res);
});

export const getLibrary = asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.userId;

  const items = await client.userLibraryItem.findMany({
    where: { userId },
    include: {
      globalMovie: true,
      downloadJob: {
        select: {
          id: true,
          status: true,
          downloadProgress: true,
          transcodeProgress: true,
          errorMessage: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return new ApiResponse(200, items, "User library").send(res);
});

export const getLibraryItem = asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const item = await client.userLibraryItem.findFirst({
    where: { id, userId },
    include: {
      globalMovie: true,
      downloadJob: true,
    },
  });

  if (!item) {
    return new ApiError(404, "Library item not found").send(res);
  }

  // Generate presigned HLS playlist URL when ready
  let hlsUrl: string | null = null;
  if (item.status === "READY" && item.hlsPath) {
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_PRODUCTION_BUCKET!,
        Key: `${item.hlsPath}/master.m3u8`,
      });
      hlsUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
      // return item without presigned URL
    }
  }

  return new ApiResponse(200, { ...item, hlsUrl }, "Library item detail").send(res);
});
