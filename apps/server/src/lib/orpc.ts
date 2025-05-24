import { os, ORPCError } from "@orpc/server";
import type { Context } from "server/src/lib/context";

export const o = os.$context<Context>();

export const publicProcedure = o;
