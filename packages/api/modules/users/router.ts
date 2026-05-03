import { createAvatarUploadUrl } from "./procedures/create-avatar-upload-url";
import { exportMyData } from "./procedures/export-user-data";

export const usersRouter = {
	avatarUploadUrl: createAvatarUploadUrl,
	exportMyData,
};
