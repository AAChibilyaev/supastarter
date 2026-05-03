import { BillingNav } from "@shared/components/BillingNav";
import type { PropsWithChildren } from "react";

export default function BillingLayout({ children }: PropsWithChildren) {
	return (
		<>
			<BillingNav />
			{children}
		</>
	);
}
