import { z } from "zod";

export const knowledgeOwnerTypeSchema = z.enum(["USER", "ORGANIZATION"]);
export const knowledgeSpaceSlugSchema = z
	.string()
	.min(2)
	.max(64)
	.regex(/^[a-z0-9-]+$/);

export const knowledgeSourceTypeSchema = z.enum([
	"CMS_PRESTASHOP",
	"CMS_BITRIX",
	"FILE_MD",
	"FILE_XML",
	"FILE_PDF",
	"HTTP_SITEMAP",
	"RSS",
]);
