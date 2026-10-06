/* =========================================================
   IT Project Briefing popup
   Shows a dismissible notice once, BRIEFING.delayMs after the page loads.
   Nothing is stored, so a refresh shows it again.
   Edit BRIEFING to change the event; see .claude/hooks/briefing-popup.md.
   ========================================================= */
(function () {
  const BRIEFING = {
    title: "IT Project Briefing",
    when: "Wednesday 14 October 2026, 2:00 pm",
    where: "Town Hall Meeting Room",
    delayMs: 10000
  };

  function buildPopup() {
    const root = document.createElement("section");
    root.className = "briefing";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-labelledby", "briefing-title");

    const tag = document.createElement("p");
    tag.className = "briefing-tag";
    tag.textContent = "Upcoming";

    const title = document.createElement("h2");
    title.id = "briefing-title";
    title.textContent = BRIEFING.title;

    const list = document.createElement("dl");
    [["When", BRIEFING.when], ["Where", BRIEFING.where]].forEach(function (row) {
      const dt = document.createElement("dt");
      dt.textContent = row[0];
      const dd = document.createElement("dd");
      dd.textContent = row[1];
      list.append(dt, dd);
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-primary";
    close.textContent = "Got it";

    function dismiss() {
      root.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    close.addEventListener("click", dismiss);
    document.addEventListener("keydown", onKey);

    root.append(tag, title, list, close);
    document.body.appendChild(root);
    close.focus();
  }

  function show() {
    // A hidden tab isn't "staying on the site": wait until it is visible again
    if (document.hidden) {
      document.addEventListener("visibilitychange", function once() {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", once);
        buildPopup();
      });
      return;
    }
    buildPopup();
  }

  setTimeout(show, BRIEFING.delayMs);
})();
