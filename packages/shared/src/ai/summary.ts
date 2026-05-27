export type StatusToolData = {
  userStatus: string;
  missingDocs: string[];
  checklist: { label: string; status: string }[];
  recentActions: string[];
};

export function deterministicSummary(data: StatusToolData): string {
  const docsLine = data.missingDocs.length ? `Missing docs: ${data.missingDocs.join(", ")}.` : "No missing documents.";
  const checklistLine = `Checklist progress: ${data.checklist.filter((i) => i.status === "DONE").length}/${data.checklist.length} completed.`;
  const recentLine = data.recentActions.length ? `Recent actions: ${data.recentActions.join(" | ")}.` : "No recent actions yet.";
  return `${data.userStatus}. ${docsLine} ${checklistLine} ${recentLine}`;
}
