import { Button } from "@react-email/components";
import React, { type PropsWithChildren } from "react";

export default function PrimaryButton({
	href,
	children,
}: PropsWithChildren<{
	href: string;
}>) {
	return (
		<Button
			href={href}
			className="px-4 py-2 text-sm rounded-full bg-primary text-primary-foreground"
		>
			{children}
		</Button>
	);
}
