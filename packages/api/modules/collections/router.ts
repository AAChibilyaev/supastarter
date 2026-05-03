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

export const collectionsRouter = {
	list: listCollections,
	create: createCollection,
	get: getCollection,
	update: updateCollection,
	delete: deleteCollection,
	duplicate: duplicateCollection,
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
