/**
 * Weighted Trie (Prefix Tree) for autocomplete and suggestion ranking.
 * Pure TypeScript — no external dependencies.
 */

export interface TrieNode {
	children: Map<string, TrieNode>;
	value: string; // Full word at this node (empty if not a word end)
	frequency: number; // How often this word has been added
	depth: number;
}

/**
 * Weighted Trie for prefix-based word completion.
 */
export class WeightedTrie {
	private root: TrieNode;

	constructor() {
		this.root = this.createNode("", 0);
	}

	private createNode(value: string, depth: number): TrieNode {
		return {
			children: new Map(),
			value,
			frequency: 0,
			depth,
		};
	}

	/**
	 * Insert a word into the trie with optional frequency weight.
	 */
	insert(word: string, frequency: number = 1): void {
		if (!word) return;

		let node = this.root;

		for (let i = 0; i < word.length; i++) {
			const char = word[i]!;
			if (!node.children.has(char)) {
				node.children.set(char, this.createNode("", i + 1));
			}
			node = node.children.get(char)!;
		}

		// Mark as word end
		node.value = word;
		node.frequency += frequency;
	}

	/**
	 * Insert multiple words at once.
	 */
	insertMany(words: Array<{ word: string; frequency?: number }>): void {
		for (const { word, frequency } of words) {
			this.insert(word, frequency);
		}
	}

	/**
	 * Find the node at the end of a prefix.
	 * Returns null if the prefix doesn't exist.
	 */
	findNode(prefix: string): TrieNode | null {
		if (!prefix) return this.root;

		let node = this.root;

		for (let i = 0; i < prefix.length; i++) {
			const char = prefix[i]!;
			if (!node.children.has(char)) return null;
			node = node.children.get(char)!;
		}

		return node;
	}

	/**
	 * Get all completions for a prefix, sorted by frequency (descending).
	 */
	completions(prefix: string, maxResults: number = 10): string[] {
		const node = this.findNode(prefix);
		if (!node) return [];

		const results: Array<{ word: string; frequency: number }> = [];

		// DFS to collect all word endings from this node
		const stack: TrieNode[] = [node];
		while (stack.length > 0) {
			const current = stack.pop()!;
			if (current.value) {
				results.push({
					word: current.value,
					frequency: current.frequency,
				});
			}
			for (const child of current.children.values()) {
				stack.push(child);
			}
		}

		// Sort by frequency descending, then alphabetically
		results.sort((a, b) => {
			if (b.frequency !== a.frequency) return b.frequency - a.frequency;
			return a.word.localeCompare(b.word);
		});

		return results.slice(0, maxResults).map((r) => r.word);
	}

	/**
	 * Check if a complete word exists in the trie.
	 */
	hasWord(word: string): boolean {
		if (!word) return false;
		const node = this.findNode(word);
		return node !== null && !!node.value;
	}

	/**
	 * Remove a word from the trie (or decrease its frequency).
	 * Returns true if the word was found.
	 */
	removeWord(word: string): boolean {
		if (!word) return false;
		const node = this.findNode(word);
		if (!node || !node.value) return false;
		node.value = "";
		node.frequency = 0;
		return true;
	}

	/**
	 * Total number of unique words in the trie.
	 */
	get size(): number {
		let count = 0;
		const stack: TrieNode[] = [this.root];
		while (stack.length > 0) {
			const node = stack.pop()!;
			if (node.value) count++;
			for (const child of node.children.values()) {
				stack.push(child);
			}
		}
		return count;
	}

	/**
	 * Clear all entries.
	 */
	clear(): void {
		this.root = this.createNode("", 0);
	}

	/**
	 * Fuzzy search within edit distance, using the trie for pruning.
	 * Returns words within the given edit distance, sorted by frequency.
	 */
	fuzzySearch(query: string, maxDistance: number = 2, maxResults: number = 10): string[] {
		if (!query) return [];
		const results: Array<{ word: string; distance: number; frequency: number }> = [];

		// DFS with edit distance pruning
		const stack: Array<{
			node: TrieNode;
			prefix: string;
			prevRow: number[];
		}> = [];

		// Initialize with root
		const initialRow: number[] = [];
		for (let i = 0; i <= query.length; i++) {
			initialRow.push(i);
		}
		stack.push({ node: this.root, prefix: "", prevRow: initialRow });

		while (stack.length > 0) {
			const { node, prefix, prevRow } = stack.pop()!;

			// Check if current node is a word and within distance
			if (node.value && prevRow[prevRow.length - 1]! <= maxDistance) {
				results.push({
					word: node.value,
					distance: prevRow[prevRow.length - 1]!,
					frequency: node.frequency,
				});
			}

			// Prune: if all values in prevRow > maxDistance, skip children
			if (Math.min(...prevRow) > maxDistance) continue;

			for (const [char, child] of node.children.entries()) {
				// Compute new row using Levenshtein distance
				const newRow: number[] = [prevRow[0]! + 1];

				for (let i = 1; i <= query.length; i++) {
					const insertCost = newRow[i - 1]! + 1;
					const deleteCost = prevRow[i]! + 1;
					let replaceCost = prevRow[i - 1]!;
					if (query[i - 1] !== char) {
						replaceCost += 1;
					}
					newRow.push(Math.min(insertCost, deleteCost, replaceCost));
				}

				stack.push({
					node: child,
					prefix: prefix + char,
					prevRow: newRow,
				});
			}
		}

		results.sort((a, b) => {
			if (a.distance !== b.distance) return a.distance - b.distance;
			if (b.frequency !== a.frequency) return b.frequency - a.frequency;
			return a.word.localeCompare(b.word);
		});

		return results.slice(0, maxResults).map((r) => r.word);
	}

	/**
	 * Serialize the trie to a JSON-compatible object.
	 */
	toJSON(): Record<string, unknown> {
		const serialize = (node: TrieNode): Record<string, unknown> => {
			const children: Record<string, unknown> = {};
			for (const [char, child] of node.children.entries()) {
				children[char] = serialize(child);
			}
			return {
				v: node.value,
				f: node.frequency,
				c: children,
			};
		};
		return serialize(this.root);
	}

	/**
	 * Deserialize a JSON-compatible object back into a trie.
	 */
	static fromJSON(data: Record<string, unknown>): WeightedTrie {
		const trie = new WeightedTrie();

		const deserialize = (data: Record<string, unknown>, depth: number): TrieNode => {
			const node: TrieNode = {
				children: new Map(),
				value: (data.v as string) || "",
				frequency: (data.f as number) || 0,
				depth,
			};
			const children = data.c as Record<string, unknown>;
			if (children) {
				for (const [char, childData] of Object.entries(children)) {
					node.children.set(
						char,
						deserialize(childData as Record<string, unknown>, depth + 1),
					);
				}
			}
			return node;
		};

		trie.root = deserialize(data, 0);
		return trie;
	}
}
