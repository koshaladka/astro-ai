import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDb } from "@/lib/db/connect";
import { Eclipse } from "@/lib/db/models/Eclipse";
import { Overlay, type OverlayRecord } from "@/lib/db/models/Overlay";
import { ChartResult } from "@/lib/db/models/ChartResult";
import { Client } from "@/lib/db/models/Client";
import { fetchEclipsePlanets } from "@/lib/astrology/client";
import { CALCULATION_VERSION, calculateAspects, extractPositions } from "@/lib/overlays/aspects";
import { ECLIPSE_CATALOG, ECLIPSE_TYPES } from "@/lib/overlays/catalog";
import type { OverlayView } from "@/lib/overlays/types";
import { OverlayError } from "@/lib/overlays/errors";
import { interpretOverlayData } from "@/lib/ai/agents/overlay-interpreter";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Некорректный идентификатор").transform(value => value.toLowerCase());
export const newEclipseSchema = z.object({
  type: z.string().refine(x => Object.hasOwn(ECLIPSE_TYPES, x), "Неизвестный тип затмения"),
  maximumAt: z.string().datetime({ offset: false }).refine(x => {
    const d = new Date(x); return Number.isFinite(d.getTime()) && d.getUTCFullYear() >= 1900 && d.getUTCFullYear() <= 2100 && d.toISOString().slice(0, 10) === x.slice(0, 10);
  }, "Нужна реальная дата 1900–2100 в UTC"),
  sourceUrl: z.string().url().max(2000).refine(x => x.startsWith("https://"), "Источник должен использовать HTTPS"),
});
const msg = (error: unknown) => error instanceof Error ? error.message : "Неизвестная ошибка";
const duplicate = (e: unknown) => (e as { code?: number })?.code === 11000;
const leaseFilter = () => ({ $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lte: new Date() } }] });

async function db() {
  await connectDb();
  // Явно дождаться уникальных индексов, включая самую первую загрузку.
  await Promise.all([Eclipse.init(), Overlay.init()]);
}
export async function importEclipseCatalog(userId: string) {
  await db();
  for (const event of ECLIPSE_CATALOG) {
    try {
      await Eclipse.updateOne({ type: event.type, maximumAt: new Date(event.maximumAt) }, {
        $setOnInsert: { ...event, maximumAt: new Date(event.maximumAt), createdBy: userId, configuration: CALCULATION_VERSION, fetchStatus: "pending" },
      }, { upsert: true });
    } catch (e) { if (!duplicate(e)) throw e; }
  }
  return listEclipses();
}
export async function listEclipses() {
  await db();
  const rows = await Eclipse.find().sort({ maximumAt: 1 }).lean();
  return rows.map(e => ({ id: String(e._id), type: e.type, maximumAt: e.maximumAt.toISOString(),
    sourceUrl: e.sourceUrl, sourceTime: e.sourceTime, timeNote: e.timeNote,
    fetchStatus: e.fetchStatus, error: e.error, positions: e.positions ?? [],
    busy: !!e.lockUntil && e.lockUntil > new Date(),
  }));
}
export async function addEclipse(input: unknown, userId: string) {
  const body = newEclipseSchema.parse(input);
  await db();
  try {
    const record = await Eclipse.create({ ...body, sourceTime: body.maximumAt, sourceScale: "UTC",
      precisionSeconds: 1, timeNote: "Момент максимума в UTC, введён пользователем; источник указан отдельно.",
      createdBy: userId, configuration: CALCULATION_VERSION, fetchStatus: "pending" });
    return String(record._id);
  } catch (e) { if (duplicate(e)) throw new OverlayError("Такое затмение уже есть в каталоге", 409); throw e; }
}
export async function prepareEclipse(eclipseId: string) {
  objectId.parse(eclipseId);
  await db();
  const saved = await Eclipse.findById(eclipseId).lean();
  if (!saved) throw new OverlayError("Затмение не найдено", 404);
  if (saved.fetchStatus === "ready" && saved.positions?.length) return saved;
  const token = randomUUID();
  const claimed = await Eclipse.findOneAndUpdate({ _id: eclipseId, fetchStatus: { $ne: "ready" }, ...leaseFilter() }, {
    $set: { lockToken: token, lockUntil: new Date(Date.now() + 5 * 60_000), fetchStatus: "running" },
    $unset: { error: 1 },
  }, { new: true }).lean();
  if (!claimed) {
    const ready = await Eclipse.findById(eclipseId).lean();
    if (ready?.fetchStatus === "ready" && ready.positions?.length) return ready;
    throw new OverlayError("Карта затмения уже рассчитывается. Повторите через минуту.", 409);
  }
  try {
    const d = claimed.maximumAt;
    const raw = await fetchEclipsePlanets({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1,
      date: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes(), seconds: d.getUTCSeconds(),
      latitude: 0, longitude: 0, timezone: 0,
      config: { observation_point: "geocentric", ayanamsha: "tropical", house_system: "Placidus", language: "ru" },
    });
    const positions = extractPositions(raw);
    const result = await Eclipse.findOneAndUpdate({ _id: eclipseId, lockToken: token }, {
      $set: { raw, positions, fetchStatus: "ready", fetchedAt: new Date() },
      $unset: { lockToken: 1, lockUntil: 1, error: 1 },
    }, { new: true }).lean();
    if (!result) throw new OverlayError("Задача расчёта была перезапущена. Откройте результат заново.", 409);
    return result;
  } catch (error) {
    await Eclipse.updateOne({ _id: eclipseId, lockToken: token }, {
      $set: { fetchStatus: "error", error: msg(error) }, $unset: { lockToken: 1, lockUntil: 1 },
    });
    throw error;
  }
}

