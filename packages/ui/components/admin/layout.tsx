import type { CoreLayoutProps } from "ra-core";
import type { ErrorInfo } from "react";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { AppSidebar } from "./app-sidebar";
import { Error } from "./error";
import { Loading } from "./loading";
import { LocalesMenuButton } from "./locales-menu-button";
import { Notification } from "./notification";
import { RefreshButton } from "./refresh-button";
import { ThemeModeToggle } from "./theme-mode-toggle";
import { UserMenu } from "./user-menu";
import { SidebarProvider, SidebarTrigger } from "../sidebar";
import { cn } from "../../lib";

/**
 * The main application layout with sidebar, header, and content area.
 *
 * Renders the app structure with a collapsible sidebar, header with breadcrumb navigation,
 * theme toggle, user menu, and main content area. Includes error boundary and loading states.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/layout/ Layout documentation}
 */
export const Layout = (props: CoreLayoutProps) => {
	const [errorInfo, setErrorInfo] = useState<ErrorInfo | undefined>(undefined);
	const handleError = (_: unknown, info: ErrorInfo) => {
		setErrorInfo(info);
	};
	return (
		<SidebarProvider>
			<AppSidebar />
			<main
				className={cn(
					"ml-auto w-full max-w-full",
					"peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]",
					"peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]",
					"sm:transition-[width] sm:duration-200 sm:ease-linear",
					"flex h-svh flex-col",
					"group-data-[scroll-locked=1]/body:h-full",
					"has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh",
				)}
			>
				<header className="h-16 md:h-12 gap-2 px-4 flex shrink-0 items-center">
					<SidebarTrigger className="sm:scale-100 scale-125" />
					<div className="flex flex-1 items-center" id="breadcrumb" />
					<LocalesMenuButton />
					<ThemeModeToggle />
					<RefreshButton />
					<UserMenu />
				</header>
				<ErrorBoundary
					onError={handleError}
					fallbackRender={({ error, resetErrorBoundary }) => (
						<Error
							error={error}
							errorInfo={errorInfo}
							resetErrorBoundary={resetErrorBoundary}
						/>
					)}
				>
					<Suspense fallback={<Loading />}>
						<div className="px-4 flex flex-1 flex-col">{props.children}</div>
					</Suspense>
				</ErrorBoundary>
			</main>
			<Notification />
		</SidebarProvider>
	);
};
