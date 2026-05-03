"use client";

import { Button } from "@repo/ui/components/button";

import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { CreditCardIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

function BrandIcon({ brand }: { brand: string | null }) {
  const lower = (brand ?? "").toLowerCase();

  // Simple brand display: just show the brand name with an icon
  if (lower === "visa") {
    return (
      <span className="flex size-8 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white">
        V
      </span>
    );
  }
  if (lower === "mastercard") {
    return (
      <span className="flex size-8 items-center justify-center rounded bg-orange-500 text-[10px] font-bold text-white">
        MC
      </span>
    );
  }
  if (lower === "amex" || lower === "american_express") {
    return (
      <span className="flex size-8 items-center justify-center rounded bg-sky-600 text-[10px] font-bold text-white">
        AE
      </span>
    );
  }
  if (lower === "discover") {
    return (
      <span className="flex size-8 items-center justify-center rounded bg-orange-600 text-[10px] font-bold text-white">
        D
      </span>
    );
  }

  // Fallback: generic card icon
  return <CreditCardIcon className="size-8 text-foreground/60" />;
}

export function PaymentMethodCard({ purchaseId }: { purchaseId: string }) {
  const t = useTranslations();

  const { data: methods = [], isLoading } = useQuery(
    orpc.payments.listPaymentMethods.queryOptions({
      input: { purchaseId },
    }),
  );

  const createCustomerPortalMutation = useMutation(
    orpc.payments.createCustomerPortalLink.mutationOptions(),
  );

  const handleManage = async () => {
    try {
      const { customerPortalLink } =
        await createCustomerPortalMutation.mutateAsync({
          purchaseId,
          redirectUrl: window.location.href,
        });
      window.location.href = customerPortalLink;
    } catch {
      toastError(
        t("settings.billing.createCustomerPortal.notifications.error.title"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-foreground/60">
        {t("settings.billing.paymentMethod.loading")}
      </div>
    );
  }

  if (methods.length === 0) {
    return null;
  }

  const method = methods[0];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandIcon brand={method.brand} />
          <div>
            <p className="font-medium text-sm">
              {method.brand ?? t("settings.billing.paymentMethod.card")}
            </p>
            <p className="text-xs text-foreground/60">
              {t("settings.billing.paymentMethod.maskedNumber", {
                last4: method.last4 ?? "••••",
              })}
              {method.expMonth && method.expYear && (
                <>
                  {" — "}
                  {t("settings.billing.paymentMethod.expiry", {
                    month: String(method.expMonth).padStart(2, "0"),
                    year: String(method.expYear).slice(-2),
                  })}
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleManage}
          loading={createCustomerPortalMutation.isPending}
        >
          <ExternalLinkIcon className="mr-2 size-4" />
          {t("settings.billing.paymentMethod.manage")}
        </Button>
      </div>
    </div>
  );
}
