import { apiClient } from "./client";

export interface MyResearchConsent {
  /** false when the study isn't configured on the server. */
  available: boolean;
  consented: boolean;
  consentedAt: string | null;
  consentVersion: string;
}

export interface ResearchStatus {
  configured: boolean;
  participants: number;
  consentVersion: string;
}

export async function getMyConsent(): Promise<MyResearchConsent> {
  return (await apiClient.get<MyResearchConsent>("/research/consent")).data;
}

export async function giveConsent(): Promise<MyResearchConsent> {
  return (await apiClient.post<MyResearchConsent>("/research/consent")).data;
}

export async function withdrawConsent(): Promise<MyResearchConsent> {
  return (await apiClient.delete<MyResearchConsent>("/research/consent")).data;
}

export async function getResearchStatus(): Promise<ResearchStatus> {
  return (await apiClient.get<ResearchStatus>("/research/status")).data;
}

export type ResearchDataset = "participants" | "aggregates";

/** Downloads one export as a Blob, with the file name the server chose. */
export async function downloadResearchExport(dataset: ResearchDataset): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiClient.get(`/research/export/${dataset}`, { responseType: "blob" });
  const disposition = String(res.headers["content-disposition"] ?? "");
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${dataset}.csv`;
  return { blob: res.data as Blob, fileName };
}
