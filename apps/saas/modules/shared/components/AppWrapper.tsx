"use client";

import { CsatBanner } from "@feedback/components/CsatBanner";
import { NpsModal } from "@feedback/components/NpsModal";
import { SidebarInset, SidebarProvider } from "@repo/ui";
import { createDashboardTour } from "@search/components/GuidedTour";
import { AppSidebar } from "@shared/components/AppSidebar";
import type { PropsWithChildren } from "react";

import "shepherd.js/dist/css/shepherd.css";
import { useEffect } from "react";

export function AppWrapper({ children }: PropsWithChildren) {
	// Trigger guided tour on mount for first-time users
	useEffect(() => {
		// Small delay to let the DOM fully render
		const timer = setTimeout(() => {
			void createDashboardTour();
		}, 1500);
		return () => clearTimeout(timer);
	}, []);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-h-0">
				<div className="min-h-0 min-w-0 flex h-full flex-1 flex-col overflow-x-hidden overflow-y-auto">
					<div className="max-w-screen-2xl p-4 sm:p-6 lg:p-8 mx-auto w-full">
						{children}
					</div>
				</div>
			</SidebarInset>
			<CsatBanner />
			<NpsModal />
		</SidebarProvider>
	);
}
