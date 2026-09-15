/**
 * Runs before first paint so a stored dark choice never flashes light.
 * Inline and blocking on purpose — a stylesheet cannot read localStorage.
 */
export function ThemeScript() {
  const script = `try{var t=localStorage.getItem("lms-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed literal, no interpolation
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
