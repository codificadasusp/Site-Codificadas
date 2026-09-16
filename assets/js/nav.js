(function () {
  // a cápsula do cabeçalho se firma assim que a página sai do topo
  var header = document.querySelector(".site-header");
  if (header) {
    var aoRolar = function () {
      header.classList.toggle("rolou", window.scrollY > 12);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
  }

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  var parents = document.querySelectorAll(".nav-item-has-children");
  parents.forEach(function (item) {
    var caretBtn = item.querySelector(".nav-caret-btn");
    if (!caretBtn) return;

    caretBtn.addEventListener("click", function (event) {
      event.preventDefault();
      var isOpen = item.classList.toggle("is-open");
      caretBtn.setAttribute("aria-expanded", String(isOpen));
    });
  });

  document.addEventListener("click", function (event) {
    parents.forEach(function (item) {
      if (!item.contains(event.target)) {
        item.classList.remove("is-open");
        var btn = item.querySelector(".nav-caret-btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  });
})();