function toView(r: OverlayRecord & { _id: mongoose.Types.ObjectId }): OverlayView {
  return { id: String(r._id), natal: r.natal, eclipse: r.eclipse, aspects: r.aspects,
    interpretation: r.interpretation, interpretationStatus: r.interpretationStatus,
    interpretationError: r.interpretationError, messages: r.messages,
    busy: !!r.lockUntil && r.lockUntil > new Date(), createdAt: r.createdAt.toISOString() };
}
export async function getOverlay(id: string, userId: string) {
  objectId.parse(id); await db();
  const r = await Overlay.findOne({ _id: id, userId }).lean();
  if (!r) throw new OverlayError("Наложение не найдено", 404);
  return toView(r);
}
export async function listOverlays(userId: string) {
  await db();
  const rows = await Overlay.find({ userId }).sort({ createdAt: -1 })
    .select("natal.label eclipse.type eclipse.maximumAt aspects interpretationStatus createdAt").lean();
  return rows.map(r => ({ id: String(r._id), label: r.natal.label, eclipseType: r.eclipse.type,
    maximumAt: r.eclipse.maximumAt, aspectCount: r.aspects.length,
    interpretationStatus: r.interpretationStatus, createdAt: r.createdAt.toISOString() }));
}
export async function createOverlay(input: unknown, userId: string) {
  const { natalChartId, eclipseId } = z.object({ natalChartId: objectId, eclipseId: objectId }).parse(input);
  await db();
  const key = { userId, natalChartId, eclipseId, calculationVersion: CALCULATION_VERSION };
  const existing = await Overlay.findOne(key).lean();
  if (existing) return { overlay: toView(existing), created: false };
  // Проверка владельца обязательна даже при знании чужого chartId.
  const clients = await Client.find({ userId }).select("_id birthInput").lean();
  const chart = await ChartResult.findOne({ _id: natalChartId, clientId: { $in: clients.map(c => c._id) } }).lean();
  if (!chart) throw new OverlayError("Натальная карта не найдена", 404);
  const client = clients.find(c => String(c._id) === String(chart.clientId));
  if (!client) throw new OverlayError("Натальная карта не найдена", 404);
  const positions = extractPositions(chart.planets);
  const eclipse = await prepareEclipse(eclipseId);
  const aspects = calculateAspects(positions, eclipse.positions!);
  const birth = client.birthInput;
  const label = `${chart.isPrimary ? "Основная карта" : "Карта"} · ${birth.date} ${birth.time} · ${birth.placeName}`;
  try {
    const r = await Overlay.create({ ...key, natal: { chartId: natalChartId, label, birthInput: birth,
      houses: chart.housesDisplay, positions },
      eclipse: { id: eclipseId, type: eclipse.type, maximumAt: eclipse.maximumAt.toISOString(),
        sourceUrl: eclipse.sourceUrl, sourceTime: eclipse.sourceTime, timeNote: eclipse.timeNote, positions: eclipse.positions! },
      aspects, interpretationStatus: aspects.length ? "idle" : "empty", interpretation: "", messages: [],
    });
    return { overlay: toView(r), created: true };
  } catch (e) {
    if (duplicate(e)) { const r = await Overlay.findOne(key).lean(); if (r) return { overlay: toView(r), created: false }; }
    throw e;
  }
}
async function claimOverlay(id: string, userId: string) {
  objectId.parse(id); await db();
  const token = randomUUID();
  const r = await Overlay.findOneAndUpdate({ _id: id, userId, ...leaseFilter() }, {
    $set: { lockToken: token, lockUntil: new Date(Date.now() + 5 * 60_000) },
  }, { new: true }).lean();
  if (!r) {
    if (!await Overlay.exists({ _id: id, userId })) throw new OverlayError("Наложение не найдено", 404);
    throw new OverlayError("ИИ уже обрабатывает запрос. Дождитесь завершения.", 409);
  }
  return { record: r, token };
}
export async function reinterpretOverlay(id: string, userId: string) {
  const { record, token } = await claimOverlay(id, userId);
  try {
    if (!record.aspects.length) {
      await Overlay.updateOne({ _id: id, lockToken: token }, { $set: { interpretationStatus: "empty" } });
    } else {
      await Overlay.updateOne({ _id: id, lockToken: token }, { $set: { interpretationStatus: "running" }, $unset: { interpretationError: 1 } });
      const text = await interpretOverlayData(record);
      const updated = await Overlay.updateOne({ _id: id, lockToken: token }, {
        $set: { interpretation: text, interpretationStatus: "complete" }, $unset: { interpretationError: 1 },
      });
      if (!updated.matchedCount) throw new OverlayError("Задача ИИ была перезапущена. Откройте результат заново.", 409);
    }
  } catch (error) {
    await Overlay.updateOne({ _id: id, lockToken: token }, {
      $set: { interpretationStatus: "error", interpretationError: msg(error) },
    });
    throw error;
  } finally {
    await Overlay.updateOne({ _id: id, lockToken: token }, { $unset: { lockToken: 1, lockUntil: 1 } });
  }
  return getOverlay(id, userId);
}
export async function askOverlay(id: string, userId: string, input: unknown) {
  const { question, aspectId } = z.object({ question: z.string().trim().min(1).max(4000), aspectId: z.string().max(150).optional() }).parse(input);
  const { record, token } = await claimOverlay(id, userId);
  try {
    if (aspectId && !record.aspects.some(a => a.id === aspectId)) throw new OverlayError("Аспект не принадлежит этому наложению");
    const answer = await interpretOverlayData(record, question, aspectId);
    const createdAt = new Date().toISOString();
    const updated = await Overlay.updateOne({ _id: id, lockToken: token }, { $push: { messages: { $each: [
      { role: "user", content: question, aspectId, createdAt }, { role: "assistant", content: answer, aspectId, createdAt },
    ] } } });
    if (!updated.matchedCount) throw new OverlayError("Задача ИИ была перезапущена. Откройте чат заново.", 409);
  } finally { await Overlay.updateOne({ _id: id, lockToken: token }, { $unset: { lockToken: 1, lockUntil: 1 } }); }
  return getOverlay(id, userId);
}
