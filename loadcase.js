// game/loadCase.js
export async function loadCase() {
  // IMPORTANT: fetch only works when served from a web server (http://), not file://
  const response = await fetch("./cases/casefile.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load casefile.json (${response.status})`);
  }

  const caseData = await response.json();

  // Basic sanity checks (keeps bugs obvious)
  if (!caseData.seed) throw new Error("casefile.json missing 'seed'");
  if (!caseData.victimId) throw new Error("casefile.json missing 'victimId'");
  if (!caseData.culpritId) throw new Error("casefile.json missing 'culpritId'");
  if (!Array.isArray(caseData.clues)) throw new Error("casefile.json missing 'clues' array");

  return caseData;
}