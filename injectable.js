function getDomainFromUrl(url) {
    var d = (url || '').match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/);
    if(d) return d[1].replace(/^www\./, '');
    return null;
}

function getLinkArray() {
    return [].slice.call(document.getElementsByTagName("a"));
}

function getLinks() {

    var links = getLinkArray();

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

function highlightBadLinks(linkInfo) {
    var links = getLinkArray();
    linkInfo.badLinks.forEach(function(bL) {
       links.filter(function(l) {
           return getDomainFromUrl(l.href) == bL;
       }).forEach(function(l) {
           if(getDomainFromUrl(l.href) == bL) {
               l.className = 'fakeNews';
           } else if(l.className === 'fakeNews') {
               l.className = '';
           }
       })
    });
}

function addFakeNewsBanner() {

}

function sendLinks() {
    chrome.runtime.sendMessage({
        action: "pageLinks",
        source: getLinks(document)
    });
}

setTimeout(sendLinks, 100);

chrome.extension.onMessage.addListener(function(msg) {
    if(msg.action === 'markBadContent'){
        highlightBadLinks(JSON.parse(msg.source));
    } else if(msg.action === 'addFakeBanner') {
        addFakeNewsBanner();
    } else if(msg.action === 'getLinks') {
        sendLinks();
    }
});