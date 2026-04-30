"use client";

import { SidebarInset, SidebarProvider } from "@repo/ui";
import { AppSidebar } from "@shared/components/AppSidebar";
import type { PropsWithChildren } from "react";

export function AppWrapper({ children }: PropsWithChildren) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<main className="h-full w-full overflow-y-auto">
					<div className="p-6">{children}</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
