import { Container, Font, Head, Html, Section, Tailwind } from "@react-email/components";
import { Logo } from "@repo/ui";
import React, { type PropsWithChildren } from "react";

export default function Wrapper({ children }: PropsWithChildren) {
	return (
		<Tailwind
			config={{
				theme: {
					extend: {
						colors: {
							border: "#e7e5e4",
							input: "#e7e5e4",
							ring: "#a8a29e",
							background: "#fafaf9",
							foreground: "#0c0a09",
							primary: {
								DEFAULT: "#1c1917",
								foreground: "#ffffff",
							},
							secondary: {
								DEFAULT: "#f5f5f4",
								foreground: "#1c1917",
							},
							destructive: {
								DEFAULT: "#b91c1c",
								foreground: "#ffffff",
							},
							success: {
								DEFAULT: "#047857",
								foreground: "#ffffff",
							},
							muted: {
								DEFAULT: "#f5f5f4",
								foreground: "#78716c",
							},
							accent: {
								DEFAULT: "#f5f5f4",
								foreground: "#1c1917",
							},
							popover: {
								DEFAULT: "#ffffff",
								foreground: "#0c0a09",
							},
							card: {
								DEFAULT: "#ffffff",
								foreground: "#0c0a09",
							},
						},
						borderRadius: {
							DEFAULT: "0.75rem",
							sm: "0.45rem",
							md: "0.6rem",
							lg: "0.75rem",
							xl: "1.05rem",
							"2xl": "1.35rem",
							"3xl": "1.65rem",
							"4xl": "1.95rem",
						},
					},
				},
			}}
		>
			<Html lang="en">
				<Head>
					<Font
						fontFamily="Inter"
						fallbackFontFamily="Arial"
						fontWeight={400}
						fontStyle="normal"
					/>
				</Head>
				<Section className="p-4 bg-background">
					<Container className="p-6 rounded-lg bg-card text-card-foreground">
						<Logo />
						{children}
					</Container>
				</Section>
			</Html>
		</Tailwind>
	);
}
