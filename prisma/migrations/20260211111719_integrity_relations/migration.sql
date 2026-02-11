-- Align referential actions and indexes with application integrity rules.

-- Assignment -> Person should be cleaned automatically on person delete.
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_personId_fkey";
ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Missing relation indexes for query performance and relationMode safety.
CREATE INDEX IF NOT EXISTS "User_personId_idx" ON "User"("personId");
CREATE INDEX IF NOT EXISTS "Event_playId_idx" ON "Event"("playId");
CREATE INDEX IF NOT EXISTS "Event_venueId_idx" ON "Event"("venueId");
CREATE INDEX IF NOT EXISTS "Assignment_eventId_idx" ON "Assignment"("eventId");
CREATE INDEX IF NOT EXISTS "Assignment_personId_idx" ON "Assignment"("personId");
CREATE INDEX IF NOT EXISTS "Assignment_roleId_idx" ON "Assignment"("roleId");
CREATE INDEX IF NOT EXISTS "Attachment_uploadedByUserId_idx" ON "Attachment"("uploadedByUserId");
CREATE INDEX IF NOT EXISTS "Attachment_playId_idx" ON "Attachment"("playId");
CREATE INDEX IF NOT EXISTS "Attachment_eventId_idx" ON "Attachment"("eventId");
