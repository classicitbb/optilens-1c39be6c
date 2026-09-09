// Letterhead -> Microsoft Word export.
//
// Produces a single-file MHTML archive saved with a .doc extension. Word opens
// it as a normal, fully editable document, and — unlike a plain HTML .doc — the
// archive can carry separate header/footer sub-documents, so the letterhead
// logo bar and the contact strip become genuine Word page headers and footers
// that repeat across pages instead of ordinary body paragraphs.
(function registerLetterWordExport() {
  const BASE = "file:///C:/doc/";
  const MAIN = BASE + "letter.htm";
  const DIR = "letter_files/";
  const HEADER_FILE = DIR + "header.htm";
  const FILELIST = DIR + "filelist.xml";
  const LOGO_FILE = DIR + "image001.png";
  const BOUNDARY = "----=_NextPart_ClassicVisionsLetter";

  const b64 = (text) =>
    btoa(unescape(encodeURIComponent(text))).replace(/(.{76})/g, "$1\r\n");

  const wrap76 = (raw) => raw.replace(/\s+/g, "").replace(/(.{76})/g, "$1\r\n");

  const part = (location, type, body, alreadyBase64) =>
    "\r\n--" + BOUNDARY + "\r\n" +
    "Content-Location: " + location + "\r\n" +
    "Content-Transfer-Encoding: base64\r\n" +
    "Content-Type: " + type + "\r\n\r\n" +
    (alreadyBase64 ? wrap76(body) : b64(body)) + "\r\n";

  const NS =
    'xmlns:v="urn:schemas-microsoft-com:vml" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns="http://www.w3.org/TR/REC-html40"';

  const BASE_CSS =
    "body{margin:0;background:#fff;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#1c2b3a}" +
    "p.MsoHeader,p.MsoFooter,li.MsoHeader,li.MsoFooter,div.MsoHeader,div.MsoFooter{margin:0;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:10.0pt}" +
    "table{border-collapse:collapse}";

  // All four header/footer variants live in one Word sub-document, matching how
  // Word itself saves filtered HTML.
  function headerDocument(headerFirst, headerCont, footer) {
    return (
      "<html " + NS + '><head><meta charset="utf-8">' +
      "<style>" + BASE_CSS + "</style></head><body>" +
      '<div style="mso-element:header" id="fh1"><p class="MsoHeader">' + headerFirst + "</p></div>" +
      '<div style="mso-element:header" id="h1"><p class="MsoHeader">' + headerCont + "</p></div>" +
      '<div style="mso-element:footer" id="ff1"><p class="MsoFooter">' + footer + "</p></div>" +
      '<div style="mso-element:footer" id="f1"><p class="MsoFooter">' + footer + "</p></div>" +
      "</body></html>"
    );
  }

  function fileList(hasLogo) {
    return (
      '<xml xmlns:o="urn:schemas-microsoft-com:office:office">\r\n' +
      ' <o:MainFile HRef="../letter.htm"/>\r\n' +
      ' <o:File HRef="header.htm"/>\r\n' +
      (hasLogo ? ' <o:File HRef="image001.png"/>\r\n' : "") +
      ' <o:File HRef="filelist.xml"/>\r\n' +
      "</xml>"
    );
  }

  function mainDocument(title, bodyHtml) {
    const page =
      "@page Section1{size:8.5in 11.0in;" +
      "margin:1.55in 0.85in 1.05in 0.85in;" +
      "mso-header-margin:0.45in;mso-footer-margin:0.45in;" +
      "mso-title-page:yes;mso-paper-source:0;" +
      'mso-header:url("' + BASE + HEADER_FILE + '") h1;' +
      'mso-first-header:url("' + BASE + HEADER_FILE + '") fh1;' +
      'mso-footer:url("' + BASE + HEADER_FILE + '") f1;' +
      'mso-first-footer:url("' + BASE + HEADER_FILE + '") ff1;}' +
      "div.Section1{page:Section1}";
    return (
      "<html " + NS + '><head><meta charset="utf-8">' +
      "<title>" + title + "</title>" +
      '<link rel="File-List" href="' + FILELIST + '">' +
      "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>" +
      "<w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->" +
      "<style>" + BASE_CSS + page + "</style></head>" +
      '<body lang="EN-US"><div class="Section1">' + bodyHtml + "</div></body></html>"
    );
  }

  /**
   * @param {object} opts
   * @param {string} opts.title        Document title.
   * @param {string} opts.bodyHtml     Letter body (no header/footer blocks).
   * @param {string} opts.headerFirst  First-page header markup.
   * @param {string} opts.headerCont   Continuation-page header markup.
   * @param {string} opts.footer       Footer markup (all pages).
   * @param {string} [opts.logoPng]    data:image/png;base64,... logo, embedded
   *                                   as its own archive part when present.
   */
  function buildLetterWordFile(opts) {
    const logoBase64 =
      typeof opts.logoPng === "string" && opts.logoPng.indexOf("data:image/png;base64,") === 0
        ? opts.logoPng.slice("data:image/png;base64,".length)
        : "";

    let out =
      "MIME-Version: 1.0\r\n" +
      'Content-Type: multipart/related; boundary="' + BOUNDARY + '"; type="text/html"\r\n' +
      "X-Document-Type: Word.Document\r\n\r\n" +
      "This is a multi-part message in MIME format.\r\n";

    out += part(MAIN, 'text/html; charset="utf-8"', mainDocument(opts.title, opts.bodyHtml));
    out += part(
      BASE + HEADER_FILE,
      'text/html; charset="utf-8"',
      headerDocument(opts.headerFirst, opts.headerCont, opts.footer),
    );
    if (logoBase64) out += part(BASE + LOGO_FILE, "image/png", logoBase64, true);
    out += part(BASE + FILELIST, 'text/xml; charset="utf-8"', fileList(Boolean(logoBase64)));
    out += "\r\n--" + BOUNDARY + "--\r\n";
    return out;
  }

  // Header markup is resolved from header.htm, so the image URL must be
  // relative to that sub-document rather than relative to the archive root.
  window.__dcLetterWordExport = { buildLetterWordFile, LOGO_URL: "image001.png" };
})();
