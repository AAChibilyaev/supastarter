import { type EntryPointContext } from "./context-bridge";

export interface ChatUIOptions {
	container: HTMLElement;
	assistantName: string;
	locale: string;
	theme: "light" | "dark" | "auto";
	entryPoint: EntryPointContext;
	translations: Record<string, string>;
	onSendMessage: (message: string) => void;
	onClose?: () => void;
}

const CHAT_STYLES = `
:host {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --aac-chat-bg: #ffffff;
  --aac-chat-header: #1e293b;
  --aac-chat-user-bubble: #2563eb;
  --aac-chat-user-text: #ffffff;
  --aac-chat-bot-bubble: #f1f5f9;
  --aac-chat-bot-text: #1e293b;
  --aac-chat-input-border: #e2e8f0;
  --aac-chat-send: #2563eb;
  --aac-chat-radius: 12px;
  --aac-chat-font-size: 14px;
}
:host([theme="dark"]) {
  --aac-chat-bg: #1e293b;
  --aac-chat-header: #0f172a;
  --aac-chat-user-bubble: #3b82f6;
  --aac-chat-bot-bubble: #334155;
  --aac-chat-bot-text: #f1f5f9;
  --aac-chat-input-border: #475569;
}

.aac-chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--aac-chat-bg);
  border-radius: var(--aac-chat-radius);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
}

.aac-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--aac-chat-header);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
}

.aac-chat-header-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  line-height: 1;
}

.aac-chat-header-close:hover { color: #fff; }

.aac-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aac-chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: var(--aac-chat-radius);
  font-size: var(--aac-chat-font-size);
  line-height: 1.5;
  word-break: break-word;
}

.aac-chat-bubble.user {
  align-self: flex-end;
  background: var(--aac-chat-user-bubble);
  color: var(--aac-chat-user-text);
  border-bottom-right-radius: 2px;
}

.aac-chat-bubble.assistant {
  align-self: flex-start;
  background: var(--aac-chat-bot-bubble);
  color: var(--aac-chat-bot-text);
  border-bottom-left-radius: 2px;
}

.aac-chat-bubble.assistant a { color: var(--aac-chat-user-bubble); }

.aac-chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 10px 14px;
  background: var(--aac-chat-bot-bubble);
  border-radius: var(--aac-chat-radius);
  border-bottom-left-radius: 2px;
}

.aac-chat-typing span {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: aac-bounce 1.2s infinite;
}

.aac-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.aac-chat-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes aac-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.aac-chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 8px;
}

.aac-chat-suggestion {
  background: var(--aac-chat-bot-bubble);
  border: 1px solid var(--aac-chat-input-border);
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--aac-chat-bot-text);
  transition: background 0.15s;
}

.aac-chat-suggestion:hover {
  background: var(--aac-chat-input-border);
}

.aac-chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--aac-chat-input-border);
  background: var(--aac-chat-bg);
}

.aac-chat-input {
  flex: 1;
  border: 1px solid var(--aac-chat-input-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: var(--aac-chat-font-size);
  resize: none;
  min-height: 36px;
  max-height: 120px;
  outline: none;
  background: var(--aac-chat-bg);
  color: var(--aac-chat-bot-text);
  font-family: inherit;
  line-height: 1.4;
}

.aac-chat-send-btn {
  background: var(--aac-chat-send);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.15s;
  flex-shrink: 0;
  height: 36px;
}

.aac-chat-send-btn:hover { opacity: 0.85; }
.aac-chat-send-btn:disabled { opacity: 0.4; cursor: default; }

.aac-chat-escalation-bar {
  background: #fef3c7;
  color: #92400e;
  text-align: center;
  padding: 8px 16px;
  font-size: 13px;
  border-top: 1px solid #fde68a;
}
`;

function getStarterSuggestions(entryPoint: EntryPointContext, t: (key: string) => string): string[] {
	switch (entryPoint.entryPoint) {
		case "product_card":
			return [
				t("suggestion_size"),
				t("suggestion_compare"),
				t("suggestion_similar"),
			];
		case "catalog":
			return [
				t("suggestion_help_choose"),
				t("suggestion_best_for"),
				t("suggestion_budget"),
			];
		case "search_results":
			return [
				t("suggestion_refine"),
				t("suggestion_explain_diff"),
				t("suggestion_recommend"),
			];
		default:
			return [
				t("suggestion_start_sport"),
				t("suggestion_order_status"),
				t("suggestion_outfit"),
			];
	}
}

