// ---------------------------------------------------------------
// Remote-control friendly spatial navigation.
// webOS maps the TV remote D-pad to standard arrow keys, OK to Enter,
// and the Back button to keyCode 461.
// ---------------------------------------------------------------
const KEY = {
  LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461
};

const Nav = (() => {
  let current = null;

  function _visible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function focusables() {
    // Only elements inside the currently active view (or the top bar)
    const scopes = document.querySelectorAll("#top-bar, .view.active");
    const els = [];
    scopes.forEach(scope => {
      scope.querySelectorAll(".focusable").forEach(el => {
        if (_visible(el)) els.push(el);
      });
    });
    return els;
  }

  function setFocus(el) {
    if (!el) return;
    if (current) current.classList.remove("focused");
    current = el;
    current.classList.add("focused");
    current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    if (current.tagName === "INPUT") {
      // allow typing immediately once focused
    }
  }

  function focusFirst() {
    const els = focusables();
    if (els.length) setFocus(els[0]);
  }

  // Find the nearest focusable element in a given direction using
  // bounding-rect geometry (center-to-center distance, direction-filtered).
  function moveFocus(direction) {
    const els = focusables().filter(el => el !== current);
    if (!current || !els.length) {
      focusFirst();
      return;
    }
    const cRect = current.getBoundingClientRect();
    const cx = cRect.left + cRect.width / 2;
    const cy = cRect.top + cRect.height / 2;

    let best = null;
    let bestScore = Infinity;

    els.forEach(el => {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = ex - cx;
      const dy = ey - cy;

      let valid = false;
      if (direction === KEY.RIGHT) valid = dx > 5 && Math.abs(dy) < r.height * 1.5;
      if (direction === KEY.LEFT) valid = dx < -5 && Math.abs(dy) < r.height * 1.5;
      if (direction === KEY.DOWN) valid = dy > 5;
      if (direction === KEY.UP) valid = dy < -5;
      if (!valid) return;

      // Prefer close, roughly-aligned elements
      const alignPenalty = (direction === KEY.LEFT || direction === KEY.RIGHT)
        ? Math.abs(dy) * 2
        : Math.abs(dx) * 2;
      const score = Math.abs(dx) + Math.abs(dy) + alignPenalty;

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });

    if (best) setFocus(best);
  }

  function init() {
    document.addEventListener("keydown", (e) => {
      const code = e.keyCode;

      if ([KEY.LEFT, KEY.UP, KEY.RIGHT, KEY.DOWN].includes(code)) {
        // Don't hijack left/right while typing in a text field
        if (current && current.tagName === "INPUT" && (code === KEY.LEFT || code === KEY.RIGHT)) {
          return;
        }
        e.preventDefault();
        moveFocus(code);
      } else if (code === KEY.ENTER) {
        if (current && current.tagName !== "INPUT") {
          e.preventDefault();
          current.click();
        }
      } else if (code === KEY.BACK) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("app:back"));
      }
    });
  }

  function getCurrent() {
    return current;
  }

  return { init, focusFirst, setFocus, getCurrent };
})();
