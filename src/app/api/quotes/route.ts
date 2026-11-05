import { apiUser, body, route } from "@/lib/api";
import { col, newId, nextCode, nowIso } from "@/lib/db";
import { normalizeQuote } from "@/lib/quote-service";
import type { Quote } from "@/lib/types";

export const POST = route(async (req) => {
  const user = await apiUser();
  const data = await normalizeQuote(await body(req), user);
  const quote: Quote = {
    ...data, _id: newId(), code: await nextCode("BG"), status: "draft",
    createdBy: user.id, createdByRole: user.role, createdAt: nowIso(),
  };
  await (await col<Quote>("quotes")).insertOne(quote);
  return { id: quote._id, code: quote.code };
});
