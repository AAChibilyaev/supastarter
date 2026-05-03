import { alsoViewed } from "./procedures/also-viewed";
import { frequentlyBoughtTogether } from "./procedures/frequently-bought-together";
import { personalized } from "./procedures/personalized";
import { personalizedFromAnalytics } from "./procedures/personalized-from-analytics";
import { similar } from "./procedures/similar";
import { trending } from "./procedures/trending";

export const recommendationsRouter = {
	similar,
	personalized,
	personalizedFromAnalytics,
	trending,
	frequentlyBoughtTogether,
	alsoViewed,
};
