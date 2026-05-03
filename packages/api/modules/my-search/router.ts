import { addUrl } from "./procedures/add-url";
import { createIndex } from "./procedures/create-index";
import { crossSearch } from "./procedures/cross-search";
import { deleteFile } from "./procedures/delete-file";
import { getIndex } from "./procedures/get-index";
import { listFiles } from "./procedures/list-files";
import { listIndexes } from "./procedures/list-indexes";
import { searchIndex } from "./procedures/search-index";
import { uploadFile } from "./procedures/upload-file";

export const mySearchRouter = {
	createIndex,
	listIndexes,
	getIndex,
	uploadFile,
	addUrl,
	listFiles,
	deleteFile,
	searchIndex,
	crossSearch,
};
