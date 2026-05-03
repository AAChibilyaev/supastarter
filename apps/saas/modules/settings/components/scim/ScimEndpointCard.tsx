"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Copy, Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ScimEndpointCardProps {
	bearerTokenPrefix: string;
	endpointUrl: string | null;
	onRegenerate: () => void;
	onRevoke: () => void;
	organizationId: string;
}

export function ScimEndpointCard({
	bearerTokenPrefix,
	endpointUrl,
	onRegenerate,
	onRevoke,
	organizationId,
}: ScimEndpointCardProps) {
	const t = useTranslations("settings");
	const [showToken, setShowToken] = useState(false);
	const [copiedIndex, setCopiedIndex] = useState<"url" | "token" | null>(null);

	const scimBaseUrl = `${window.location.origin}/api/scim/v2/${organizationId}`;

	const handleCopy = async (value: string, type: "url" | "token") => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedIndex(type);
			setTimeout(() => setCopiedIndex(null), 2000);
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement("textarea");
			textarea.value = value;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			setCopiedIndex(type);
			setTimeout(() => setCopiedIndex(null), 2000);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("scim.endpoint.baseUrl")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* SCIM Base URL */}
				<div className="space-y-2">
					<label className="text-sm text-muted-foreground">
						{t("scim.endpoint.baseUrl")}
					</label>
					<div className="gap-2 flex">
						<Input value={scimBaseUrl} readOnly className="font-mono text-xs" />
						<Button
							variant="outline"
							size="icon"
							onClick={() => handleCopy(scimBaseUrl, "url")}
							title={t("scim.endpoint.copy")}
						>
							<Copy className="size-4" />
						</Button>
					</div>
					{copiedIndex === "url" && (
						<p className="text-xs text-success">{t("scim.endpoint.copied")}</p>
					)}
				</div>

				{/* Bearer Token */}
				<div className="space-y-2">
					<label className="text-sm text-muted-foreground">
						{t("scim.endpoint.bearerToken")}
					</label>
					<div className="gap-2 flex">
						<div className="relative flex-1">
							<Input
								value={
									showToken
										? bearerTokenPrefix
										: `${bearerTokenPrefix}${"•".repeat(20)}`
								}
								readOnly
								className="font-mono text-xs pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowToken(!showToken)}
								className="right-2 absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showToken ? (
									<EyeOff className="size-4" />
								) : (
									<Eye className="size-4" />
								)}
							</button>
						</div>
						<Button
							variant="outline"
							size="icon"
							onClick={() => handleCopy(bearerTokenPrefix, "token")}
							title={t("scim.endpoint.copy")}
						>
							<Copy className="size-4" />
						</Button>
					</div>
					{copiedIndex === "token" && (
						<p className="text-xs text-success">{t("scim.endpoint.copied")}</p>
					)}
				</div>

				{/* Action buttons */}
				<div className="gap-3 pt-2 flex flex-wrap">
					<Button variant="outline" size="sm" onClick={onRegenerate}>
						<RefreshCw className="size-3.5 mr-1.5" />
						{t("scim.endpoint.regenerate")}
					</Button>
					<Button variant="destructive" size="sm" onClick={onRevoke}>
						<Trash2 className="size-3.5 mr-1.5" />
						{t("scim.endpoint.revoke")}
					</Button>
				</div>

				{/* External endpoint URL */}
				{endpointUrl && (
					<div className="pt-2 border-t">
						<p className="text-xs text-muted-foreground">
							{t("scim.endpoint.externalUrl")}:{" "}
							<span className="font-mono">{endpointUrl}</span>
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
