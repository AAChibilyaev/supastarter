import { Translate } from "ra-core";
import * as React from "react";
import { createPortal } from "react-dom";

import {
	Breadcrumb as BaseBreadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbPage,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "../breadcrumb";
import { Button } from "../button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "../drawer";
import { Separator } from "../separator";
import { useIsMobile } from "../../hooks/use-mobile";

/**
 * A breadcrumb navigation component with mobile drawer support.
 *
 * Renders breadcrumb navigation in the app header via portal. On mobile, shows a drawer with
 * ellipsis for long breadcrumb trails. Use Breadcrumb.Item and Breadcrumb.PageItem as children.
 *
 * CRUD pages already include a Breadcrumb by default; set `disableBreadcrumb` to hide the
 * breadcrumb and/or provide your own.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/breadcrumb/ Breadcrumb documentation}
 * @see {@link https://ui.shadcn.com/docs/components/breadcrumb Breadcrumb UI documentation}
 *
 * @example
 * import { Edit, Breadcrumb, SimpleForm } from "@/components/admin";
 * import { RecordRepresentation } from 'ra-core';
 * import { Link } from "react-router";
 *
 * const PostEdit = () => (
 *   <Edit disableBreadcrumb>
 *     <Breadcrumb>
 *       <Breadcrumb.Item><Link to="/">Home</Link></Breadcrumb.Item>
 *       <Breadcrumb.Item><Link to="/posts">Articles</Link></Breadcrumb.Item>
 *       <Breadcrumb.PageItem>
 *         Edit Article "<RecordRepresentation />"
 *       </Breadcrumb.Item>
 *     </Breadcrumb>
 *     <SimpleForm>
 *       ...
 *     </SimpleForm>
 *   </Edit>
 * );
 */
export const Breadcrumb = ({ children, ref }: BreadcrumbProps) => {
	const breadcrumbPortal = document.getElementById("breadcrumb");
	const isMobile = useIsMobile();
	const [open, setOpen] = React.useState(false);
	if (!breadcrumbPortal) return null;
	return createPortal(
		<>
			<Separator
				decorative
				orientation="vertical"
				className="data-[orientation=vertical]:h-4 mr-4"
			/>
			<BaseBreadcrumb ref={ref}>
				<BreadcrumbList>
					{isMobile && React.Children.count(children) > 2 ? (
						<React.Fragment>
							<BreadcrumbItem>
								<Drawer open={open} onOpenChange={setOpen}>
									<DrawerTrigger aria-label="Toggle Menu">
										<BreadcrumbEllipsis className="h-4 w-4" />
									</DrawerTrigger>
									<DrawerContent>
										<DrawerHeader className="text-left">
											<DrawerTitle>
												<Translate i18nKey="ra.navigation.breadcrumb_drawer_title">
													Navigate to
												</Translate>
											</DrawerTitle>
											<DrawerDescription>
												<Translate i18nKey="ra.navigation.breadcrumb_drawer_instructions">
													Select a page to navigate to.
												</Translate>
											</DrawerDescription>
										</DrawerHeader>
										<ol className="gap-1 px-4 grid">
											{React.Children.toArray(children)
												.slice(0, -1)
												.map((item) => item)}
										</ol>
										<DrawerFooter className="pt-4">
											<DrawerClose asChild>
												<Button variant="outline">
													<Translate i18nKey="ra.action.close">
														Close
													</Translate>
												</Button>
											</DrawerClose>
										</DrawerFooter>
									</DrawerContent>
								</Drawer>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							{React.Children.toArray(children).slice(-1)}
						</React.Fragment>
					) : (
						React.Children.map(
							children,
							(child, index) =>
								child && (
									<React.Fragment key={index}>
										{child}
										{index < React.Children.count(children) - 1 ? (
											<BreadcrumbSeparator />
										) : null}
									</React.Fragment>
								),
						)
					)}
				</BreadcrumbList>
			</BaseBreadcrumb>
		</>,
		breadcrumbPortal,
	);
};
Breadcrumb.Item = BreadcrumbItem;
Breadcrumb.PageItem = BreadcrumbPage;

export { BreadcrumbItem, BreadcrumbPage };

export type BreadcrumbProps = React.ComponentProps<"nav">;
