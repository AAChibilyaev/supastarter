"use client";

import { config as storageConfig } from "@repo/storage/config";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Users2Icon } from "lucide-react";
import { useMemo } from "react";

export const OrganizationLogo = ({
	name,
	logoUrl,
	className,
	ref,
}: React.ComponentProps<typeof Avatar> & {
	name: string;
	logoUrl?: string | null;
	className?: string;
}) => {
	const logoSrc = useMemo(
		() =>
			logoUrl
				? logoUrl.startsWith("http")
					? logoUrl
					: `/image-proxy/${storageConfig.bucketNames.avatars}/${logoUrl}`
				: undefined,
		[logoUrl],
	);

	return (
		<Avatar ref={ref} className={className}>
			<AvatarImage src={logoSrc} />
			<AvatarFallback className="bg-primary/10 text-primary uppercase" title={name}>
				<Users2Icon className="size-4" />
			</AvatarFallback>
		</Avatar>
	);
};

OrganizationLogo.displayName = "OrganizationLogo";
