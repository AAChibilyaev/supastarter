"use client";

import { cn } from "@repo/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
	{ labelKey: "tabs.overview", href: "/settings/billing" },
	{
		labelKey: "tabs.paymentMethods",
		href: "/settings/billing/payment-methods",
	},
	{ labelKey: "tabs.invoices", href: "/settings/billing/invoices" },
] as const;

export function BillingNav() {
	const pathname = usePathname();
	const t = useTranslations("settings.billing");

	return (
		<div className="mb-6 flex border-b">
			{NAV_ITEMS.map((item) => {
				const isActive =
					item.href === "/settings/billing"
						? pathname === "/settings/billing"
						: pathname.startsWith(item.href);

				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"px-4 py-2 text-sm -mb-px border-b-2 transition-colors",
							isActive
								? "font-semibold border-primary text-primary"
								: "font-medium border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{t(labelKey)}
					</Link>
				);
			})}
		</div>
	);
}
