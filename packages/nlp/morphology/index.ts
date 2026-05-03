export { stem, detectStemmerLanguage, SUPPORTED_STEMMER_LANGUAGES } from "./stemmer";
export type { StemmerLanguage } from "./stemmer";
export { lemmatize, lemmatizeText } from "./lemmatizer";
export { tagWord, tagText } from "./pos-tagger";
export type { PartOfSpeech, TaggedWord } from "./pos-tagger";
export { correctGrammar, fixRussianSoftSign, fixPhoneticErrors } from "./grammar";
