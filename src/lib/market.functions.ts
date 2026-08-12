import { createServerFn } from "@tanstack/react-start";
import { montarPainel } from "./market.server";

export const getPainel = createServerFn({ method: "GET" }).handler(async () => montarPainel());
