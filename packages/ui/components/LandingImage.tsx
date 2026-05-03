import type { ImgHTMLAttributes } from "react";

const LandingImage = ({ alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement>) => (
	// eslint-disable-next-line @next/next/no-img-element
	<img alt={alt} {...rest} />
);

export default LandingImage;
