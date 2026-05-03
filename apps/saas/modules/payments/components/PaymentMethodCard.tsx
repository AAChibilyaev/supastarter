\"use client\";

import { Button } from \"@repo/ui/components/button\";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from \"@repo/ui/components/dialog\";
import { Skeleton } from \"@repo/ui/components/skeleton\";
import { toastError, toastSuccess } from \"@repo/ui/components/toast\";
import { orpc } from \"@shared/lib/orpc-query-utils\";
import { useMutation, useQuery, useQueryClient } from \"@tanstack/react-query\";
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	CreditCardIcon,
	PlusIcon,
	StarIcon,
	Trash2Icon,
} from \"lucide-react\";
import { useFormatter, useTranslations } from \"next-intl\";
import Script from \"next/script\";
import { useCallback, useEffect, useRef, useState } from \"react\";

// ── Brand icon ──────────────────────────────────────────────

function BrandIcon({ brand }: { brand: string | null }) {
	const lower = (brand ?? \"\").toLowerCase();

	if (lower === \"visa\") {
		return (
			<span className=\"size-8 rounded bg-blue-600 font-bold text-white flex items-center justify-center text-[10px]\">
				V
			</span>
		);
	}
	if (lower === \"mastercard\") {
		return (
			<span className=\"size-8 rounded bg-orange-500 font-bold text-white flex items-center justify-center text-[10px]\">
				MC
			</span>
		);
	}
	if (lower === \"amex\" || lower === \"american_express\") {
		return (
			<span className=\"size-8 rounded bg-sky-600 font-bold text-white flex items-center justify-center text-[10px]\">
				AE
			</span>
		);
	}
	if (lower === \"discover\") {
		return (
			<span className=\"size-8 rounded bg-orange-600 font-bold text-white flex items-center justify-center text-[10px]\">
				D
			</span>
		);
	}

	return <CreditCardIcon className=\"size-8 text-foreground/60\" />;
}

// ── Confirm Delete Dialog ───────────────────────────────────

function ConfirmDeleteDialog({
	open,
	onClose,
	onConfirm,
	brand,
	last4,
	isPending,
}: {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	brand: string | null;
	last4: string | null;
	isPending: boolean;
}) {
	const t = useTranslations();

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t(\"settings.billing.paymentMethod.deleteDialogTitle\")}</DialogTitle>
					<DialogDescription>
						{t(\"settings.billing.paymentMethod.deleteDialogDescription\", {
							card: `${brand ?? t(\"settings.billing.paymentMethod.card\")} •••• ${last4 ?? \"••••\"}`,
						})}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant=\"outline\" onClick={onClose} disabled={isPending}>
						{t("common.confirmation.cancel")}
					</Button>
					<Button variant=\"destructive\" onClick={onConfirm} loading={isPending}>
						{t(\"settings.billing.paymentMethod.deleteConfirm\")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Stripe Elements Card Form (Add Card) ────────────────────

declare global {
	interface Window {
		Stripe: unknown;
	}
}

const STRIPE_JS_URL = \"https://js.stripe.com/v3/\";

function AddCardModal({
	open,
	onClose,
	purchaseId,
}: {
	open: boolean;
	onClose: () => void;
	purchaseId: string;
}) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [stripeLoaded, setStripeLoaded] = useState(false);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const elementsRef = useRef<HTMLDivElement>(null);
	const stripeRef = useRef<unknown>(null);
	const elementsInstanceRef = useRef<unknown>(null);

	const createSetupIntent = useMutation(
		orpc.payments.createSetupIntent.mutationOptions({
			onSuccess: (data) => {
				setClientSecret(data.clientSecret);
			},
			onError: () => {
				setError(t(\"settings.billing.paymentMethod.setupError\"));
			},
		}),
	);

	// Initialize when modal opens
	useEffect(() => {
		if (!open) return;

		setError(null);
		setClientSecret(null);
		setIsProcessing(false);
		elementsInstanceRef.current = null;

		createSetupIntent.mutate({ purchaseId });
	}, [open, purchaseId]);

	// Initialize Stripe Elements when both stripe.js and clientSecret are ready
	const initElements = useCallback(() => {
		if (!stripeLoaded || !clientSecret || !elementsRef.current || elementsInstanceRef.current) return;

		const stripe = new (window as unknown as Record<string, unknown>).Stripe(
			// Stripe publishable key — loaded from env
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? \"\",
		);
		stripeRef.current = stripe;

		const elements = stripe.elements({ clientSecret });
		elementsInstanceRef.current = elements;

		const paymentElement = elements.create(\"payment\", {
			layout: { type: \"tabs\" },
		});

		paymentElement.mount(elementsRef.current);
	}, [stripeLoaded, clientSecret]);

	useEffect(() => {
		initElements();
	}, [initElements]);

	const handleConfirm = async () => {
		if (!stripeRef.current || !clientSecret) return;

		setIsProcessing(true);
		setError(null);

		try {
			const stripe = stripeRef.current as {
				confirmSetup: (opts: {
					elements: unknown;
					clientSecret: string;
					confirmParams: { return_url: string };
				}) => Promise<{ error?: { message: string } }>;
			};

			const { error: confirmError } = await stripe.confirmSetup({
				elements: elementsInstanceRef.current,
				clientSecret,
				confirmParams: {
					return_url: window.location.href,
				},
			});

			if (confirmError) {
				setError(confirmError.message);
				setIsProcessing(false);
			} else {
				// Success — invalidate and close
				queryClient.invalidateQueries({
					queryKey: orpc.payments.listPaymentMethods.queryKey({ input: { purchaseId } }),
				});
				toastSuccess(t(\"settings.billing.paymentMethod.cardAdded\"));
				onClose();
			}
		} catch {
			setError(t(\"settings.billing.paymentMethod.setupError\"));
			setIsProcessing(false);
		}
	};

	return (
		<>
			<Script src={STRIPE_JS_URL} onLoad={() => setStripeLoaded(true)} strategy=\"afterInteractive\" />

			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t(\"settings.billing.paymentMethod.addCardTitle\")}</DialogTitle>
						<DialogDescription>
							{t(\"settings.billing.paymentMethod.addCardDescription\")}
						</DialogDescription>
					</DialogHeader>

					<div className=\"space-y-4\">
						{!clientSecret && !error && (
							<div className=\"flex items-center gap-2 text-sm text-muted-foreground\">
								<AlertCircleIcon className=\"size-4\" />
								{t(\"settings.billing.paymentMethod.preparing\")}
							</div>
						)}

						{error && (
							<div className=\"flex items-center gap-2 text-sm text-destructive\">
								<AlertCircleIcon className=\"size-4\" />
								{error}
							</div>
						)}

						{clientSecret && (
							<div ref={elementsRef} className=\"min-h-[200px]\" />
						)}
					</div>

					<DialogFooter>
						<Button variant=\"outline\" onClick={onClose} disabled={isProcessing}>
						{t("common.confirmation.cancel")}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={!clientSecret || isProcessing}
							loading={isProcessing}
						>
							{t(\"settings.billing.paymentMethod.addCardConfirm\")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ── Payment Method Card (main component) ────────────────────

export function PaymentMethodCard({ purchaseId }: { purchaseId: string }) {
	const t = useTranslations();
	const format = useFormatter();
	const queryClient = useQueryClient();

	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		brand: string | null;
		last4: string | null;
	} | null>(null);
	const [showAddCard, setShowAddCard] = useState(false);

	const { data: methods = [], isLoading } = useQuery(
		orpc.payments.listPaymentMethods.queryOptions({
			input: { purchaseId },
		}),
	);

	const deleteMutation = useMutation(
		orpc.payments.detachPaymentMethod.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.payments.listPaymentMethods.queryKey({ input: { purchaseId } }),
				});
				toastSuccess(t(\"settings.billing.paymentMethod.deleteSuccess\"));
				setDeleteTarget(null);
			},
			onError: () => {
				toastError(t(\"settings.billing.paymentMethod.deleteError\"));
			},
		}),
	);

	const setDefaultMutation = useMutation(
		orpc.payments.setDefaultPaymentMethod.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.payments.listPaymentMethods.queryKey({ input: { purchaseId } }),
				});
				toastSuccess(t(\"settings.billing.paymentMethod.defaultSuccess\"));
			},
			onError: () => {
				toastError(t(\"settings.billing.paymentMethod.defaultError\"));
			},
		}),
	);

	if (isLoading) {
		return (
			<div className=\"space-y-2\">
				<Skeleton className=\"h-16 w-full\" />
			</div>
		);
	}

	const defaultMethod = methods.find((m) => m.isDefault);
	const otherMethods = methods.filter((m) => !m.isDefault);

	return (
		<>
			<div className=\"space-y-3\">
				<div className=\"flex items-center justify-between\">
					<h3 className=\"font-semibold text-sm\">{t(\"settings.billing.paymentMethod.title\")}</h3>
					<Button variant=\"outline\" size=\"sm\" onClick={() => setShowAddCard(true)}>
						<PlusIcon className=\"mr-1 size-4\" />
						{t(\"settings.billing.paymentMethod.addCard\")}
					</Button>
				</div>

				<p className=\"text-xs text-muted-foreground\">
					{t(\"settings.billing.paymentMethod.description\")}
				</p>

				{methods.length === 0 ? (
					<div className=\"p-6 text-sm rounded-lg border text-center text-muted-foreground\">
						{t(\"settings.billing.paymentMethod.emptyState\")}
					</div>
				) : (
					<div className=\"space-y-2\">
						{/* Default card */}
						{defaultMethod && (
							<PaymentMethodRow
								method={defaultMethod}
								onSetDefault={undefined}
								onDelete={() =>
									setDeleteTarget({
										id: defaultMethod.id,
										brand: defaultMethod.brand,
										last4: defaultMethod.last4,
									})
								}
								isDeleting={deleteMutation.isPending && deleteTarget?.id === defaultMethod.id}
								t={t}
								format={format}
							/>
						)}

						{/* Other cards */}
						{otherMethods.map((method) => (
							<PaymentMethodRow
								key={method.id}
								method={method}
								onSetDefault={() =>
									setDefaultMutation.mutate({ purchaseId, paymentMethodId: method.id })
								}
								onDelete={() =>
									setDeleteTarget({ id: method.id, brand: method.brand, last4: method.last4 })
								}
								isSettingDefault={
									setDefaultMutation.isPending &&
									setDefaultMutation.variables?.paymentMethodId === method.id
								}
								isDeleting={deleteMutation.isPending && deleteTarget?.id === method.id}
								t={t}
								format={format}
							/>
						))}
					</div>
				)}
			</div>

			{/* Delete confirmation dialog */}
			<ConfirmDeleteDialog
				open={deleteTarget !== null}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) {
						deleteMutation.mutate({ purchaseId, paymentMethodId: deleteTarget.id });
					}
				}}
				brand={deleteTarget?.brand ?? null}
				last4={deleteTarget?.last4 ?? null}
				isPending={deleteMutation.isPending}
			/>

			{/* Add card modal */}
			<AddCardModal
				open={showAddCard}
				onClose={() => setShowAddCard(false)}
				purchaseId={purchaseId}
			/>
		</>
	);
}

// ── Single Payment Method Row ───────────────────────────────

function PaymentMethodRow({
	method,
	onSetDefault,
	onDelete,
	isSettingDefault,
	isDeleting,
	t,
	format,
}: {
	method: {
		id: string;
		brand: string | null;
		last4: string | null;
		expMonth: number | null;
		expYear: number | null;
		isDefault: boolean;
	};
	onSetDefault: (() => void) | undefined;
	onDelete: () => void;
	isSettingDefault?: boolean;
	isDeleting?: boolean;
	t: ReturnType<typeof useTranslations>;
	format: ReturnType<typeof useFormatter>;
}) {
	return (
		<div className=\"p-3 rounded-lg border flex items-center justify-between gap-3\">
			<div className=\"flex items-center gap-3 min-w-0\">
				<BrandIcon brand={method.brand} />
				<div className=\"min-w-0\">
					<p className=\"font-medium text-sm flex items-center gap-1.5\">
						{method.brand ?? t(\"settings.billing.paymentMethod.card\")}
						{method.isDefault && (
							<span className=\"inline-flex items-center gap-0.5 text-xs text-primary\">
								<StarIcon className=\"size-3 fill-primary\" />
								{t(\"settings.billing.paymentMethod.defaultLabel\")}
							</span>
						)}
					</p>
					<p className=\"text-xs text-muted-foreground\">
						{t(\"settings.billing.paymentMethod.maskedNumber\", {
							last4: method.last4 ?? \"••••\",
						})}
						{method.expMonth && method.expYear && (
							<>
								{\" — \"}
								{t(\"settings.billing.paymentMethod.expiry\", {
									month: String(method.expMonth).padStart(2, \"0\"),
									year: String(method.expYear).slice(-2),
								})}
							</>
						)}
					</p>
				</div>
			</div>

			<div className=\"flex items-center gap-1 shrink-0\">
				{!method.isDefault && onSetDefault && (
					<Button
						variant=\"ghost\"
						size=\"sm\"
						onClick={onSetDefault}
						loading={isSettingDefault}
						title={t(\"settings.billing.paymentMethod.setDefault\")}
					>
						<CheckCircle2Icon className=\"size-4\" />
					</Button>
				)}
				<Button
					variant=\"ghost\"
					size=\"sm\"
					onClick={onDelete}
					loading={isDeleting}
				className="text-destructive hover:text-destructive"
				>
					<Trash2Icon className=\"size-4\" />
				</Button>
			</div>
		</div>
	);
}
