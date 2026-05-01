import { AiChat } from "@ai/components/AiChat";
import { PageHeader } from "@shared/components/PageHeader";

export default async function AiDemoPage() {
	return (
		<>
			<PageHeader
				title="AI Chatbot"
				subtitle="AI-powered assistant"
				className="max-w-3xl mx-auto"
			/>

			<AiChat />
		</>
	);
}
