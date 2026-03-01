import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import type { S3Event } from "aws-lambda";
dotenv.config();

const client = new SQSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ecsClient = new ECSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function init() {
  const command = new ReceiveMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20, // Long polling
  });

  while (true) {
    const { Messages } = await client.send(command);

    if (!Messages) {
      console.log("No messages found");
      continue;
    }

    try {
      for (const message of Messages) {
        const { MessageId, Body } = message;
        console.log("Processing message:", MessageId, Body);

        if (!Body) continue;

        const event: S3Event = JSON.parse(Body!);

        // Ignore the test event
        if ("Service" in event && "Event" in event) {
          if (event.Event === "s3:TestEvent") {
            await client.send(
              new DeleteMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL!,
                ReceiptHandle: message.ReceiptHandle!,
              })
            );
            console.log("Test event ignored:", MessageId);
            continue;
          }
        }

        for (const record of event.Records) {
          const { s3 } = record;
          const {
            bucket,
            object: { key },
          } = s3;

          // S3 key pattern: torrents/{downloadJobId}/{filename}
          // Extract downloadJobId from position [1] and movieSlug from position [2]
          const keyParts = decodeURIComponent(key.replace(/\+/g, " ")).split("/");
          const downloadJobId = keyParts[1] ?? "";
          const movieSlug = keyParts[2]?.replace(/\.[^.]+$/, "") ?? keyParts[1] ?? "";

          console.log(`Starting transcoder for job=${downloadJobId} slug=${movieSlug}`);

          // spin up the docker container
          const runTaskCommand = new RunTaskCommand({
            taskDefinition: process.env.ECS_TASK_DEFINITION!,
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
                  name: "video-transcoder",
                  environment: [
                    { name: "DOWNLOAD_JOB_ID", value: downloadJobId },
                    { name: "AWS_ACCESS_KEY_ID", value: process.env.AWS_ACCESS_KEY_ID! },
                    { name: "AWS_SECRET_ACCESS_KEY", value: process.env.AWS_SECRET_ACCESS_KEY! },
                    { name: "AWS_REGION", value: process.env.AWS_REGION ?? "ap-south-1" },
                    { name: "BUCKET_NAME", value: bucket.name },
                    { name: "KEY", value: decodeURIComponent(key.replace(/\+/g, " ")) },
                    { name: "MOVIE_SLUG", value: movieSlug },
                    { name: "KAFKA_BROKER", value: process.env.KAFKA_BROKER! },
                    { name: "DATABASE_URL", value: process.env.DATABASE_URL! },
                    { name: "AWS_S3_PRODUCTION_BUCKET", value: process.env.AWS_S3_PRODUCTION_BUCKET! },
                  ],
                },
              ],
            },
          });

          await ecsClient.send(runTaskCommand);

          // delete the message from the queue
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL!,
            ReceiptHandle: message.ReceiptHandle!,
          });

          await client.send(deleteCommand);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Optionally, you can handle the error, e.g., log it or send it to a dead-letter queue
    }
  }
}

init()
  .then(() => console.log("SQS consumer started"))
  .catch((error) => console.error("Error starting SQS consumer:", error));
