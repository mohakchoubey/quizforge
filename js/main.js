// =========================================================
// QuizForge — Site-wide behavior
// Classic script. Exposes window.QF helpers used by inline
// module scripts on login.html / signup.html as well.
// =========================================================

(function () {
  /** Toggles a form's disabled/spinner state. */
  function setLoading(form, isLoading) {
    form.classList.toggle("is-loading", isLoading);
    form.querySelectorAll("button[type='submit']").forEach((btn) => {
      btn.disabled = isLoading;
    });
  }

  /** Shows a message in a `.alert` element next to a form. */
  function showAlert(el, type, message) {
    if (!el) return;
    el.textContent = message;
    el.className = `alert is-visible alert-${type}`;
  }

  /** Hides a `.alert` element. */
  function hideAlert(el) {
    if (!el) return;
    el.className = "alert";
  }

  /** Wires a Formspree-backed <form data-formspree> for AJAX submission. */
  function bindFormspreeForm(form) {
    const alertBox = form.querySelector("[data-form-alert]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideAlert(alertBox);
      setLoading(form, true);
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (response.ok) {
          showAlert(alertBox, "success", "Sent — thanks! We'll get back to you by email.");
          form.reset();
        } else {
          const data = await response.json().catch(() => null);
          const message = data?.errors?.[0]?.message || "Something went wrong. Please try again.";
          showAlert(alertBox, "error", message);
        }
      } catch (err) {
        showAlert(alertBox, "error", "Network error — check your connection and try again.");
      } finally {
        setLoading(form, false);
      }
    });
  }

  /** Keeps FAQ accordions tidy — one open item at a time. */
  function bindFaqAccordion() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-formspree]").forEach(bindFormspreeForm);
    bindFaqAccordion();
  });

  window.QF = { setLoading, showAlert, hideAlert };
})();
