// StoneCircle 소개 사이트 동작: 스크롤 등장 효과, AI Paste 체험, 연도 표시.
// 외부 라이브러리 없이 동작하며 입력 내용은 브라우저 밖으로 보내지 않는다.

(function () {
  "use strict";

  // 스크롤 등장 효과
  var revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("in");
    });
  }

  // 푸터 연도
  var year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // AI Paste 체험 — 앱의 마스킹 엔진이 아니라 소개용 간이 구현이다.
  var input = document.getElementById("paste-input");
  var output = document.getElementById("paste-output");
  var count = document.getElementById("paste-count");
  if (!input || !output) {
    return;
  }

  var maskChar = "*";

  var rules = [
    { name: "주민등록번호", re: /\b\d{6}-?[1-4]\d{6}\b/g },
    { name: "카드 번호", re: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g },
    { name: "전화번호", re: /\b01[016789]-?\d{3,4}-?\d{4}\b/g },
    { name: "이메일", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
    { name: "API 키", re: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b/g },
    {
      name: "비밀번호",
      re: /((?:password|passwd|pwd|비밀번호|비번)\s*[:=]\s*)(\S+)/gi,
      group: 2
    }
  ];

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function maskValue(value) {
    // 구분 기호(-, 공백, @, .)는 남겨 형태만 알아볼 수 있게 한다.
    return value.replace(/[^\s\-@.]/g, maskChar);
  }

  function render() {
    var text = input.value;
    var spans = [];

    rules.forEach(function (rule) {
      rule.re.lastIndex = 0;
      var m;
      while ((m = rule.re.exec(text)) !== null) {
        var start = m.index;
        var value = m[0];
        if (rule.group) {
          start = m.index + m[1].length;
          value = m[rule.group];
        }
        spans.push({ start: start, end: start + value.length });
        if (m[0].length === 0) {
          rule.re.lastIndex++;
        }
      }
    });

    // 겹치는 일치는 앞선 것 하나만 남긴다.
    spans.sort(function (a, b) {
      return a.start - b.start || b.end - a.end;
    });
    var merged = [];
    spans.forEach(function (s) {
      var last = merged[merged.length - 1];
      if (last && s.start < last.end) {
        return;
      }
      merged.push(s);
    });

    var html = "";
    var pos = 0;
    merged.forEach(function (s) {
      html += escapeHtml(text.slice(pos, s.start));
      html += "<mark>" + escapeHtml(maskValue(text.slice(s.start, s.end))) + "</mark>";
      pos = s.end;
    });
    html += escapeHtml(text.slice(pos));

    output.innerHTML = html;
    if (count) {
      count.textContent = merged.length === 0
        ? "가릴 정보가 없습니다. 그대로 붙여넣습니다."
        : merged.length + "곳을 가린 뒤 붙여넣습니다.";
    }
  }

  document.querySelectorAll("[data-mask]").forEach(function (button) {
    button.addEventListener("click", function () {
      maskChar = button.getAttribute("data-mask");
      document.querySelectorAll("[data-mask]").forEach(function (b) {
        b.setAttribute("aria-pressed", b === button ? "true" : "false");
      });
      render();
    });
  });

  input.addEventListener("input", render);
  render();
})();
