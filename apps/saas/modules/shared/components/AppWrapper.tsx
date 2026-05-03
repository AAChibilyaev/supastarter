"use client";

import { CsatBanner } from "@feedback/components/CsatBanner";
import { SidebarInset, SidebarProvider } from "@repo/ui";
import { AppSidebar } from "@shared/components/AppSidebar";
import type { PropsWithChildren } from "react";

export function AppWrapper({ children }: PropsWithChildren) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-h-0">
				<div className="min-h-0 min-w-0 flex h-full flex-1 flex-col overflow-y-auto">
					<div className="max-w-screen-2xl p-6 mx-auto w-full">{children}</div>
				</div>
			</SidebarInset>
			<CsatBanner />
		</SidebarProvider>
	);
}
