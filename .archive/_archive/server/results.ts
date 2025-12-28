import { Router } from "express";
import { z } from "zod";
import prisma from "./prisma.js";
import { authenticate, requireAdmin } from "./middleware.js";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const results = await prisma.weeklyResult.findMany({
    include: { castaway: true },
    orderBy: { weekNumber: "asc" }
  });
  res.json(results);
});

const resultSchema = z.object({
  weekNumber: z.number().int().positive(),
  castawayId: z.string().uuid(),
  points: z.number().int()
});

router.post("/", requireAdmin, async (req, res) => {
  const payload = resultSchema.safeParse({
    weekNumber: Number(req.body.weekNumber),
    castawayId: req.body.castawayId,
    points: Number(req.body.points)
  });

  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }

  const { weekNumber, castawayId, points } = payload.data;

  const existing = await prisma.weeklyResult.findFirst({
    where: { weekNumber, castawayId }
  });

  const result = existing
    ? await prisma.weeklyResult.update({
        where: { id: existing.id },
        data: { points }
      })
    : await prisma.weeklyResult.create({ data: { weekNumber, castawayId, points } });

  res.status(201).json(result);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.weeklyResult.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
