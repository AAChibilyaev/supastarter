/**
 * AACsearch Strapi plugin — Settings Page (React).
 * Allows users to configure the AACsearch connection and content type mappings.
 */

import React, { useState, useEffect } from "react";
import {
	Box,
	Button,
	Grid,
	HeaderLayout,
	Layout,
	Main,
	TextInput,
	ToggleCheckbox,
	Typography,
	Alert,
	ContentLayout,
	TabGroup,
	Tabs,
	Tab,
	Divider,
	Table,
	Thead,
	Tbody,
	Tr,
	Td,
	Th,
	EmptyStateLayout,
	Link,
	Flex,
} from "@strapi/design-system";
import { Check, Plus } from "@strapi/icons";

import type {
	AacsearchPluginConfig,
	CollectionConfig,
} from "../../server/services/aacsearch";

/**
 * Fetch plugin config from Strapi admin API.
 */
async function fetchConfig(): Promise<AacsearchPluginConfig> {
	const res = await fetch("/aacsearch/get-config");
	if (!res.ok) throw new Error("Failed to fetch config");
	return res.json() as Promise<AacsearchPluginConfig>;
}

/**
 * Save plugin config to Strapi admin API.
 */
async function saveConfig(config: AacsearchPluginConfig): Promise<void> {
	const res = await fetch("/aacsearch/update-config", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(config),
	});
	if (!res.ok) throw new Error("Failed to save config");
}

/**
 * Test the AACsearch connection.
 */
