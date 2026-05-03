import type { ImgHTMLAttributes } from "react";

const LandingImage = ({ ...rest }: ImgHTMLAttributes<HTMLImageElement>) => (
	// eslint-disable-next-line @next/next/no-img-element
	<img {...rest} />
);

export default LandingImage;
