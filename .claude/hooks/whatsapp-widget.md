# WhatsApp chat widget

A floating button at the bottom right of the site. Code: `js/whatsapp-widget.js` (it lives in `js/` because the Pages deploy only copies `index.html`, `css`, `js` and `assets`).

- Clicking the icon runs the `useWhatsappChat()` hook, which opens a dialog of suggested IT project queries. Click the icon again, the close button or press Esc to close it.
- Picking a query opens `https://wa.me/6590127258?text=<query>` in a new tab, so WhatsApp starts with the message ready to send. "Ask something else" opens a generic greeting.
- It is a plain link: nothing is sent from the page and nothing is stored.
- To change the number or the suggested queries, edit the `WHATSAPP` object at the top of `js/whatsapp-widget.js`.
- Styles: `.wa-*` in `css/styles.css`. The toast region sits above the button so they don't overlap.
