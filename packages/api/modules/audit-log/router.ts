import { exportAuditLogsProcedure } from "./procedures/export-audit-logs";
import { listAuditLogsProcedure, listAuditActionsProcedure } from "./procedures/list-audit-logs";

export const auditLogRouter = {
	listAuditLogs: listAuditLogsProcedure,
	listAuditActions: listAuditActionsProcedure,
	exportAuditLogs: exportAuditLogsProcedure,
};
