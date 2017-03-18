function sourceToString(documentRoot) {
    var html = '',
        node = documentRoot.firstChild;
    while (node) {
        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                html += node.outerHTML;
                break;
            case Node.TEXT_NODE:
                html += node.nodeValue;
                break;
            case Node.CDATA_SECTION_NODE:
                html += '<![CDATA[' + node.nodeValue + ']]>';
                break;
            case Node.COMMENT_NODE:
                html += '<!--' + node.nodeValue + '-->';
                break;
            case Node.DOCUMENT_TYPE_NODE:
                html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
                break;
        }
        node = node.nextSibling;
    }
    return html;
}

function getDomainFromUrl(url) {
    var d = (url || '').match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/);
    if(d) return d[1];
    return null;
}

function getLinks() {
    var links = [].slice.call(document.getElementsByTagName("a"));

    var uniqLinks = links.map(function (lnk) {
        return getDomainFromUrl(lnk.href);
    }).filter(function(d) {
        return d != null;
    }).filter(function(d, i, a) {
        return a.indexOf(d) === i;
    });

    return JSON.stringify({
        domain: getDomainFromUrl(location.href),
        page: location.href,
        linkedDomains: uniqLinks
    });
}

chrome.runtime.sendMessage({
    action: "pageLinks",
    source: getLinks(document)
});