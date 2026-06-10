import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";

/**
 * Rules content collection (Unit 2 — Rules Center / landing teaser).
 * MDX files live under content/rules/{locale}/*.mdx and are compiled at build
 * time into typed RuleDocument records. A bad frontmatter field fails the build,
 * never production (BR-2.14, NFR-Design maintainability).
 */
const rules = defineCollection({
  name: "rules",
  directory: "content/rules",
  include: "**/*.mdx",
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    order: z.number(),
    audience: z.enum(["teaser", "full"]),
    content: z.string(),
  }),
  transform: async (document, context) => {
    const body = await compileMDX(context, document);
    // content/rules/<locale>/<file>.mdx → _meta.directory is the locale folder
    const locale = document._meta.directory;
    return { ...document, body, locale };
  },
});

export default defineConfig({
  content: [rules],
});
