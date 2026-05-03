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
	"FILE_DOCX",
	"FILE_XLSX",
	"FILE_PPTX",
	"FILE_EPUB",
	"FILE_IMG",
	"FILE_AUDIO",
	"FILE_VIDEO",
	"FILE_CSV",
	"FILE_JSON",
	"FILE_TXT",
	"HTTP_SITEMAP",
	"RSS",
]);
