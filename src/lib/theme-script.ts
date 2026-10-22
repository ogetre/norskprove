export const THEME_KEY = "theme";

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. The site is light
 * unless the learner has chosen dark with the toggle.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"){t="light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;
