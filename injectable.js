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