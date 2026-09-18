// The single source of the GitHub Pages base path, shared by the build, the
// preview server, and the production spec (decision 0017). A project site is
// served from /<repository>/, so all three have to agree on the prefix. They
// drifted apart when the repository was renamed: the published page kept the
// old prefix in its asset URLs and rendered blank, and a rebuild would have
// served the bundle under one prefix while the spec asked for another.
//
// EAUI_BASE_PATH overrides the default for a user page, a custom domain, or a
// renamed repository; the Pages workflow sets it from the repository name for
// the whole job. On Windows, do not set it from Git Bash without
// MSYS_NO_PATHCONV=1, because MSYS path conversion rewrites a value like
// /energyatlas-ui/ into C:/Program Files/Git/energyatlas-ui/.

// Matches the repository name, so a local build needs no override.
const DEFAULT_BASE_PATH = '/energyatlas-ui/'

// Starts and ends with a slash, so `${BASE_PATH}assets/x` is a usable URL.
export const BASE_PATH = process.env.EAUI_BASE_PATH ?? DEFAULT_BASE_PATH