function simpleMarkdown(text: string): string {
	return text
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.*?)\*/g, "<em>$1</em>")
		.replace(/`(.*?)`/g, "<code>$1</code>")
		.replace(/\n/g, "<br>")
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export class ChatUI {
	private readonly shadow: ShadowRoot;
	private messagesEl!: HTMLElement;
	private inputEl!: HTMLTextAreaElement;
	private sendBtn!: HTMLButtonElement;
	private typingEl!: HTMLElement;
	private suggestionsEl!: HTMLElement;
	private escalationBar!: HTMLElement;
	private readonly opts: ChatUIOptions;
	private streamingBubble: HTMLElement | null = null;
	private streamingContent = "";

	constructor(opts: ChatUIOptions) {
		this.opts = opts;
		this.shadow = opts.container.attachShadow({ mode: "closed" });
		this.render();
	}

	private t(key: string): string {
		return this.opts.translations[key] ?? key;
	}

	private render(): void {
		const style = document.createElement("style");
		style.textContent = CHAT_STYLES;

		const wrapper = document.createElement("div");
		wrapper.className = "aac-chat-wrapper";
		wrapper.setAttribute("role", "main");

		// Header
		const header = document.createElement("div");
		header.className = "aac-chat-header";
		header.innerHTML = `
			<span>${this.opts.assistantName}</span>
			<button class="aac-chat-header-close" aria-label="${this.t("close")}" title="${this.t("close")}">&#x2715;</button>
		`;
		header.querySelector("button")!.addEventListener("click", () => this.opts.onClose?.());

		// Messages
		this.messagesEl = document.createElement("div");
		this.messagesEl.className = "aac-chat-messages";
		this.messagesEl.setAttribute("role", "log");
		this.messagesEl.setAttribute("aria-live", "polite");
		this.messagesEl.setAttribute("aria-label", this.t("chat_history"));

		// Typing indicator (hidden initially)
		this.typingEl = document.createElement("div");
		this.typingEl.className = "aac-chat-typing";
		this.typingEl.innerHTML = "<span></span><span></span><span></span>";
		this.typingEl.style.display = "none";

		// Suggestions
		this.suggestionsEl = document.createElement("div");
		this.suggestionsEl.className = "aac-chat-suggestions";
		this.renderSuggestions();

		// Escalation bar (hidden initially)
		this.escalationBar = document.createElement("div");
		this.escalationBar.className = "aac-chat-escalation-bar";
		this.escalationBar.textContent = this.t("chat_escalated");
		this.escalationBar.style.display = "none";

		// Input area
		const inputArea = document.createElement("div");
		inputArea.className = "aac-chat-input-area";

		this.inputEl = document.createElement("textarea");
		this.inputEl.className = "aac-chat-input";
		this.inputEl.placeholder = this.t("chat_placeholder");
		this.inputEl.rows = 1;
		this.inputEl.setAttribute("aria-label", this.t("chat_placeholder"));

		this.sendBtn = document.createElement("button");
		this.sendBtn.className = "aac-chat-send-btn";
		this.sendBtn.textContent = this.t("chat_send");
		this.sendBtn.type = "button";
		this.sendBtn.setAttribute("aria-label", this.t("chat_send"));

		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.submitMessage();
			}
		});
		this.inputEl.addEventListener("input", () => {
			this.inputEl.style.height = "auto";
			this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 120)}px`;
		});
		this.sendBtn.addEventListener("click", () => this.submitMessage());

		inputArea.appendChild(this.inputEl);
		inputArea.appendChild(this.sendBtn);

		wrapper.appendChild(header);
		wrapper.appendChild(this.messagesEl);
		wrapper.appendChild(this.typingEl);
		wrapper.appendChild(this.suggestionsEl);
		wrapper.appendChild(this.escalationBar);
		wrapper.appendChild(inputArea);

		this.shadow.appendChild(style);
		this.shadow.appendChild(wrapper);
	}

	private renderSuggestions(): void {
		this.suggestionsEl.innerHTML = "";
		const suggestions = getStarterSuggestions(this.opts.entryPoint, this.t.bind(this));
		for (const s of suggestions) {
			const btn = document.createElement("button");
			btn.className = "aac-chat-suggestion";
			btn.textContent = s;
			btn.addEventListener("click", () => {
				this.hideSuggestions();
				this.opts.onSendMessage(s);
			});
			this.suggestionsEl.appendChild(btn);
		}
	}

	private hideSuggestions(): void {
		this.suggestionsEl.style.display = "none";
	}

	private submitMessage(): void {
		const message = this.inputEl.value.trim();
		if (!message) return;
		this.hideSuggestions();
		this.inputEl.value = "";
		this.inputEl.style.height = "auto";
		this.opts.onSendMessage(message);
	}

	addUserMessage(content: string): void {
		const bubble = document.createElement("div");
		bubble.className = "aac-chat-bubble user";
		bubble.textContent = content;
		this.messagesEl.appendChild(bubble);
		this.scrollToBottom();
	}

	startAssistantStream(): void {
		this.streamingContent = "";
		this.streamingBubble = document.createElement("div");
		this.streamingBubble.className = "aac-chat-bubble assistant";
		this.streamingBubble.setAttribute("aria-live", "off");
		this.messagesEl.appendChild(this.streamingBubble);
		this.showTyping();
		this.setInputDisabled(true);
	}

	appendStreamChunk(text: string): void {
		if (!this.streamingBubble) return;
		this.streamingContent += text;
		this.streamingBubble.innerHTML = simpleMarkdown(this.streamingContent);
		this.hideTyping();
		this.scrollToBottom();
	}

	finishAssistantStream(): void {
		this.streamingBubble = null;
		this.streamingContent = "";
		this.hideTyping();
		this.setInputDisabled(false);
		this.inputEl.focus();
		this.scrollToBottom();
	}

	showError(message: string): void {
		const bubble = document.createElement("div");
		bubble.className = "aac-chat-bubble assistant";
		bubble.textContent = message;
		bubble.style.color = "#ef4444";
		this.messagesEl.appendChild(bubble);
		this.hideTyping();
		this.setInputDisabled(false);
		this.scrollToBottom();
	}

	showEscalationBar(): void {
		this.escalationBar.style.display = "block";
	}

	private showTyping(): void {
		this.typingEl.style.display = "flex";
	}

	private hideTyping(): void {
		this.typingEl.style.display = "none";
	}

	private setInputDisabled(disabled: boolean): void {
		this.inputEl.disabled = disabled;
		this.sendBtn.disabled = disabled;
	}

	private scrollToBottom(): void {
		requestAnimationFrame(() => {
			this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
		});
	}
}
