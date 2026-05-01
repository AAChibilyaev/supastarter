import { Inter } from "next/font/google";

import "./global.css";

const inter = Inter({
	subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning className={inter.className}>
			<body className="flex min-h-screen flex-col">{children}</body>
		</html>
	);
}
