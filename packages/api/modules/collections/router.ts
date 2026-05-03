import {
	createCollection,
	deleteCollection,
	duplicateCollection,
	getCollection,
	listCollections,
	updateCollection,
} from "./procedures/collections";
import {
	createBatchDocuments,
	createDocument,
	deleteBatchDocuments,
	deleteDocument,
	getDocument,
	listDocuments,
	updateBatchDocuments,
	updateDocument,
} from "./procedures/documents";
import { exportDocuments } from "./procedures/export";

export const collectionsRouter = {
	list: listCollections,
	create: createCollection,
	get: getCollection,
	update: updateCollection,
	delete: deleteCollection,
	duplicate: duplicateCollection,
	export: exportDocuments,
	documents: {
		list: listDocuments,
		get: getDocument,
		create: createDocument,
		createBatch: createBatchDocuments,
		update: updateDocument,
		updateBatch: updateBatchDocuments,
		delete: deleteDocument,
		deleteBatch: deleteBatchDocuments,
	},
};
