import type { ReactNode } from "react";

/**
 * @deprecated Use a simple div with flex and flex-col instead
 */
export const SimpleShowLayout = ({ children }: { children: ReactNode }) => (
	<div className="gap-4 flex flex-col">{children}</div>
);
