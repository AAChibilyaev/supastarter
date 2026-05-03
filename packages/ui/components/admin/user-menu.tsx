import { LogOut } from "lucide-react";
import { Translate, useAuthProvider, useGetIdentity, useLogout, UserMenuContext } from "ra-core";
import { Children, useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { Button } from "../button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../dropdown-menu";

export type UserMenuProps = {
	children?: React.ReactNode;
};

/**
 * A user menu component displayed in the top right corner of the admin layout.
 *
 * Provides access to user-related actions such as profile, settings, and logout.
 * Displays the user's avatar and name from the identity provider, and includes a logout option.
 * Only displays in applications using authentication.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/usermenu UserMenu documentation}
 */
export function UserMenu({ children }: UserMenuProps) {
	const authProvider = useAuthProvider();
	const { data: identity } = useGetIdentity();
	const logout = useLogout();

	const [open, setOpen] = useState(false);

	const handleToggleOpen = useCallback(() => {
		setOpen((prevOpen) => !prevOpen);
	}, []);

	const handleClose = useCallback(() => {
		setOpen(false);
	}, []);

	if (!authProvider) return null;

	return (
		<UserMenuContext.Provider value={{ onClose: handleClose }}>
			<DropdownMenu open={open} onOpenChange={handleToggleOpen}>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 ml-2 relative rounded-full">
						<Avatar className="h-8 w-8">
							<AvatarImage src={identity?.avatar} role="presentation" />
							<AvatarFallback>{identity?.fullName?.charAt(0)}</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56" align="end" forceMount>
					<DropdownMenuLabel className="font-normal">
						<div className="space-y-1 flex flex-col">
							<p className="text-sm font-medium leading-none">{identity?.fullName}</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{children}
					{Children.count(children) > 0 && <DropdownMenuSeparator />}
					<DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
						<LogOut />
						<Translate i18nKey="ra.auth.logout">Log out</Translate>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</UserMenuContext.Provider>
	);
}
