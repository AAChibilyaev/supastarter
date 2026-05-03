#!/usr/bin/env tsx

/**
 * AACsearch CLI main entry point.
 * Registers all commands and sets up the CLI program.
 */

import { createRequire } from "module";

import { program } from "commander";

import { initCommand } from "../commands/init.js";
import { loginCommand } from "../commands/login.js";
import { loadConfig } from "../lib/config.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

program
	.name("aacsearch")
	.description("AACsearch CLI — manage your search indices from the terminal")
	.version(pkg.version)
	.hook("preAction", async (_thisCommand, actionCommand) => {
		if (actionCommand.name() === "login" || actionCommand.name() === "init") {
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

await program.parseAsync(process.argv);
