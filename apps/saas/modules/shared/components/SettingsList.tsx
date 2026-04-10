import type { PropsWithChildren } from "react";
import { Children } from "react";

export function SettingsList({ children }: PropsWithChildren) {
	const validChildren = Children.toArray(children).filter(Boolean);

	if (validChildren.length === 0) {
		return null;
	}

	return (
		<div className="gap-3 @container flex flex-col">
			{validChildren.map((child, i) => (
				<div key={`settings-item-${i}`}>{child}</div>
			))}
		</div>
	);
}
