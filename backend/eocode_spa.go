package main

import (
	"regexp"
	"strconv"
	"strings"
)

const (
	eocodeSPACSSMarker = `data-eocode-spa-css="1"`
	eocodeSPAJSMarker  = `data-eocode-spa-js="1"`
)

const eocodeSPACSS = `.view{display:none!important}.view.active{display:block!important}@media print{.view{display:block!important}}`

const eocodeSPAJS = `(function(){
  function slug(text, fallback) {
    var s = String(text || "").toLowerCase();
    s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || fallback;
  }
  function boot() {
    var views = Array.prototype.slice.call(document.querySelectorAll("[data-view]"));
    if (views.length === 0) {
      var sections = document.querySelectorAll("main > section, body > section");
      for (var i = 0; i < sections.length; i++) {
        var sec = sections[i];
        var heading = sec.querySelector("h1, h2");
        var name = sec.id || slug(heading ? heading.textContent : "", "vista-" + (i + 1));
        sec.setAttribute("data-view", name);
        sec.classList.add("view");
        if (i === 0) sec.classList.add("active");
        views.push(sec);
      }
    } else {
      for (var v = 0; v < views.length; v++) views[v].classList.add("view");
    }
    if (views.length === 0) return;
    var buttons = document.querySelectorAll("[data-route]");
    function showView(name) {
      name = String(name || "").replace(/^#/, "").replace(/^\//, "").replace(/\.html?$/i, "");
      var found = false;
      for (var i = 0; i < views.length; i++) {
        var match = views[i].getAttribute("data-view") === name;
        views[i].classList.toggle("active", match);
        if (match) found = true;
      }
      if (!found) {
        for (var j = 0; j < views.length; j++) views[j].classList.toggle("active", j === 0);
        name = views[0].getAttribute("data-view") || "";
      }
      for (var b = 0; b < buttons.length; b++) {
        buttons[b].classList.toggle("active", buttons[b].getAttribute("data-route") === name);
      }
      if (name && location.hash !== "#" + name) {
        try { history.replaceState(null, "", "#" + name); } catch (err) {}
      }
    }
    document.addEventListener("click", function (ev) {
      var raw = ev.target;
      if (raw && raw.nodeType !== 1) raw = raw.parentElement;
      if (!raw || !raw.closest) return;
      var el = raw.closest("[data-route], a[href]");
      if (!el) return;
      var route = el.getAttribute("data-route");
      if (!route && el.tagName === "A") {
        var href = el.getAttribute("href") || "";
        if (/^(https?:|mailto:|tel:)/i.test(href)) return;
        if (/\.(webp|gif|png|jpe?g|svg)(\?|#|$)/i.test(href)) return;
        if (href.charAt(0) === "#") route = href.slice(1);
        else {
          try {
            var url = new URL(href, location.href);
            if (url.origin !== location.origin) return;
            route = (url.hash || url.pathname).replace(/^\//, "").replace(/^#/, "");
          } catch (err) { return; }
        }
      }
      if (!route) return;
      ev.preventDefault();
      showView(route);
    });
    window.addEventListener("hashchange", function () { showView(location.hash); });
    showView(location.hash || (views[0] && views[0].getAttribute("data-view")) || "inicio");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();`

var eocodeBodyOpenRe = regexp.MustCompile(`(?i)<body\b[^>]*>`)

// eocodeNormalizeSPA makes the generated document behave as a client-side SPA
// even when the Python generators stacked extra pages into one HTML file.
func eocodeNormalizeSPA(html string) string {
	html = strings.TrimSpace(html)
	if html == "" {
		return html
	}
	html = eocodeCollapseStackedBodies(html)
	html = eocodeEnsureViewCSS(html)
	html = eocodeEnsureViewRouter(html)
	return html
}

func eocodeCollapseStackedBodies(html string) string {
	opens := eocodeBodyOpenRe.FindAllStringIndex(html, -1)
	if len(opens) < 2 {
		return html
	}
	head := html[:opens[0][0]]
	var inners []string
	var scripts []string
	for i, loc := range opens {
		end := len(html)
		if i+1 < len(opens) {
			end = opens[i+1][0]
		}
		content, script := splitBodyScript(html[loc[1]:end])
		content = strings.TrimSpace(stripClosingDocTags(content))
		if content != "" {
			inners = append(inners, content)
		}
		if script != "" {
			scripts = append(scripts, script)
		}
	}
	if len(inners) < 2 {
		return html
	}
	var b strings.Builder
	b.WriteString(head)
	b.WriteString("<body>")
	for i, inner := range inners {
		name := eocodeViewNameFromHTML(inner, i)
		cls := "view"
		if i == 0 {
			cls = "view active"
		}
		b.WriteString(`<section data-view="` + name + `" class="` + cls + `">`)
		b.WriteString(inner)
		b.WriteString("</section>")
	}
	for _, script := range scripts {
		b.WriteString(script)
	}
	return b.String()
}

func splitBodyScript(chunk string) (content, script string) {
	idx := strings.Index(strings.ToLower(chunk), "<script")
	if idx < 0 {
		return chunk, ""
	}
	return chunk[:idx], chunk[idx:]
}

func stripClosingDocTags(chunk string) string {
	lower := strings.ToLower(chunk)
	for _, tag := range []string{"</body>", "</html>"} {
		if i := strings.LastIndex(lower, tag); i >= 0 {
			chunk = chunk[:i]
			lower = strings.ToLower(chunk)
		}
	}
	return chunk
}

var eocodeHeadingRe = regexp.MustCompile(`(?is)<h[12][^>]*>(.*?)</h[12]>`)
var eocodeTagRe = regexp.MustCompile(`<[^>]+>`)

func eocodeViewNameFromHTML(inner string, index int) string {
	if m := eocodeHeadingRe.FindStringSubmatch(inner); len(m) == 2 {
		text := strings.TrimSpace(eocodeTagRe.ReplaceAllString(m[1], ""))
		slug := eocodeSlug(text)
		if slug != "" {
			return slug
		}
	}
	return "vista-" + strconv.Itoa(index+1)
}

func eocodeSlug(text string) string {
	text = strings.ToLower(strings.TrimSpace(text))
	var b strings.Builder
	lastDash := false
	for _, r := range text {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 40 {
		out = out[:40]
	}
	return out
}

func eocodeEnsureViewCSS(html string) string {
	if strings.Contains(html, eocodeSPACSSMarker) {
		return html
	}
	style := `<style ` + eocodeSPACSSMarker + `>` + eocodeSPACSS + `</style>`
	if i := strings.LastIndex(strings.ToLower(html), "</head>"); i >= 0 {
		return html[:i] + style + html[i:]
	}
	return style + html
}

func eocodeEnsureViewRouter(html string) string {
	if strings.Contains(html, eocodeSPAJSMarker) {
		return html
	}
	script := `<script ` + eocodeSPAJSMarker + `>` + eocodeSPAJS + `</script>`
	if i := strings.LastIndex(strings.ToLower(html), "</body>"); i >= 0 {
		return html[:i] + script + html[i:]
	}
	return html + script
}
