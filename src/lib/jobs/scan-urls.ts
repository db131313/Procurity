export const MAX_SCAN_RESPONSE_BYTES = 4 * 1024 * 1024;

export function scanFilePath(jobId: string, scanId: string) {
  return `/api/jobs/${jobId}/scans/${scanId}/file`;
}

export function mobileScanFilePath(jobId: string, scanId: string) {
  return `/api/mobile/jobs/${jobId}/scans/${scanId}/file`;
}