async function testConnection(): Promise<boolean> {
	try {
		const res = await fetch("/aacsearch/test-connection");
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Trigger a reindex for a content type.
 */
async function reindexContentType(uid: string): Promise<void> {
	const res = await fetch(`/aacsearch/reindex/${uid}`, {
		method: "POST",
	});
	if (!res.ok) throw new Error("Reindex failed");
}

export default function SettingsPage() {
	const [config, setConfig] = useState<AacsearchPluginConfig>({
		baseUrl: "",
		token: "",
		collections: {},
		debug: false,
	});
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"idle" | "success" | "error">("idle");
	const [saveResult, setSaveResult] = useState<"idle" | "success" | "error">("idle");

	useEffect(() => {
		fetchConfig()
			.then(setConfig)
			.catch(console.error);
	}, []);

	const contentTypeUids = Object.keys(config.collections);

	const handleSave = async () => {
		setSaving(true);
		try {
			await saveConfig(config);
			setSaveResult("success");
		} catch {
			setSaveResult("error");
		} finally {
			setSaving(false);
		}
	};

	const handleTest = async () => {
		setTesting(true);
		setTestResult("idle");
		const ok = await testConnection();
		setTestResult(ok ? "success" : "error");
		setTesting(false);
	};

	const handleAddContentType = () => {
		const uid = prompt("Enter content type UID (e.g., api::product.product):");
		if (uid && !config.collections[uid]) {
			setConfig({
				...config,
				collections: {
					...config.collections,
					[uid]: { indexSlug: uid.replace(/^.*::/, "").replace(/\./g, "-") },
				},
			});
		}
	};

	const handleRemoveContentType = (uid: string) => {
		const newCollections = { ...config.collections };
		delete newCollections[uid];
		setConfig({ ...config, collections: newCollections });
	};

	return (
		<Layout>
			<Main>
				<HeaderLayout
					title="AACsearch Sync"
					subtitle="Configure real-time content sync to AACsearch Engine"
					primaryAction={
						<Button onClick={handleSave} loading={saving} startIcon={<Check />}>
							Save
						</Button>
					}
				/>

				<ContentLayout>
					{saveResult === "success" && (
						<Box paddingBottom={4}>
							<Alert title="Saved" variant="success" onClose={() => setSaveResult("idle")}>
								Configuration saved successfully.
							</Alert>
						</Box>
					)}

					{testResult === "success" && (
						<Box paddingBottom={4}>
							<Alert title="Connected" variant="success" onClose={() => setTestResult("idle")}>
								Successfully connected to AACsearch!
							</Alert>
						</Box>
					)}

					{testResult === "error" && (
						<Box paddingBottom={4}>
							<Alert title="Connection failed" variant="danger" onClose={() => setTestResult("idle")}>
								Could not connect to AACsearch. Check your URL and token.
							</Alert>
						</Box>
					)}

					<Box
						background="neutral0"
						hasRadius
						shadow="filterShadow"
						paddingTop={6}
						paddingBottom={6}
						paddingLeft={7}
						paddingRight={7}
					>
						<Typography variant="delta" as="h2">
							Connection
						</Typography>
						<Box paddingTop={4}>
							<Grid gap={4}>
								<Grid.Item col={6}>
									<TextInput
										label="AACsearch API URL"
										name="baseUrl"
										placeholder="https://api.aacsearch.com"
										value={config.baseUrl}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setConfig({ ...config, baseUrl: e.target.value })
										}
									/>
								</Grid.Item>
								<Grid.Item col={6}>
									<TextInput
										label="Connector Token"
										name="token"
										type="password"
										placeholder="ss_connector_..."
										value={config.token}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setConfig({ ...config, token: e.target.value })
										}
									/>
								</Grid.Item>
							</Grid>
						</Box>
						<Box paddingTop={4}>
							<Button variant="tertiary" onClick={handleTest} loading={testing}>
								Test Connection
							</Button>
						</Box>
					</Box>

					<Box paddingTop={8} />

					<Box
						background="neutral0"
						hasRadius
						shadow="filterShadow"
						paddingTop={6}
						paddingBottom={6}
						paddingLeft={7}
						paddingRight={7}
					>
						<Flex justifyContent="space-between" alignItems="center">
							<Typography variant="delta" as="h2">
								Content Types
							</Typography>
							<Button variant="secondary" startIcon={<Plus />} onClick={handleAddContentType}>
								Add Content Type
							</Button>
						</Flex>

						<Box paddingTop={4}>
							{contentTypeUids.length === 0 ? (
								<EmptyStateLayout
									icon={<span>🔍</span>}
									content="No content types configured yet. Click 'Add Content Type' to start syncing."
								/>
							) : (
								<Table colCount={4}>
									<Thead>
										<Tr>
											<Th>
												<Typography variant="sigma">Content Type UID</Typography>
											</Th>
											<Th>
												<Typography variant="sigma">Index Slug</Typography>
											</Th>
											<Th>
												<Typography variant="sigma">Actions</Typography>
											</Th>
										</Tr>
									</Thead>
									<Tbody>
										{contentTypeUids.map((uid) => {
											const col = config.collections[uid]!;
											return (
												<Tr key={uid}>
													<Td>
														<Typography>{uid}</Typography>
													</Td>
													<Td>
														<TextInput
															aria-label="Index slug"
															name={`${uid}-indexSlug`}
															value={col.indexSlug}
															onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
																setConfig({
																	...config,
																	collections: {
																		...config.collections,
																		[uid]: { ...col, indexSlug: e.target.value },
																	},
																});
															}}
														/>
													</Td>
													<Td>
														<Flex gap={2}>
															<Button
																variant="tertiary"
																size="S"
																onClick={() => reindexContentType(uid)}
															>
																Reindex
															</Button>
															<Button
																variant="danger-light"
																size="S"
																onClick={() => handleRemoveContentType(uid)}
															>
																Remove
															</Button>
														</Flex>
													</Td>
												</Tr>
											);
										})}
									</Tbody>
								</Table>
							)}
						</Box>
					</Box>

					<Box paddingTop={6}>
						<ToggleCheckbox
							name="debug"
							label="Debug Mode"
							checked={config.debug ?? false}
							onChange={(e: { target: { checked: boolean } }) =>
								setConfig({ ...config, debug: e.target.checked })
							}
						/>
					</Box>
				</ContentLayout>
			</Main>
		</Layout>
	);
}
