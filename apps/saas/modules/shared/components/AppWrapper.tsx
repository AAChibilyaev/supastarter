"use client";

import { SidebarInset, SidebarProvider } from "@repo/ui";
import { AppSidebar } from "@shared/components/AppSidebar";
import type { PropsWithChildren } from "react";

export function AppWrapper({ children }: PropsWithChildren) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-h-0">
				<div className="flex min-h-0 min-w-0 h-full flex-1 flex-col overflow-y-auto">
					<div className="mx-auto w-full max-w-screen-2xl p-6">{children}</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
