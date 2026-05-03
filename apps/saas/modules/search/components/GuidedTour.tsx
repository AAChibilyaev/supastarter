"use client";

const TOUR_DISMISSED_KEY = "aacsearch_guided_tour_dismissed";
let tourInstance: unknown = null;

/**
 * Creates a guided tour for the dashboard.
 * Shows Shepherds.js walkthrough for first-time users.
 */
export function createDashboardTour(): Promise<void> {
	return new Promise((resolve) => {
		const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
		if (dismissed === "true") {
			resolve();
			return;
		}

		void import("shepherd.js").then((ShepherdModule) => {
			const Tour = ShepherdModule.default as unknown as {
				new (opts: Record<string, unknown>): {
					addStep(opts: Record<string, unknown>): void;
					start(): void;
					cancel(): void;
					complete(): void;
					next(): void;
					back(): void;
					on(event: string, handler: () => void): void;
				};
			};

			const tour = new Tour({
				useModalOverlay: true,
				exitOnEsc: true,
				keyboardNavigation: true,
				defaultStepOptions: {
					scrollTo: true,
					cancelButton: true,
				},
			});

			// Step 1: Welcome
			tour.addStep({
				id: "welcome",
				title: "Welcome to AACsearch! 👋",
				text: "Let's take a quick tour of your dashboard. You'll learn how to set up search, manage indexes, and more.",
				buttons: [
					{
						type: "cancel",
						text: "Skip Tour",
						action() {
							tour.cancel();
							localStorage.setItem(TOUR_DISMISSED_KEY, "true");
							resolve();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Start Tour",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 2: Overview
			tour.addStep({
				id: "overview",
				title: "Dashboard Overview",
				text: "This is your command center. Key metrics, recent activity, and quick actions are all here at a glance.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 3: Getting Started
			tour.addStep({
				id: "getting-started",
				title: "Getting Started Checklist",
				text: "Complete the 6-step checklist to get your search running. Each step guides you: create an index, connect data, sync products, test search, generate API keys, and embed the widget.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 4: Search Indexes
			tour.addStep({
				id: "search",
				title: "Search Indexes",
				text: "Create and manage your search indexes. Each index represents a collection of searchable data — like products, articles, or documents.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 5: API Keys
			tour.addStep({
				id: "api-keys",
				title: "API Keys",
				text: "Generate API keys and scoped tokens. Keys control access to your search endpoints — keep them secure. Different scopes for search, ingest, and admin access.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 6: Analytics
			tour.addStep({
				id: "analytics",
				title: "Search Analytics",
				text: "Track your search performance. See top queries, click-through rates, and usage patterns to optimize your search experience.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 7: Settings & Billing
			tour.addStep({
				id: "settings",
				title: "Settings & Billing",
				text: "Manage your organization settings, team members, billing plan, and notification preferences from the Settings page.",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "next",
						text: "Next",
						action() {
							tour.next();
						},
					},
				],
			});

			// Step 8: Done
			tour.addStep({
				id: "done",
				title: "You're All Set! 🎉",
				text: "You now know your way around. Head to the Getting Started page to set up your first search index. Happy searching!",
				buttons: [
					{
						type: "back",
						text: "Back",
						action() {
							tour.back();
						},
						classes: "shepherd-button-secondary",
					},
					{
						type: "complete",
						text: "Done",
						action() {
							tour.complete();
							localStorage.setItem(TOUR_DISMISSED_KEY, "true");
							resolve();
						},
					},
				],
			});

			tour.on("cancel", () => {
				localStorage.setItem(TOUR_DISMISSED_KEY, "true");
				resolve();
			});

			tour.on("complete", () => {
				localStorage.setItem(TOUR_DISMISSED_KEY, "true");
				resolve();
			});

			// Small delay to let the DOM fully render
			setTimeout(() => {
				tour.start();
				tourInstance = tour;
			}, 500);
		});
	});
}
