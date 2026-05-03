import { getSession } from "@auth/lib/server";
import { MySearchDashboard } from "@my-search/components/pages/MySearchDashboard";
import { redirect } from "next/navigation";

export default async function MySearchPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	return <MySearchDashboard />;
}
