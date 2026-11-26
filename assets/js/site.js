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

  // AI Paste 체험
  // 규칙은 shared/Shared.Core/Defense/BuiltInMaskRules.cs, 가림 방식은 TextMasker.Mask를 옮긴 것이다.
  // 앱 규칙이 바뀌면 여기도 함께 고친다. 결과 문구는 #paste-count의 data-none/data-some(언어별)에서 읽는다.
  var input = document.getElementById("paste-input");
  var output = document.getElementById("paste-output");
  var count = document.getElementById("paste-count");
  if (!input || !output) {
    return;
  }

  var maskChar = "*";

  function passesLuhn(value) {
    var sum = 0;
    var doubleIt = false;
    for (var i = value.length - 1; i >= 0; i--) {
      var c = value.charCodeAt(i);
      if (c < 48 || c > 57) {
        continue;
      }
      var digit = c - 48;
      if (doubleIt && (digit *= 2) > 9) {
        digit -= 9;
      }
      sum += digit;
      doubleIt = !doubleIt;
    }
    return sum % 10 === 0;
  }

  var rules = [];
  function addRule(pattern, flags, accept) {
    try {
      rules.push({ re: new RegExp(pattern, "g" + (flags || "")), accept: accept });
    } catch (e) {
      // 정규식 뒤돌아보기를 지원하지 않는 오래된 브라우저에서는 해당 규칙만 건너뛴다.
    }
  }

  // 주민등록번호
  addRule("(?<!\\d)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])[- ]?[1-8]\\d{6}(?!\\d)");
  // 카드 번호(Luhn 검사)
  addRule("(?<!\\d)(?:\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{1,4}|3[47]\\d{2}[- ]?\\d{6}[- ]?\\d{5})(?!\\d)", "", passesLuhn);
  // 한국 전화번호
  addRule("(?<!\\d)(?:\\+82[- ]?(?:1[016789]|[2-6]\\d?)|01[016789]|0(?:2|[3-6][1-5]|70))[- .]?\\d{3,4}[- .]?\\d{4}(?!\\d)");
  // 이메일
  addRule("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");
  // API 키(OpenAI·Anthropic, AWS, GitHub, Slack, Google, JWT)
  addRule(
    "\\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_\\-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}" +
    "|github_pat_[A-Za-z0-9_]{22,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_\\-]{35}" +
    "|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,})"
  );
  // 개인 키
  addRule("-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----[\\s\\S]*?-----END (?:[A-Z]+ )*PRIVATE KEY-----");
  // 비밀번호 등 라벨 뒤의 값
  addRule(
    "(?<=(?:\\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|token)|비밀번호|패스워드|암호)\\s*[:=]\\s*[\"']?)[^\\s\"',;]+",
    "i"
  );

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render() {
    var text = input.value;
    var hidden = new Array(text.length);

    rules.forEach(function (rule) {
      rule.re.lastIndex = 0;
      var m;
      while ((m = rule.re.exec(text)) !== null) {
        if (m[0].length === 0) {
          rule.re.lastIndex++;
          continue;
        }
        if (rule.accept && !rule.accept(m[0])) {
          continue;
        }
        for (var i = m.index; i < m.index + m[0].length; i++) {
          hidden[i] = true;
        }
      }
    });

    var html = "";
    var found = 0;
    var open = false;
    for (var j = 0; j < text.length; j++) {
      var c = text.charAt(j);
      if (hidden[j]) {
        if (!open) {
          html += "<mark>";
          open = true;
          found++;
        }
        html += /\s/.test(c) || c === "-" || c === "." || c === "@" ? escapeHtml(c) : maskChar;
      } else {
        if (open) {
          html += "</mark>";
          open = false;
        }
        html += escapeHtml(c);
      }
    }
    if (open) {
      html += "</mark>";
    }

    output.innerHTML = html;
    if (count) {
      count.textContent = found === 0
        ? count.getAttribute("data-none")
        : (count.getAttribute("data-some") || "").replace("{0}", String(found));
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
