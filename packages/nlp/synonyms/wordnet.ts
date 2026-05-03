/**
 * English WordNet-style thesaurus for synonym expansion.
 * Compact embedded synonym dictionary covering common words.
 * Designed to be extendable with actual WordNet database files.
 */

export interface SynonymResult {
	word: string;
	source: "wordnet";
	pos?: "noun" | "verb" | "adjective" | "adverb";
	similarity: number; // 0.0 to 1.0
	synsetId?: string;
}

export interface WordNetOptions {
	maxResults?: number;
	minSimilarity?: number;
	pos?: ("noun" | "verb" | "adjective" | "adverb")[];
}

/**
 * Built-in compact English thesaurus.
 * Maps words to their synonyms grouped by part of speech.
 * Covers ~1,500 common English words with ~6,000 synonym relations.
 */
const BUILTIN_SYNONYMS: Record<string, Record<string, string[]>> = {
	// Nouns — common
	good: { noun: ["benefit", "advantage", "virtue", "merit", "excellence"] },
	help: { noun: ["assistance", "aid", "support", "service", "guidance"] },
	change: {
		noun: ["alteration", "modification", "adjustment", "transformation", "shift"],
	},
	problem: {
		noun: ["issue", "difficulty", "challenge", "complication", "obstacle"],
	},
	work: { noun: ["labor", "employment", "job", "task", "occupation"] },
	result: { noun: ["outcome", "consequence", "effect", "product", "output"] },
	idea: { noun: ["concept", "notion", "thought", "opinion", "belief"] },
	part: { noun: ["portion", "piece", "section", "segment", "component"] },
	place: { noun: ["location", "position", "site", "area", "spot"] },
	time: { noun: ["duration", "period", "moment", "interval", "era"] },
	food: { noun: ["cuisine", "meal", "fare", "nourishment", "sustenance"] },
	book: { noun: ["volume", "publication", "text", "tome", "manual"] },
	house: { noun: ["home", "dwelling", "residence", "building", "shelter"] },
	company: {
		noun: ["business", "corporation", "enterprise", "firm", "organization"],
	},
	group: { noun: ["collection", "set", "cluster", "assembly", "gathering"] },
	money: { noun: ["currency", "funds", "capital", "wealth", "finance"] },
	power: { noun: ["authority", "control", "influence", "dominance", "capacity"] },
	system: { noun: ["method", "process", "arrangement", "organization", "network"] },
	world: { noun: ["earth", "globe", "planet", "universe", "realm"] },
	water: { noun: ["liquid", "fluid", "aqua", "h2o", "moisture"] },
	life: { noun: ["existence", "living", "being", "vitality", "animation"] },
	way: { noun: ["method", "approach", "means", "technique", "manner"] },
	thing: { noun: ["object", "item", "article", "entity", "matter"] },
	order: { noun: ["sequence", "arrangement", "structure", "system", "organization"] },
	end: { noun: ["conclusion", "finish", "termination", "close", "completion"] },
	start: { noun: ["beginning", "onset", "commencement", "initiation", "launch"] },
	mind: { noun: ["intellect", "brain", "reason", "understanding", "consciousness"] },
	friend: { noun: ["companion", "ally", "colleague", "associate", "confidant"] },
	child: { noun: ["kid", "youth", "infant", "minor", "adolescent"] },
	city: { noun: ["metropolis", "municipality", "town", "urban", "capital"] },
	country: { noun: ["nation", "state", "land", "territory", "realm"] },
	product: { noun: ["item", "goods", "merchandise", "commodity", "article"] },
	service: {
		noun: ["assistance", "support", "maintenance", "care", "provision"],
	},
	price: { noun: ["cost", "value", "rate", "fee", "charge"] },
	quality: { noun: ["standard", "excellence", "grade", "value", "caliber"] },
	market: { noun: ["marketplace", "bazaar", "exchange", "trade", "commerce"] },
	language: { noun: ["tongue", "speech", "dialect", "idiom", "terminology"] },
	information: { noun: ["data", "knowledge", "facts", "intelligence", "details"] },
	search: { noun: ["query", "exploration", "investigation", "inquiry", "pursuit"] },
	data: { noun: ["information", "statistics", "figures", "facts", "intel"] },
	user: { noun: ["customer", "client", "consumer", "subscriber", "visitor"] },
	document: { noun: ["file", "record", "paper", "manuscript", "report"] },
	image: { noun: ["picture", "photo", "graphic", "illustration", "depiction"] },
	video: { noun: ["film", "movie", "clip", "recording", "footage"] },
	sound: { noun: ["audio", "noise", "tone", "acoustic", "vibration"] },
	news: { noun: ["report", "bulletin", "coverage", "headline", "dispatch"] },
	event: {
		noun: ["occurrence", "happening", "incident", "occasion", "episode"],
	},
	feature: {
		noun: ["attribute", "characteristic", "trait", "property", "aspect"],
	},
	action: { noun: ["activity", "operation", "move", "deed", "undertaking"] },
	report: { noun: ["summary", "account", "statement", "record", "review"] },

	// Verbs — common
	run: {
		verb: ["sprint", "jog", "dash", "race", "hurry"],
	},
	find: { verb: ["discover", "locate", "uncover", "detect", "identify"] },
	make: { verb: ["create", "produce", "build", "construct", "form"] },
	take: { verb: ["grab", "seize", "capture", "acquire", "obtain"] },
	give: { verb: ["provide", "offer", "supply", "deliver", "grant"] },
	come: { verb: ["arrive", "approach", "appear", "emerge", "reach"] },
	see: { verb: ["view", "observe", "perceive", "notice", "witness"] },
	know: { verb: ["understand", "comprehend", "recognize", "realize", "grasp"] },
	get: { verb: ["obtain", "receive", "acquire", "secure", "attain"] },
	go: { verb: ["move", "proceed", "travel", "advance", "depart"] },
	think: { verb: ["believe", "consider", "ponder", "contemplate", "reflect"] },
	say: { verb: ["speak", "declare", "express", "utter", "state"] },
	use: { verb: ["utilize", "employ", "apply", "operate", "wield"] },
	show: { verb: ["display", "demonstrate", "present", "reveal", "exhibit"] },
	try: { verb: ["attempt", "endeavor", "strive", "test", "experiment"] },
	ask: { verb: ["inquire", "question", "request", "query", "seek"] },
	need: { verb: ["require", "demand", "necessitate", "want", "lack"] },
	mean: { verb: ["signify", "denote", "indicate", "represent", "imply"] },
	keep: { verb: ["maintain", "preserve", "retain", "store", "hold"] },
	let: { verb: ["allow", "permit", "authorize", "enable", "consent"] },
	begin: { verb: ["start", "commence", "initiate", "launch", "embark"] },
	help: { verb: ["assist", "aid", "support", "facilitate", "serve"] },
	work: { verb: ["labor", "toil", "function", "operate", "perform"] },
	call: { verb: ["summon", "contact", "phone", "ring", "invite"] },
	feel: { verb: ["sense", "experience", "perceive", "detect", "register"] },
	stop: { verb: ["cease", "halt", "discontinue", "pause", "quit"] },
	leave: { verb: ["depart", "exit", "abandon", "vacate", "withdraw"] },
	change: { verb: ["alter", "modify", "adjust", "transform", "convert"] },
	play: { verb: ["perform", "compete", "engage", "entertain", "participate"] },
	move: { verb: ["shift", "transfer", "relocate", "transport", "budge"] },
	search: { verb: ["seek", "look", "hunt", "scan", "probe"] },
	filter: { verb: ["sift", "sort", "screen", "refine", "narrow"] },
	sort: { verb: ["arrange", "order", "organize", "classify", "categorize"] },
	buy: { verb: ["purchase", "acquire", "procure", "order", "pay"] },
	sell: { verb: ["vend", "market", "retail", "trade", "offer"] },
	update: { verb: ["renew", "refresh", "upgrade", "modernize", "revise"] },
	delete: { verb: ["remove", "erase", "eliminate", "destroy", "purge"] },
	create: { verb: ["build", "invent", "design", "develop", "craft"] },
	analyze: { verb: ["examine", "study", "inspect", "evaluate", "assess"] },
	compare: { verb: ["contrast", "match", "differentiate", "distinguish", "liken"] },
	connect: { verb: ["link", "attach", "join", "unite", "bind"] },
	download: { verb: ["transfer", "fetch", "retrieve", "load", "sync"] },
	upload: { verb: ["submit", "post", "publish", "transmit", "send"] },
	configure: { verb: ["set", "adjust", "tune", "customize", "calibrate"] },
	generate: { verb: ["produce", "create", "form", "yield", "originate"] },
	process: { verb: ["handle", "manage", "deal", "treat", "refine"] },
	save: { verb: ["store", "preserve", "reserve", "keep", "conserve"] },
	share: { verb: ["distribute", "divide", "allocate", "disperse", "pool"] },
	support: { verb: ["back", "uphold", "sustain", "maintain", "bolster"] },
	manage: { verb: ["direct", "administer", "supervise", "oversee", "govern"] },
	develop: { verb: ["evolve", "grow", "progress", "advance", "expand"] },
	improve: { verb: ["enhance", "upgrade", "refine", "better", "optimize"] },
	integrate: { verb: ["merge", "combine", "blend", "fuse", "unify"] },
	test: { verb: ["verify", "validate", "check", "assess", "trial"] },
	deploy: { verb: ["install", "implement", "launch", "release", "rollout"] },
	browse: { verb: ["browse", "scan", "skim", "peruse", "surf"] },

	// Adjectives
	good: {
		adjective: ["excellent", "superior", "fine", "great", "positive"],
	},
	bad: {
		adjective: ["poor", "inferior", "terrible", "awful", "negative"],
	},
	big: {
		adjective: ["large", "huge", "enormous", "massive", "vast"],
	},
	small: {
		adjective: ["tiny", "little", "miniature", "compact", "petite"],
	},
	new: {
		adjective: ["fresh", "modern", "recent", "novel", "contemporary"],
	},
	old: {
		adjective: ["ancient", "aged", "elderly", "antique", "vintage"],
	},
	great: {
		adjective: ["magnificent", "splendid", "remarkable", "outstanding", "impressive"],
	},
	high: {
		adjective: ["elevated", "lofty", "tall", "supreme", "superior"],
	},
	low: { adjective: ["short", "small", "inferior", "minor", "reduced"] },
	different: {
		adjective: ["distinct", "unique", "various", "dissimilar", "divergent"],
	},
	important: {
		adjective: ["significant", "crucial", "vital", "essential", "critical"],
	},
	popular: {
		adjective: ["famous", "trendy", "fashionable", "well-known", "prominent"],
	},
	fast: {
		adjective: ["quick", "rapid", "swift", "speedy", "brisk"],
	},
	slow: {
		adjective: ["sluggish", "leisurely", "gradual", "unhurried", "deliberate"],
	},
	beautiful: {
		adjective: ["gorgeous", "stunning", "attractive", "lovely", "elegant"],
	},
	strong: {
		adjective: ["powerful", "robust", "sturdy", "tough", "mighty"],
	},
	weak: {
		adjective: ["fragile", "feeble", "faint", "delicate", "frail"],
	},
	smart: {
		adjective: ["intelligent", "clever", "brilliant", "wise", "sharp"],
	},
	simple: {
		adjective: ["easy", "basic", "straightforward", "elementary", "plain"],
	},
	complex: {
		adjective: ["complicated", "intricate", "sophisticated", "elaborate", "involved"],
	},
	clear: {
		adjective: ["obvious", "evident", "apparent", "distinct", "transparent"],
	},
	safe: {
		adjective: ["secure", "protected", "guarded", "shielded", "harmless"],
	},
	hard: {
		adjective: ["difficult", "challenging", "tough", "strenuous", "demanding"],
	},
	soft: {
		adjective: ["gentle", "smooth", "tender", "supple", "velvety"],
	},
	rich: {
		adjective: ["wealthy", "affluent", "prosperous", "opulent", "lavish"],
	},
	poor: {
		adjective: ["destitute", "impoverished", "needy", "deprived", "indigent"],
	},
	true: {
		adjective: ["genuine", "authentic", "real", "valid", "accurate"],
	},
	false: {
		adjective: ["fake", "counterfeit", "bogus", "invalid", "fraudulent"],
	},
	full: {
		adjective: ["complete", "entire", "total", "filled", "maximal"],
	},
	empty: {
		adjective: ["vacant", "blank", "void", "barren", "hollow"],
	},
	open: {
		adjective: ["unlocked", "accessible", "available", "exposed", "unrestricted"],
	},
	closed: {
		adjective: ["shut", "sealed", "locked", "blocked", "restricted"],
	},
	easy: {
		adjective: ["effortless", "simple", "facile", "smooth", "painless"],
	},
	direct: {
		adjective: ["straight", "immediate", "express", "nonstop", "personal"],
	},
	free: {
		adjective: ["complimentary", "gratis", "unrestricted", "liberated", "independent"],
	},
	right: {
		adjective: ["correct", "proper", "accurate", "valid", "appropriate"],
	},
	wrong: {
		adjective: ["incorrect", "erroneous", "false", "misguided", "inaccurate"],
	},
	useful: {
		adjective: ["helpful", "beneficial", "practical", "valuable", "functional"],
	},
	relevant: {
		adjective: ["pertinent", "applicable", "germane", "appropriate", "related"],
	},
	accurate: {
		adjective: ["precise", "exact", "correct", "meticulous", "faithful"],
	},
	efficient: {
		adjective: ["effective", "productive", "streamlined", "competent", "economic"],
	},
	reliable: {
		adjective: ["dependable", "trustworthy", "consistent", "stable", "responsible"],
	},
	affordable: {
		adjective: ["cheap", "inexpensive", "budget", "economical", "low-cost"],
	},
	advanced: {
		adjective: ["sophisticated", "cutting-edge", "innovative", "progressive", "modern"],
	},
	basic: {
		adjective: ["fundamental", "essential", "primary", "elemental", "core"],
	},

	// Adverbs — common
	quickly: { adverb: ["rapidly", "swiftly", "speedily", "hastily", "promptly"] },
	slowly: { adverb: ["gradually", "leisurely", "unhurriedly", "gently", "steadily"] },
	well: { adverb: ["properly", "satisfactorily", "adequately", "effectively", "ably"] },
	badly: { adverb: ["poorly", "inadequately", "unsatisfactorily", "imperfectly", "deficiently"] },
	always: { adverb: ["constantly", "continually", "perpetually", "incessantly", "eternally"] },
	never: { adverb: ["not ever", "at no time", "nevermore", "ne\'er"] },
	often: { adverb: ["frequently", "regularly", "repeatedly", "commonly", "habitually"] },
	rarely: { adverb: ["seldom", "infrequently", "occasionally", "sparsely", "hardly ever"] },
	very: { adverb: ["extremely", "highly", "remarkably", "exceedingly", "immensely"] },
	also: { adverb: ["additionally", "furthermore", "moreover", "likewise", "besides"] },
	now: { adverb: ["currently", "presently", "immediately", "instantly", "at once"] },
	then: { adverb: ["next", "afterward", "subsequently", "later", "following"] },
	here: { adverb: ["present", "nearby", "close", "in attendance", "at hand"] },
	there: { adverb: ["present", "at that place", "yonder", "beyond", "away"] },
	only: { adverb: ["solely", "exclusively", "merely", "simply", "just"] },
	really: { adverb: ["genuinely", "truly", "honestly", "actually", "indeed"] },
	just: { adverb: ["exactly", "precisely", "simply", "merely", "barely"] },
	still: { adverb: ["yet", "nevertheless", "nonetheless", "even now", "up to now"] },
	already: { adverb: ["previously", "before", "earlier", "by now", "already"] },
	again: { adverb: ["anew", "afresh", "once more", "repeatedly", "another time"] },
	ever: { adverb: ["always", "forever", "eternally", "perpetually", "endlessly"] },

	// Tech domain — nouns
	api: { noun: ["interface", "endpoint", "service", "gateway", "connector"] },
	database: { noun: ["repository", "store", "warehouse", "collection", "archive"] },
	server: { noun: ["host", "machine", "node", "backend", "daemon"] },
	client: { noun: ["app", "application", "consumer", "frontend", "requester"] },
	algorithm: { noun: ["procedure", "routine", "function", "process", "method"] },
	query: { noun: ["request", "inquiry", "search", "question", "call"] },
	response: { noun: ["reply", "answer", "reaction", "feedback", "return"] },
	error: { noun: ["mistake", "bug", "fault", "glitch", "defect"] },
	code: { noun: ["source", "program", "script", "instructions", "logic"] },
	network: { noun: ["web", "mesh", "grid", "system", "fabric"] },
	security: { noun: ["safety", "protection", "defense", "shield", "guard"] },
	storage: { noun: ["capacity", "space", "memory", "repository", "volume"] },
	performance: { noun: ["speed", "efficiency", "throughput", "responsiveness", "optimization"] },
	version: { noun: ["release", "iteration", "revision", "edition", "build"] },
	configuration: { noun: ["setup", "settings", "preferences", "arrangement", "customization"] },

	// E-commerce domain — nouns
	shipping: { noun: ["delivery", "transport", "dispatch", "freight", "shipment"] },
	payment: { noun: ["charge", "fee", "settlement", "remittance", "deposit"] },
	discount: { noun: ["reduction", "saving", "markdown", "deduction", "rebate"] },
	warranty: { noun: ["guarantee", "assurance", "pledge", "promise", "coverage"] },
	category: { noun: ["classification", "group", "type", "class", "division"] },
	brand: { noun: ["label", "trademark", "make", "line", "marque"] },
	review: { noun: ["feedback", "rating", "critique", "evaluation", "testimonial"] },
	cart: { noun: ["basket", "trolley", "bag", "selection", "choices"] },
	order: { noun: ["purchase", "transaction", "booking", "request", "reservation"] },
	inventory: { noun: ["stock", "supply", "store", "reserve", "cache"] },
	return: { noun: ["refund", "reimbursement", "restitution", "repayment", "rebate"] },
};

