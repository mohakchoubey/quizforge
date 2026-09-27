// =========================================================
// QuizForge — Shared chrome loader
// Classic (non-module) script: runs immediately, before the
// deferred auth.js module, so window.updateAuthNavigation
// exists by the time Firebase reports a session.
// =========================================================

(function () {
  let cachedAuthUser = undefined; // undefined = not reported yet, null = signed out

  async function loadPartial(path, mountSelector) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return;
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path} responded ${res.status}`);
      mount.innerHTML = await res.text();
    } catch (err) {
      console.error("QuizForge: failed to load", path, err);
    }
  }

  async function loadHeader() {
    await loadPartial("header.html", "#site-header");
  }

  async function loadNavbar() {
    await loadPartial("navbar.html", "#navbar-mount");
    setActivePage();
    bindNavToggle();
    if (cachedAuthUser !== undefined) updateAuthNavigation(cachedAuthUser);
  }

  async function loadFooter() {
    await loadPartial("footer.html", "#site-footer");
    const yearEl = document.querySelector("#footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /** Highlights the nav link matching <body data-page="..."> */
  function setActivePage() {
    const current = document.body.dataset.page;
    if (!current) return;
    document.querySelectorAll(".nav-links a[data-page]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.page === current);
    });
  }

  function bindNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav-menu a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        document.querySelectorAll(".nav-dropdown[open]").forEach((d) => d.removeAttribute("open"));
      });
    });

    // Close the "Tools" dropdown on outside click (details stays open otherwise).
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".nav-dropdown[open]").forEach((dropdown) => {
        if (!dropdown.contains(e.target)) dropdown.removeAttribute("open");
      });
    });
  }

  /** Called by auth.js whenever Firebase reports a session change. */
  function updateAuthNavigation(user) {
    cachedAuthUser = user;
    const authWrap = document.querySelector(".nav-auth");
    if (!authWrap) return; // navbar not mounted yet — cached above for later
    authWrap.dataset.authed = user ? "true" : "false";
    const emailEl = authWrap.querySelector(".nav-user-chip-email");
    if (emailEl) emailEl.textContent = user ? user.email || "Account" : "";
    const logoutBtn = authWrap.querySelector("[data-action='logout']");
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = "true";
      logoutBtn.addEventListener("click", async () => {
        if (window.QFAuth) {
          await window.QFAuth.logoutUser();
          window.location.href = "index.html";
        }
      });
    }
  }

  window.loadNavbar = loadNavbar;
  window.loadHeader = loadHeader;
  window.setActivePage = setActivePage;
  window.updateAuthNavigation = updateAuthNavigation;
  window.loadFooter = loadFooter;

  document.addEventListener("DOMContentLoaded", async () => {
    // header.html renders the <header> shell that contains #navbar-mount,
    // so it must resolve before loadNavbar() looks for that mount point.
    await loadHeader();
    await loadNavbar();
    loadFooter();
  });
})();
