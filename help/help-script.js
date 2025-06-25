document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".help-nav a");
  const toggles = document.querySelectorAll(".help-nav .toggle");

  // --- Active Link Highlighting ---
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      // Remove 'active' class from all links
      navLinks.forEach((l) => l.classList.remove("active"));
      // Add 'active' class to the clicked link
      this.classList.add("active");
    });
  });

  // --- Collapsible Menu Logic ---
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      // The parent <li> of the toggle span
      const parentLi = this.parentElement;
      parentLi.classList.toggle("open");
    });
  });
});
