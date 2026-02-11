-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'TECH', 'ACTOR');
CREATE TYPE "PersonRole" AS ENUM ('ACTOR', 'TECH', 'OTHER');
CREATE TYPE "EventType" AS ENUM ('SHOW', 'REHEARSAL');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELED');
CREATE TYPE "AttachmentVisibility" AS ENUM ('INTERNAL', 'CAST_TECH');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "personId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Play" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Venue" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Person" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "role" "PersonRole" NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY,
  "type" "EventType" NOT NULL,
  "title" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "playId" TEXT,
  "venueId" TEXT,
  "status" "EventStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Assignment" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "jobTitle" TEXT,
  "callTime" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("eventId", "personId")
);

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "visibility" "AttachmentVisibility" NOT NULL,
  "playId" TEXT,
  "eventId" TEXT,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id");
ALTER TABLE "Event" ADD CONSTRAINT "Event_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id");
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id");
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id");
