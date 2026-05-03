#!/usr/bin/env tsx

/**
 * AACsearch CLI main entry point.
 * Registers all commands and sets up the CLI program.
 */

import { createRequire } from "module";

import { program } from "commander";

import { initCommand } from "../commands/init.js";
import { keysCommand } from "../commands/keys.js";
import { loginCommand } from "../commands/login.js";
import { searchCommand } from "../commands/search.js";
import { loadConfig } from "../lib/config.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

program
	.name("aacsearch")
	.description("AACsearch CLI — manage your search indices from the terminal")
	.version(pkg.version)
	.hook("preAction", async (_thisCommand, actionCommand) => {
		// Skip auth check for login, init, and keys create (keys create needs interactive prompts)
		if (
			actionCommand.name() === "login" ||
			actionCommand.name() === "init"
		) {
			return;
		}
		const config = loadConfig();
		if (!config.apiKey) {
			console.error(
				"Error: Not authenticated. Run `aacsearch login` first or set AACSEARCH_API_KEY env var.",
			);
			process.exit(1);
		}
	});

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(searchCommand);
program.addCommand(keysCommand);

await program.parseAsync(process.argv);
