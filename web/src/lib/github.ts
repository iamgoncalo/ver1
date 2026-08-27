// This repo is real and public - github.com/iamgoncalo/ver1, branch
// design/innovation-explorer. Trace text throughout the app cites real
// source files by path; this turns those paths into real, live GitHub
// links instead of inert text.
export const GITHUB_REPO = "https://github.com/iamgoncalo/ver1";
export const GITHUB_BRANCH = "design/innovation-explorer";

export function githubFileUrl(path: string): string {
  return `${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${path}`;
}
