import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

async function getOrCreateSettings() {
  const existing = await db.select().from(settingsTable).limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db.insert(settingsTable).values({
    siteName: "ZeniPost",
    maxEmailsPerDay: 10000,
    maintenanceMode: false,
    allowRegistrations: true,
  }).returning();
  return created;
}

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { smtpPassword, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get settings" });
  }
});

router.patch("/", requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const updateData: Record<string, any> = {};
    const allowed = ["smtpHost", "smtpPort", "smtpUser", "smtpPassword", "smtpFromEmail",
      "smtpFromName", "awsRegion", "maxEmailsPerDay", "maintenanceMode",
      "allowRegistrations", "siteName", "supportEmail"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const [updated] = await db.update(settingsTable).set(updateData)
      .where(eq(settingsTable.id, settings.id))
      .returning();

    const { smtpPassword, ...safeSettings } = updated;
    res.json(safeSettings);
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update settings" });
  }
});

export default router;
