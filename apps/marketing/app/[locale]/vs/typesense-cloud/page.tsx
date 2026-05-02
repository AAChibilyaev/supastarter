import { redirect } from "next/navigation";

export default async function VsTypesenseCloudRedirect(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	redirect(`/${locale}/compare/typesense`);
}
