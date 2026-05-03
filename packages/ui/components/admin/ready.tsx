import { ScanFace, BookOpenText, ChevronsLeftRight, GitFork } from "lucide-react";

/**
 * Splash screen displayed when no resources are configured yet.
 *
 * Provides helpful links to documentation, demo, and GitHub repository.
 * Automatically shown when the admin app has no Resource children defined.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/ready/ Ready documentation}
 */
export const Ready = () => (
	<div className="flex h-screen flex-col">
		<div
			className="text-white flex flex-1 flex-col items-center justify-center text-center"
			style={{
				background: "linear-gradient(135deg, #00023b 0%, #00023b 50%, #313264 100%)",
			}}
		>
			<ScanFace className="w-32 h-32 mb-4" />
			<h1 className="text-3xl mb-4">Welcome to shadcn-admin-kit</h1>
			<div className="text-lg opacity-75">
				Your application is properly configured.
				<br />
				Now you can add a &lt;Resource&gt; as child of &lt;Admin&gt;&lt;/Admin&gt;
			</div>
		</div>
		<div className="bg-zinc-100 text-black flex h-[20vh] items-center justify-evenly">
			<div className="text-xl">
				<a href="https://marmelab.com/shadcn-admin-kit/docs">
					<BookOpenText className="mr-4 w-10 h-10 inline" />
					Documentation
				</a>
			</div>
			<div className="text-xl">
				<a href="http://marmelab.com/shadcn-admin-kit/demo">
					<ChevronsLeftRight className="mr-4 w-10 h-10 inline" />
					Demo
				</a>
			</div>
			<div className="text-xl">
				<a href="https://github.com/marmelab/shadcn-admin-kit">
					<GitFork className="mr-4 w-10 h-10 inline" />
					GitHub
				</a>
			</div>
		</div>
	</div>
);
