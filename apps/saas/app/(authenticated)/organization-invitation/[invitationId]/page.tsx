import { getInvitation, getSession } from "@auth/lib/server";
import { OrganizationInvitationModal } from "@organizations/components/OrganizationInvitationModal";
import { getOrganizationById } from "@repo/database";
import { AuthWrapper } from "@shared/components/AuthWrapper";
import { redirect } from "next/navigation";
import { withQuery } from "ufo";

export default async function OrganizationInvitationPage({
	params,
}: {
	params: Promise<{ invitationId: string }>;
}) {
	const { invitationId } = await params;
	const invitation = await getInvitation(invitationId);

	if (
		!invitation ||
		invitation.status !== "pending" ||
		invitation.expiresAt.getTime() < Date.now()
	) {
		redirect("/");
	}

	const session = await getSession();

	if (!session) {
		redirect(
			withQuery("/login", {
				invitationId,
				email: invitation.email,
			}),
		);
	}

	const organization = await getOrganizationById(invitation.organizationId);

	return (
		<AuthWrapper>
			<OrganizationInvitationModal
				organizationName={invitation.organization.name}
				organizationSlug={invitation.organization.slug ?? ""}
				logoUrl={organization?.logo || undefined}
				invitationId={invitationId}
			/>
		</AuthWrapper>
	);
}
