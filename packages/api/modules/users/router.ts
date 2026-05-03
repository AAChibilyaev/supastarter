import { createAvatarUploadUrl } from "./procedures/create-avatar-upload-url";
import { exportMyData } from "./procedures/export-user-data";
import { requestDeletion } from "./procedures/request-deletion";
import { cancelDeletion } from "./procedures/cancel-deletion";

export const usersRouter = {
	avatarUploadUrl: createAvatarUploadUrl,
	exportMyData,
	requestDeletion,
	cancelDeletion,
};
