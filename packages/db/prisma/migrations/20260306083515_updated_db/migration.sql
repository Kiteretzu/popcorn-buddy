/*
  Warnings:

  - You are about to drop the column `genre` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `movies` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('REQUESTED', 'DOWNLOADING', 'TRANSCODING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DOWNLOADING', 'TRANSCODING', 'COMPLETED', 'FAILED');

-- DropIndex
DROP INDEX "movies_key_key";

-- AlterTable
ALTER TABLE "movies" DROP COLUMN "genre",
DROP COLUMN "isActive",
DROP COLUMN "key",
DROP COLUMN "platform",
DROP COLUMN "thumbnail",
ADD COLUMN     "poster" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "year" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- DropEnum
DROP TYPE "Genre";

-- DropEnum
DROP TYPE "Platform";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_movies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" TEXT,
    "rating" TEXT,
    "genres" TEXT[],
    "poster" TEXT,
    "url" TEXT NOT NULL,
    "magnetLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_library_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "globalMovieId" TEXT NOT NULL,
    "status" "LibraryStatus" NOT NULL DEFAULT 'REQUESTED',
    "hlsPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_jobs" (
    "id" TEXT NOT NULL,
    "userLibraryItemId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DOWNLOADING',
    "downloadProgress" INTEGER NOT NULL DEFAULT 0,
    "transcodeProgress" INTEGER NOT NULL DEFAULT 0,
    "magnetUrl" TEXT NOT NULL,
    "s3RawKey" TEXT,
    "movieSlug" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "friends_requesterId_addresseeId_key" ON "friends"("requesterId", "addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "global_movies_url_key" ON "global_movies"("url");

-- CreateIndex
CREATE UNIQUE INDEX "user_library_items_userId_globalMovieId_key" ON "user_library_items"("userId", "globalMovieId");

-- CreateIndex
CREATE UNIQUE INDEX "download_jobs_userLibraryItemId_key" ON "download_jobs"("userLibraryItemId");

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_globalMovieId_fkey" FOREIGN KEY ("globalMovieId") REFERENCES "global_movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_userLibraryItemId_fkey" FOREIGN KEY ("userLibraryItemId") REFERENCES "user_library_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
