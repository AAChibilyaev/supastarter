// Type declarations for shepherd.js (no @types available)
declare module "shepherd.js" {
	export interface ShepherdStepOptions {
		id?: string;
		title?: string;
		text?: string | string[];
		attachTo?: {
			element: string | HTMLElement;
			on: string;
		};
		buttons?: ShepherdButton[];
		cancelButton?: boolean;
		beforeShowPromise?: () => Promise<void>;
		scrollTo?: boolean;
		highlightClass?: string;
		when?: Record<string, () => void>;
		popperOptions?: Record<string, unknown>;
	}

	export interface ShepherdButton {
		type?: string;
		text: string;
		action?: () => void;
		classes?: string;
		secondary?: boolean;
	}

	export interface ShepherdTourOptions {
		defaultStepOptions?: ShepherdStepOptions;
		useModalOverlay?: boolean;
		exitOnEsc?: boolean;
		keyboardNavigation?: boolean;
	}

	export interface ShepherdTour {
		addStep: (options: ShepherdStepOptions | string) => ShepherdStep;
		start: () => void;
		cancel: () => void;
		complete: () => void;
		steps: ShepherdStep[];
		getCurrentStep: () => ShepherdStep | null;
		on: (event: string, handler: () => void) => void;
	}

	export interface ShepherdStep {
		show: () => void;
		hide: () => void;
		cancel: () => void;
		complete: () => void;
		destroy: () => void;
		options: ShepherdStepOptions;
		isOpen: boolean;
	}

	export default class Tour implements ShepherdTour {
		constructor(options?: ShepherdTourOptions);
		addStep: (options: ShepherdStepOptions | string) => ShepherdStep;
		start: () => void;
		cancel: () => void;
		complete: () => void;
		steps: ShepherdStep[];
		getCurrentStep: () => ShepherdStep | null;
		on: (event: string, handler: () => void) => void;
	}
}
