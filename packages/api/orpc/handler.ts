import { onError } from "@orpc/client";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { auth } from "@repo/auth";
import { logger } from "@repo/logs";

import { router } from "./router";

function shouldSkipApiErrorLog(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const message = error.message.toLowerCase();
	return message === "unauthorized" || message.includes("unauthorized");
}

export const rpcHandler = new RPCHandler(router, {
	clientInterceptors: [
		onError((error) => {
			if (shouldSkipApiErrorLog(error)) {
				return;
			}

			logger.error(error);
		}),
	],
});

export const openApiHandler = new OpenAPIHandler(router, {
	plugins: [
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: async () => {
				const authSchema = await auth.api.generateOpenAPISchema();

				authSchema.paths = Object.fromEntries(
					Object.entries(authSchema.paths).map(([path, pathItem]) => [`/auth${path}`, pathItem]),
				);

				return {
					...(authSchema as any),
					info: {
						title: "supastarter API",
						version: "1.0.0",
					},
					servers: [
						{
							url: "/api",
						},
					],
				};
			},
			docsPath: "/docs",
		}),
	],
	clientInterceptors: [
		onError((error) => {
			if (shouldSkipApiErrorLog(error)) {
				return;
			}

			logger.error(error);
		}),
	],
});
