import { alsoViewed } from "./procedures/also-viewed";
import { frequentlyBoughtTogether } from "./procedures/frequently-bought-together";
import { graphrag, graphragMultiSeed } from "./procedures/graphrag";
import {
	getPersonalizationConfig,
	updatePersonalizationConfig,
} from "./procedures/personalization-config";
import { personalizationOverview } from "./procedures/personalization-overview";
import { personalized } from "./procedures/personalized";
import { personalizedFromAnalytics } from "./procedures/personalized-from-analytics";
import { similar } from "./procedures/similar";
import { testPersonalization } from "./procedures/test-personalization";
import { trending } from "./procedures/trending";

export const recommendationsRouter = {
	similar,
	personalized,
	personalizedFromAnalytics,
	personalizationOverview,
	getPersonalizationConfig,
	updatePersonalizationConfig,
	testPersonalization,
	trending,
	frequentlyBoughtTogether,
	alsoViewed,
	graphrag,
	graphragMultiSeed,
};
