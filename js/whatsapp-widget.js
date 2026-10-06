/* =========================================================
   WhatsApp chat widget
   A floating button (bottom right). Clicking it runs the
   useWhatsappChat() hook, which opens a dialog of suggested IT project
   queries. Picking one opens WhatsApp with that text pre-filled.
   Edit WHATSAPP to change the number or the queries;
   see .claude/hooks/whatsapp-widget.md.
   ========================================================= */
(function () {
  const WHATSAPP = {
    number: "6590127258",
    greeting: "Hi IT PMO team, I have a question about our IT projects.",
    queries: [
      "What is the status of our IT projects?",
      "Which tasks are overdue?",
      "Which projects are blocked, and why?",
      "Who owns the critical-priority tasks?",
      "How do I submit a new IT project request?",
      "When is the next IT Project Briefing?"
    ]
  };

  function chatUrl(text) {
    return "https://wa.me/" + WHATSAPP.number + "?text=" + encodeURIComponent(text);
  }

  function svgIcon(pathData) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    return svg;
  }

  const ICON_CHAT = "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.9 13.6c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3z";
  const ICON_CLOSE = "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z";

  // The hook: toggles the dialog open or closed and keeps ARIA state in sync.
  function useWhatsappChat(toggle, panel) {
    function isOpen() { return !panel.hidden; }

    function close(returnFocus) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open WhatsApp chat");
      document.removeEventListener("keydown", onKey);
      if (returnFocus) toggle.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close(true);
    }
    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close WhatsApp chat");
      document.addEventListener("keydown", onKey);
      const first = panel.querySelector("a");
      if (first) first.focus();
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) close(false); else open();
    });
    panel.querySelector(".wa-close").addEventListener("click", function () { close(true); });
  }

  function buildWidget() {
    const root = document.createElement("div");
    root.className = "wa-widget";

    const panel = document.createElement("section");
    panel.className = "wa-panel";
    panel.id = "wa-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "wa-title");

    const head = document.createElement("div");
    head.className = "wa-head";
    const title = document.createElement("h2");
    title.id = "wa-title";
    title.textContent = "Ask the IT PMO";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "wa-close";
    close.setAttribute("aria-label", "Close chat dialog");
    close.appendChild(svgIcon(ICON_CLOSE));
    head.append(title, close);

    const intro = document.createElement("p");
    intro.className = "wa-intro";
    intro.textContent = "Pick a question. It opens WhatsApp with the message ready to send.";

    const list = document.createElement("ul");
    list.className = "wa-queries";
    WHATSAPP.queries.forEach(function (q) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = chatUrl(q);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = q;
      li.appendChild(a);
      list.appendChild(li);
    });

    const other = document.createElement("a");
    other.className = "wa-other";
    other.href = chatUrl(WHATSAPP.greeting);
    other.target = "_blank";
    other.rel = "noopener noreferrer";
    other.textContent = "Ask something else";

    panel.append(head, intro, list, other);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "wa-toggle";
    toggle.setAttribute("aria-label", "Open WhatsApp chat");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "wa-panel");
    toggle.appendChild(svgIcon(ICON_CHAT));

    root.append(panel, toggle);
    document.body.appendChild(root);
    useWhatsappChat(toggle, panel);
  }

  buildWidget();
})();
