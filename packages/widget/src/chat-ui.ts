import { type ConversationSummary, type HistoryMessage } from "./chat-client";
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
	onNewChat?: () => void;
	onOpenHistory?: () => void;
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
  position: relative;
}

/* Header */
.aac-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--aac-chat-header);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  gap: 8px;
}
.aac-chat-header-title { flex: 1; }
.aac-chat-header-actions { display: flex; align-items: center; gap: 2px; }
.aac-chat-icon-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  border-radius: 6px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.aac-chat-icon-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
.aac-chat-icon-btn.active { color: #60a5fa; }

/* Messages */
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
  position: relative;
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
.aac-chat-speak-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  padding: 2px;
  transition: opacity 0.15s;
  color: #94a3b8;
}
.aac-chat-bubble.assistant:hover .aac-chat-speak-btn { opacity: 1; }

/* Typing */
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
  width: 6px; height: 6px;
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

/* Suggestions */
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
.aac-chat-suggestion:hover { background: var(--aac-chat-input-border); }

/* Escalation */
.aac-chat-escalation-bar {
  background: #fef3c7;
  color: #92400e;
  text-align: center;
  padding: 8px 16px;
  font-size: 13px;
  border-top: 1px solid #fde68a;
}

/* Input area */
.aac-chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 10px 12px;
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
  padding: 0 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.15s;
  flex-shrink: 0;
  height: 36px;
}
.aac-chat-send-btn:hover { opacity: 0.85; }
.aac-chat-send-btn:disabled { opacity: 0.4; cursor: default; }
.aac-chat-mic-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--aac-chat-input-border);
  border-radius: 8px;
  background: var(--aac-chat-bg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--aac-chat-bot-text);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
  font-size: 16px;
}
.aac-chat-mic-btn:hover { background: var(--aac-chat-bot-bubble); }
.aac-chat-mic-btn.listening {
  background: #fee2e2; border-color: #ef4444; color: #ef4444;
  animation: aac-pulse 1s infinite;
}
@keyframes aac-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* History panel */
.aac-chat-history-panel {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--aac-chat-bg);
  display: flex; flex-direction: column;
  z-index: 10;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
}
.aac-chat-history-panel.open { transform: translateX(0); }
.aac-chat-history-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: var(--aac-chat-header);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}
.aac-chat-history-list {
  flex: 1;
  overflow-y: auto;
}
.aac-chat-history-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--aac-chat-input-border);
  cursor: pointer;
  transition: background 0.15s;
}
.aac-chat-history-item:hover { background: var(--aac-chat-bot-bubble); }
.aac-chat-history-item-preview {
  font-size: 13px;
  color: var(--aac-chat-bot-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.aac-chat-history-item-meta {
  font-size: 11px;
  color: #94a3b8;
}
.aac-chat-history-empty {
  padding: 32px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
`;

function getStarterSuggestions(
	entryPoint: EntryPointContext,
	t: (key: string) => string,
): string[] {
	switch (entryPoint.entryPoint) {
		case "product_card":
			return [t("suggestion_size"), t("suggestion_compare"), t("suggestion_similar")];
		case "catalog":
			return [t("suggestion_help_choose"), t("suggestion_best_for"), t("suggestion_budget")];
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
		.replace(
			/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener">$1</a>',
		);
}

function formatRelative(dateStr: string | Date): string {
	const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
	const diff = Date.now() - date.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "только что";
	if (mins < 60) return `${mins} мин назад`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} ч назад`;
	return date.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
}

export class ChatUI {
	private readonly shadow: ShadowRoot;
	private messagesEl!: HTMLElement;
	private inputEl!: HTMLTextAreaElement;
	private sendBtn!: HTMLButtonElement;
	private micBtn!: HTMLButtonElement;
	private typingEl!: HTMLElement;
	private suggestionsEl!: HTMLElement;
	private escalationBar!: HTMLElement;
	private historyPanel!: HTMLElement;
	private historyList!: HTMLElement;
	private ttsBtn!: HTMLButtonElement;
	private readonly opts: ChatUIOptions;
	private streamingBubble: HTMLElement | null = null;
	private streamingContent = "";
	private ttsEnabled = false;

	constructor(opts: ChatUIOptions) {
		this.opts = opts;
		this.shadow = opts.container.attachShadow({ mode: "closed" });
		this.render();
	}

	private t(key: string): string {
		return this.opts.translations[key] ?? key;
	}

	private speakText(text: string): void {
		if (!this.ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
		window.speechSynthesis.cancel();
		const plain = text.replace(/<[^>]+>/g, "").replace(/[*_`#]/g, "");
		const utterance = new SpeechSynthesisUtterance(plain);
		utterance.lang = this.opts.locale;
		window.speechSynthesis.speak(utterance);
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
			<span class="aac-chat-header-title">${this.opts.assistantName}</span>
			<div class="aac-chat-header-actions">
				<button class="aac-chat-icon-btn" data-action="history" title="${this.t("chat_new_chat")}" aria-label="${this.t("chat_new_chat")}">&#9776;</button>
				<button class="aac-chat-icon-btn" data-action="new" title="${this.t("chat_new_chat")}" aria-label="${this.t("chat_new_chat")}">&#43;</button>
				<button class="aac-chat-icon-btn" data-action="tts" title="${this.t("chat_speak") ?? "TTS"}" aria-label="${this.t("chat_speak") ?? "TTS"}">&#128266;</button>
				<button class="aac-chat-icon-btn" data-action="close" title="${this.t("close")}" aria-label="${this.t("close")}">&#x2715;</button>
			</div>
		`;
		header
			.querySelector<HTMLButtonElement>('[data-action="close"]')!
			.addEventListener("click", () => this.opts.onClose?.());
		header
			.querySelector<HTMLButtonElement>('[data-action="new"]')!
			.addEventListener("click", () => this.opts.onNewChat?.());
		header
			.querySelector<HTMLButtonElement>('[data-action="history"]')!
			.addEventListener("click", () => this.openHistoryPanel());

		this.ttsBtn = header.querySelector<HTMLButtonElement>('[data-action="tts"]')!;
		this.ttsBtn.addEventListener("click", () => {
			this.ttsEnabled = !this.ttsEnabled;
			this.ttsBtn.classList.toggle("active", this.ttsEnabled);
			if (!this.ttsEnabled) window.speechSynthesis?.cancel();
		});

		// Messages
		this.messagesEl = document.createElement("div");
		this.messagesEl.className = "aac-chat-messages";
		this.messagesEl.setAttribute("role", "log");
		this.messagesEl.setAttribute("aria-live", "polite");

		// Typing indicator
		this.typingEl = document.createElement("div");
		this.typingEl.className = "aac-chat-typing";
		this.typingEl.innerHTML = "<span></span><span></span><span></span>";
		this.typingEl.style.display = "none";

		// Suggestions
		this.suggestionsEl = document.createElement("div");
		this.suggestionsEl.className = "aac-chat-suggestions";
		this.renderSuggestions();

		// Escalation bar
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

		this.micBtn = document.createElement("button");
		this.micBtn.className = "aac-chat-mic-btn";
		this.micBtn.type = "button";
		this.micBtn.setAttribute("aria-label", this.t("chat_voice") ?? "Voice");
		this.micBtn.innerHTML = "&#127908;";
		this.micBtn.addEventListener("click", () => this.startVoiceInput());

		this.sendBtn = document.createElement("button");
		this.sendBtn.className = "aac-chat-send-btn";
		this.sendBtn.textContent = this.t("chat_send");
		this.sendBtn.type = "button";

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
		inputArea.appendChild(this.micBtn);
		inputArea.appendChild(this.sendBtn);

		// History panel
		this.historyPanel = document.createElement("div");
		this.historyPanel.className = "aac-chat-history-panel";
		this.historyPanel.innerHTML = `
			<div class="aac-chat-history-header">
				<span>${this.t("chat_history") ?? "Диалоги"}</span>
				<button class="aac-chat-icon-btn" style="color:rgba(255,255,255,0.7)" data-action="close-history">&#x2715;</button>
			</div>
		`;
		this.historyPanel
			.querySelector<HTMLButtonElement>('[data-action="close-history"]')!
			.addEventListener("click", () => this.closeHistoryPanel());

		this.historyList = document.createElement("div");
		this.historyList.className = "aac-chat-history-list";
		const emptyMsg = document.createElement("div");
		emptyMsg.className = "aac-chat-history-empty";
		emptyMsg.textContent = this.t("chat_history_empty") ?? "Нет диалогов";
		this.historyList.appendChild(emptyMsg);
		this.historyPanel.appendChild(this.historyList);

		wrapper.appendChild(header);
		wrapper.appendChild(this.messagesEl);
		wrapper.appendChild(this.typingEl);
		wrapper.appendChild(this.suggestionsEl);
		wrapper.appendChild(this.escalationBar);
		wrapper.appendChild(inputArea);
		wrapper.appendChild(this.historyPanel);

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

	private startVoiceInput(): void {
		if (typeof window === "undefined") return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
		if (!SR) return;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
		const recognition = new SR();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.lang = this.opts.locale;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.interimResults = false;

		this.micBtn.classList.add("listening");

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		recognition.onresult = (event: any) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const transcript = String(event.results[0][0].transcript);
			this.inputEl.value = transcript;
			this.inputEl.focus();
		};
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.onerror = () => this.micBtn.classList.remove("listening");
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.onend = () => this.micBtn.classList.remove("listening");
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		recognition.start();
	}

	private openHistoryPanel(): void {
		this.historyPanel.classList.add("open");
		this.opts.onOpenHistory?.();
	}

	private closeHistoryPanel(): void {
		this.historyPanel.classList.remove("open");
	}

	// Called from outside to populate history list
	loadHistoryItems(conversations: ConversationSummary[], onSelect: (id: string) => void): void {
		this.historyList.innerHTML = "";

		if (conversations.length === 0) {
			const empty = document.createElement("div");
			empty.className = "aac-chat-history-empty";
			empty.textContent = this.t("chat_history_empty") ?? "Нет диалогов";
			this.historyList.appendChild(empty);
			return;
		}

		for (const conv of conversations) {
			const item = document.createElement("div");
			item.className = "aac-chat-history-item";

			const preview = document.createElement("div");
			preview.className = "aac-chat-history-item-preview";
			preview.textContent = conv.firstUserMessage ?? "—";

			const meta = document.createElement("div");
			meta.className = "aac-chat-history-item-meta";
			meta.textContent = `${formatRelative(conv.lastMessageAt)} · ${conv.messageCount} сообщ.`;

			item.appendChild(preview);
			item.appendChild(meta);
			item.addEventListener("click", () => {
				this.closeHistoryPanel();
				onSelect(conv.id);
			});

			this.historyList.appendChild(item);
		}
	}

	// Load historical messages into the chat
	loadMessages(messages: HistoryMessage[]): void {
		this.clearMessages();
		this.hideSuggestions();
		for (const msg of messages) {
			if (msg.role === "user") {
				this.addUserMessage(msg.content);
			} else {
				const bubble = document.createElement("div");
				bubble.className = "aac-chat-bubble assistant";
				bubble.innerHTML = simpleMarkdown(msg.content) + this.buildSpeakBtn(msg.content);
				this.messagesEl.appendChild(bubble);
			}
		}
		this.scrollToBottom();
	}

	private buildSpeakBtn(text: string): string {
		return `<button class="aac-chat-speak-btn" data-text="${text.replace(/"/g, "&quot;").slice(0, 500)}" title="Прочитать вслух">&#128266;</button>`;
	}

	clearMessages(): void {
		this.messagesEl.innerHTML = "";
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
		if (this.streamingBubble && this.streamingContent) {
			// Add speak button
			this.streamingBubble.innerHTML =
				simpleMarkdown(this.streamingContent) + this.buildSpeakBtn(this.streamingContent);

			// Attach speak button handler
			const speakBtn =
				this.streamingBubble.querySelector<HTMLButtonElement>(".aac-chat-speak-btn");
			if (speakBtn) {
				speakBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					const t = speakBtn.dataset["text"] ?? "";
					this.speakText(t);
				});
			}

			// Auto-TTS if enabled
			this.speakText(this.streamingContent);
		}
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
		this.micBtn.disabled = disabled;
	}

	private scrollToBottom(): void {
		requestAnimationFrame(() => {
			this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
		});
	}
}
