import { app } from "@repo/api";
import { auth } from "@repo/auth";
import { handle } from "hono/vercel";

const handler = handle(app);

const authAwareHandler = async (request: Request) => {
	const { pathname } = new URL(request.url);
	if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
		return auth.handler(request);
	}

	return handler(request);
};

export const GET = authAwareHandler;
export const POST = authAwareHandler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
