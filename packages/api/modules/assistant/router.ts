import { publicProcedure } from "../../orpc/procedures";
import { assistantAnalyticsProcedure } from "./procedures/analytics";
import { getAssistantConfigProcedure, saveAssistantConfigProcedure } from "./procedures/config";
import { createConversationProcedure } from "./procedures/create-conversation";
import { escalateProcedure } from "./procedures/escalate";
import { getConversationHistoryProcedure } from "./procedures/get-conversation-history";
import { resolveConversationProcedure } from "./procedures/resolve-conversation";
import { streamAssistant } from "./procedures/stream-assistant";

export const assistantRouter = publicProcedure.router({
	createConversation: createConversationProcedure,
	stream: streamAssistant,
	getHistory: getConversationHistoryProcedure,
	resolve: resolveConversationProcedure,
	escalate: escalateProcedure,
	analytics: assistantAnalyticsProcedure,
	getConfig: getAssistantConfigProcedure,
	saveConfig: saveAssistantConfigProcedure,
});
