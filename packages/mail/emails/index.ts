import { DripDay0 } from "./DripDay0";
import { DripDay1 } from "./DripDay1";
import { DripDay3 } from "./DripDay3";
import { DripDay7 } from "./DripDay7";
import { DripDay14 } from "./DripDay14";
import { DripDay21 } from "./DripDay21";
import { DripDay30 } from "./DripDay30";
import { EmailVerification } from "./EmailVerification";
import { ForgotPassword } from "./ForgotPassword";
import { InvoicePaid } from "./InvoicePaid";
import { MagicLink } from "./MagicLink";
import { NewUser } from "./NewUser";
import { Notification } from "./Notification";
import { OrganizationInvitation } from "./OrganizationInvitation";
import { PaymentFailed } from "./PaymentFailed";
import { QuotaHardCapWarning } from "./QuotaHardCapWarning";
import { QuotaSoftCapWarning } from "./QuotaSoftCapWarning";
import { SubscriptionCancelled } from "./SubscriptionCancelled";
import { SubscriptionUpgrade } from "./SubscriptionUpgrade";
import { TrialEndingSoon } from "./TrialEndingSoon";
import { TrialExpired } from "./TrialExpired";

export const mailTemplates = {
	magicLink: MagicLink,
	forgotPassword: ForgotPassword,
	newUser: NewUser,
	organizationInvitation: OrganizationInvitation,
	emailVerification: EmailVerification,
	notification: Notification,
	quotaSoftCap: QuotaSoftCapWarning,
	quotaHardCap: QuotaHardCapWarning,
	dripDay0: DripDay0,
	dripDay1: DripDay1,
	dripDay3: DripDay3,
	dripDay7: DripDay7,
	dripDay14: DripDay14,
	dripDay21: DripDay21,
	dripDay30: DripDay30,
	subscriptionUpgrade: SubscriptionUpgrade,
	invoicePaid: InvoicePaid,
	paymentFailed: PaymentFailed,
	subscriptionCancelled: SubscriptionCancelled,
	trialEndingSoon: TrialEndingSoon,
	trialExpired: TrialExpired,
} as const;
