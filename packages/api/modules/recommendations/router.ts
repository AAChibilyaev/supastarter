import { alsoViewed } from "./procedures/also-viewed";
import { frequentlyBoughtTogether } from "./procedures/frequently-bought-together";
import { graphrag, graphragMultiSeed } from "./procedures/graphrag";
import { personalizationOverview } from "./procedures/personalization-overview";
import { personalized } from "./procedures/personalized";
import { personalizedFromAnalytics } from "./procedures/personalized-from-analytics";
import { similar } from "./procedures/similar";
import { trending } from "./procedures/trending";

export const recommendationsRouter = {
	similar,
	personalized,
	personalizedFromAnalytics,
	personalizationOverview,
	trending,
	frequentlyBoughtTogether,
	alsoViewed,
	graphrag,
	graphragMultiSeed,
};
