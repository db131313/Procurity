/**
 * Jobs data access — Prisma when DATABASE_URL is set, else file store.
 */
import { isDatabaseConfigured } from "@/lib/db/prisma";
import * as fileStore from "./file-store";

async function backend() {
  if (isDatabaseConfigured()) {
    return import("./prisma-store");
  }
  return fileStore;
}

export async function listJobsForOwner(ownerId: string) {
  return (await backend()).listJobsForOwner(ownerId);
}

export async function getJobBundle(jobId: string, ownerId?: string) {
  return (await backend()).getJobBundle(jobId, ownerId);
}

export async function getJobByQuoteToken(token: string) {
  return (await backend()).getJobByQuoteToken(token);
}

export async function createJob(
  input: Parameters<(typeof fileStore)["createJob"]>[0],
) {
  return (await backend()).createJob(input);
}

export async function updateJob(
  ...args: Parameters<(typeof fileStore)["updateJob"]>
) {
  return (await backend()).updateJob(...args);
}

export async function addScan(
  ...args: Parameters<(typeof fileStore)["addScan"]>
) {
  return (await backend()).addScan(...args);
}

export async function addMeasurement(
  ...args: Parameters<(typeof fileStore)["addMeasurement"]>
) {
  return (await backend()).addMeasurement(...args);
}

export async function deleteMeasurement(
  ...args: Parameters<(typeof fileStore)["deleteMeasurement"]>
) {
  return (await backend()).deleteMeasurement(...args);
}

export async function upsertDesignSpec(
  ...args: Parameters<(typeof fileStore)["upsertDesignSpec"]>
) {
  return (await backend()).upsertDesignSpec(...args);
}

export async function replaceLineItems(
  ...args: Parameters<(typeof fileStore)["replaceLineItems"]>
) {
  return (await backend()).replaceLineItems(...args);
}

export async function createQuoteDraft(
  ...args: Parameters<(typeof fileStore)["createQuoteDraft"]>
) {
  return (await backend()).createQuoteDraft(...args);
}

export async function updateQuote(
  ...args: Parameters<(typeof fileStore)["updateQuote"]>
) {
  return (await backend()).updateQuote(...args);
}

export async function acceptQuoteByToken(token: string) {
  return (await backend()).acceptQuoteByToken(token);
}

export async function createInvoicesForJob(
  ...args: Parameters<(typeof fileStore)["createInvoicesForJob"]>
) {
  return (await backend()).createInvoicesForJob(...args);
}

export async function setInvoiceCheckout(
  ...args: Parameters<(typeof fileStore)["setInvoiceCheckout"]>
) {
  return (await backend()).setInvoiceCheckout(...args);
}

export async function markInvoicePaidBySession(
  ...args: Parameters<(typeof fileStore)["markInvoicePaidBySession"]>
) {
  return (await backend()).markInvoicePaidBySession(...args);
}

export async function advanceJobStatus(
  ...args: Parameters<(typeof fileStore)["advanceJobStatus"]>
) {
  return (await backend()).advanceJobStatus(...args);
}