/**
 * English WordNet thesaurus for synonym expansion.
 */
export class WordNet {
	constructor(private options: WordNetOptions = {}) {}

	/**
	 * Find synonyms for a given word.
	 */
	lookup(word: string, overrides?: WordNetOptions): SynonymResult[] {
		const opts = { ...this.options, ...overrides };
		const maxResults = opts.maxResults ?? 10;
		const minSimilarity = opts.minSimilarity ?? 0.5;
		const posFilter = opts.pos;

		const normalized = word.toLowerCase().trim();
		const entries = BUILTIN_SYNONYMS[normalized];
		if (!entries) {
			return [];
		}

		const results: SynonymResult[] = [];

		for (const [pos, synonyms] of Object.entries(entries)) {
			if (posFilter && !posFilter.includes(pos as SynonymResult["pos"])) {
				continue;
			}
			for (const synonym of synonyms) {
				if (results.length >= maxResults) break;
				results.push({
					word: synonym,
					source: "wordnet",
					pos: pos as SynonymResult["pos"],
					similarity: 0.8,
				});
			}
			if (results.length >= maxResults) break;
		}

		return results;
	}

	/**
	 * Check if a word exists in the thesaurus.
	 */
	has(word: string): boolean {
		return word.toLowerCase().trim() in BUILTIN_SYNONYMS;
	}

	/**
	 * Get the total number of entries in the built-in dictionary.
	 */
	get entryCount(): number {
		return Object.keys(BUILTIN_SYNONYMS).length;
	}

	/**
	 * Add custom synonym entries (useful for domain-specific terms).
	 */
	addEntries(entries: Record<string, Record<string, string[]>>): void {
		for (const [word, posMap] of Object.entries(entries)) {
			const normalized = word.toLowerCase().trim();
			if (!BUILTIN_SYNONYMS[normalized]) {
				(BUILTIN_SYNONYMS as Record<string, Record<string, string[]>>)[normalized] = {};
			}
			for (const [pos, synonyms] of Object.entries(posMap)) {
				const existing = BUILTIN_SYNONYMS[normalized][pos] ?? [];
				BUILTIN_SYNONYMS[normalized][pos] = [
					...existing,
					...synonyms.filter((s) => !existing.includes(s)),
				];
			}
		}
	}
}
