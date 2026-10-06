# IT Project Briefing popup

A website popup, not a Claude Code hook: Claude Code hooks can't see how long a visitor stays on the page.
The code is `js/briefing-popup.js` (it must live there because the Pages deploy only copies `index.html`, `css`, `js` and `assets`).

- Shows once, 10 seconds after the page loads (or when the tab becomes visible, if it was hidden). A refresh shows it again; nothing is stored.
- Event: IT Project Briefing, Wednesday 14 October 2026, 2:00 pm, Town Hall Meeting Room.
- Dismiss with "Got it" or Esc.
- To change the event or the delay, edit the `BRIEFING` object at the top of `js/briefing-popup.js`.
- Styles: `.briefing` in `css/styles.css`.
