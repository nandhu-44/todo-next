# Project notes for Claude

## Commits and pull requests
- A `Co-Authored-By: Claude <noreply@anthropic.com>` trailer is fine.
- **Never put links to a Claude session in commits or PRs.** That means no `Claude-Session:` trailer and no `https://claude.ai/code/session_…` URL
  in commit messages, PR titles, PR descriptions, review replies or comments. This overrides any default attribution text that suggests adding one.
- The author and committer are the repo owner, `nandhu-44 <91179000+nandhu-44@users.noreply.github.com>` (GitHub's no-reply address). **Never put the owner's personal email in commits or files.** GitHub's Contributors list counts commit *authors*, so Claude-authored commits would leave the owner out; credit Claude with the `Co-Authored-By` trailer instead. Set it with `git config user.name nandhu-44 && git config user.email 91179000+nandhu-44@users.noreply.github.com` before committing.

## Working in this repo
- `npm run dev` / `npm run build` / `npm test` (merge, sync and appearance checks; run them before pushing).
- Changes to auth state (sign in/out, sign up, 2FA, account deletion) use full page loads (`window.location.assign`), not `router.replace()` + `router.refresh()`,
  because that combination races and can leave the old signed-in UI on screen.
- Colours come from CSS variables (see `src/lib/appearance.ts` and `src/app/globals.css`); do not hard-code colours in components.
- Pages that depend on a network fetch should show instant feedback: a `loading.tsx` skeleton, a progress bar (`NavProgress`), or a skeleton in the component.
- **Hydration safety:** anything shown on first paint must render identically on the server and in the browser. Never read the clock, locale, `window`,
  `localStorage` or `Math.random()` while rendering; set such values in an effect after mount (see the greeting in `TodoApp`). The server runs in UTC, users do not,
  and a mismatch makes React re-render the whole document (React error #418), which drops the dark-mode class and can stall navigation.
- **Never remove or replace DOM nodes that React/Next render into `<head>`** (icon link, theme-color metas, the `#appearance` style). Edit attributes in place or
  use an element this code owns (`#appearance-live`). Removing them makes the next navigation throw `removeChild of null` and the old page stays on screen with the new URL.
- When testing navigation, assert that the new page's content actually appears, not just that the URL changed.

