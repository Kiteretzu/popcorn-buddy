import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { client } from "@repo/db/client";
import fs from "fs";
import {
  getMovieUploadUrl,
  getThumbnailUrl,
  movieSlug,
} from "../helpers/awsHelpers";
import asyncHandler from "../utils/controller-utils/asynchandler";
import ApiResponse from "../utils/controller-utils/ApiResponse";
import ApiError from "../utils/controller-utils/ApiError";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { scrapeYTS } from "../helpers/crawler/crawl_yts";

export const uploadMovieMetadata = asyncHandler(async (req: any, res: any) => {
  const { title, genre, platform, extension, contentType } = req.body;
  const file = req.file as Express.Multer.File;

  if (!req.file) {
    return new ApiError(400, "Please upload asd thumbnail.").send(res);
  }

  if (!title || genre.length === 0 || platform.length === 0) {
    return new ApiError(400, "Title, genre, and platform are required.").send(
      res,
    );
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  // Access the uploaded

  const thumbnailPath = file.path;
  const fileExtension = file.mimetype?.split("/")[1] || "jpg";

  const key = `${title}/${movieSlug(title, fileExtension)}`; // raider2.jpg

  const putCommand = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: fs.createReadStream(thumbnailPath),
    ContentType: file?.mimetype,
    ACL: "public-read", // Make the file publicly readable
  });

  const thumbnailUrl = getThumbnailUrl(
    `${title}/${movieSlug(title, fileExtension)}`,
  );

  // WIP: From frontend we will get platform and genre as arrays of strings
  const platformArray = Array.isArray(platform) ? platform : [platform];
  const genreArray = Array.isArray(genre) ? genre : [genre];

  // GET: movieUploadUrl
  const uploadUrl = await getMovieUploadUrl(title, extension, contentType);

  const response = await s3Client.send(putCommand);

  if (
    !response.$metadata.httpStatusCode ||
    response.$metadata.httpStatusCode !== 200
  ) {
    return new ApiError(400, "Failed to upload thumbnail to S3").send(res);
  }

  await client.movie.create({
    data: {
      title,
      platform: platformArray, // platform should be array of enum strings
      genre: genreArray, // genre should be array of enum strings
      thumbnail: thumbnailUrl,
      key: `${title}/${movieSlug(title)}`,
    },
  });

  return new ApiResponse(201, uploadUrl, "New movie update url created").send(
    res,
  );
});

export const searchMovie = asyncHandler(async (req: any, res: any) => {
  const { title } = req.query;

  if (!title || typeof title !== "string") {
    return new ApiError(400, "Title is required").send(res);
  }

  const query = title.trim();
  if (!query) {
    return new ApiError(400, "Title is required").send(res);
  }

  // const movies = await searchYTSAjax(query);

  // if (!movies || movies.length === 0) {
  //   return new ApiResponse(200, []).send(res);
  // }

  //
  return new ApiResponse(200, { message: "Not implemented" }).send(res);
});

export const fetchMovieData = asyncHandler(async (req: any, res: any) => {
  const { id } = req.body;

  if (!id) {
    return new ApiError(400, "Movie ID is required").send(res);
  }

  const movie = await client.movie.findUnique({
    where: {
      id: id,
    },
  });

  if (!movie) {
    return new ApiError(404, "Movie not found").send(res);
  }

  console.log("this is movie", movie);

  const url = movie.url;

  const response = await scrapeYTS(url!);

  console.log("response", response[0]?.links[0]?.magnet);
  // save the response to the database
  // start the docker container in cloud

  // spin up the docker container

  console.log("Spining up docker container");
  const runTaskCommand = new RunTaskCommand({
    taskDefinition: process.env.ECS_TASK_DEFINITION_TORRENT!,
    cluster: process.env.ECS_CLUSTER!,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED", // or "DISABLED" based on your requirements
        securityGroups: ["sg-01ffcef4582b45afe"], // Replace with your security group
        subnets: [
          "subnet-0af5e378686d9ead1",
          "subnet-006a1ee5d9e3d33bd",
          "subnet-0bbdb3dd85337d834",
        ], // Replace with your subnets
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "torrent-handler",
          environment: [
            {
              name: "AWS_ACCESS_KEY_ID",
              value: process.env.AWS_ACCESS_KEY_ID!,
            },
            {
              name: "AWS_SECRET_ACCESS_KEY",
              value: process.env.AWS_SECRET_ACCESS_KEY!,
            },
            {
              name: "AWS_REGION",
              value: process.env.AWS_REGION!,
            },
            { name: "MAGNET_URL", value: response[0]?.links[0]?.magnet || "" },
            {
              name: "AWS_S3_BUCKET_NAME",
              value: process.env.AWS_S3_RAW_VIDEOS_FOLDER!,
            },
          ],
        },
      ],
    },
  });

  const ecsClient = new ECSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await ecsClient.send(runTaskCommand);

  console.log("Sent request to create container");

  return new ApiResponse(200, response).send(res);
});
