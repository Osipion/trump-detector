var DATA = null,
    CURRENT_RATING = 0.5,
    CURRENT_URL = null,
    CURRENT_TAB = -1,
    CURRENT_WINDOW = -1,
    TRUMP_BUSTER_URL = 'http://ec2-34-249-91-79.eu-west-1.compute.amazonaws.com:8080/',
    LAST_DUMP = 0,
    SHOW_ALERTS = false,
    VERBOSE = true;

function msg(text) {
    if (SHOW_ALERTS) {
        alert(text);
    }
}

function log(text) {
    if (VERBOSE) {
        console.log(text);
    }
}

function loadData(done) {
    log('Start loading data...');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', chrome.extension.getURL('data/datastore.json'), true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            done(xhr.responseText);
        }
    };
    xhr.send();
}

function getDomainFromUrl(url) {
    return (url || '').match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/)[1];
}

function calculateRating(url, done) {
    var domain = getDomainFromUrl(url);

    var domainRecord = DATA.domains[domain];

    if (!domainRecord) {
        done(0.5);
    } else {
        done(domainRecord.rating);
    }
}

function getRating() {
    return CURRENT_RATING;
}

function setRating(rating, done) {
    if (rating < 0.3) {
        chrome.browserAction.setIcon({path: 'res/bad-rating-38.png'});
    } else if (rating >= 0.7) {
        chrome.browserAction.setIcon({path: 'res/good-rating-38.png'});
    } else {
        chrome.browserAction.setIcon({path: 'res/ok-rating-38.png'});
    }
    CURRENT_RATING = rating;
    done();
}

function ratePage(domainInfo) {

    if (!domainInfo) return;

    var capNumber = function (num, min, max) {
        if (num < min) {
            return min;
        } else if (num > max) {
            return max;
        }
        return num;
    };

    var ratedDomains = Object.keys(DATA.domains).filter(function (v) {
        return domainInfo.linkedDomains.indexOf(v) >= 0;
    });

    var rating = -1;

    if (ratedDomains.length < 1) {
        rating = 0.5;
    } else {
        var sum = ratedDomains.map(function (v) {
            return DATA.domains[v].rating;
        }).reduce(function (a, v) {
            return a + v;
        });

        rating = sum / ratedDomains.length;
    }

    var existingInfo = DATA.domains[domainInfo.domain];

    if (!existingInfo) {
        existingInfo = DATA.domains[domainInfo.domain] = {
            rating: rating,
            visits: 1,
            lastUpdated: new Date().getTime()
        };
        msg('New Domain rating created ' + domainInfo.domain + ' is ' + rating);
    } else {
        var aAverage = existingInfo.visits * existingInfo.rating;
        existingInfo.rating = (aAverage + rating) / (existingInfo.visits + 1);
        existingInfo.rating = capNumber(existingInfo.rating, 0, 1);
        existingInfo.lastUpdated = new Date().getTime();
        existingInfo.visits++;
        msg('Domain rating adjusted - new rating for ' + domainInfo.domain + ' is ' + existingInfo.rating);
    }
    return existingInfo;
}

var updating = false,
    dumping = false;

function onTabChange(tab) {
    if (tab && !updating) {
        if (tab.url && tab.highlighted) {
            updating = true;
            CURRENT_URL = tab.url;
            calculateRating(tab.url, function (rating) {
                log('Rating of ' + rating + ' set for ' + getDomainFromUrl(tab.url));
                setRating(rating, function () {
                    updating = false;
                    log('Done updating.');
                });
            });
        }
    }
}

function tabChangeWrapper(_, _, tab) {
    onTabChange(tab);
}

function onTabActivated(info) {

    if (CURRENT_TAB === info.tabId && CURRENT_WINDOW === info.windowId) {
        return;
    }

    CURRENT_TAB = info.tabId;
    CURRENT_WINDOW = info.windowId;
    tabbing = true;

    log('Setting tab activation timeout...');
    setTimeout(function () {
        log('Registering tab activation event...');
        chrome.tabs.get(info.tabId, onTabChange);
    }, 500);

}

function post(data, done) {
    log('Posting to ' + TRUMP_BUSTER_URL);
    var req = new XMLHttpRequest();
    req.open("POST", TRUMP_BUSTER_URL);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE) {
            log('Response to POST data: ' + req.status);
            done();
        }
    };
    req.send(JSON.stringify(data));
}

function sendDump() {
    if (DATA && !dumping) {
        dumping = true;
        var newData = Object.keys(DATA.domains).filter(function (k) {
            return DATA.domains[k].lastUpdated - LAST_DUMP > 0
        }).reduce(function (a, k) {
            a.domains[k] = DATA.domains[k];
            return a;
        }, {domains: {}});

        post(newData, function () {
            msg('Trumps dumped...');
            LAST_DUMP = new Date().getTime();
            dumping = false;
        });
    }
}

function refreshPage() {
    chrome.tabs.getSelected(null, function (tab) {
        var code = 'window.location.reload();';
        chrome.tabs.executeScript(tab.id, {code: code});
    });
}

function getRatingRecord() {
    if (DATA && CURRENT_URL) {
        var domain = getDomainFromUrl(CURRENT_URL);
        var d = DATA.domains[domain];
        if (!d) {
            d = {};
            DATA.domains[domain] = d;
        }
        return d;
    }
    return false;
}

function downRate() {
    var r = getRatingRecord();
    if (r) {
        r.rating = 0.001;
        r.visits = 1;
        r.lastUpdated = new Date().getTime();
        CURRENT_RATING = r.rating;
        refreshPage();
        log('Rating for ' + getDomainFromUrl(CURRENT_URL) + ' changed to 0.1%');
    }
}

function upRate() {
    var r = getRatingRecord();
    if (r) {
        r.rating = 1;
        r.visits = 1;
        r.lastUpdated = new Date().getTime();
        CURRENT_RATING = r.rating;
        refreshPage();
        log('Rating for ' + getDomainFromUrl(CURRENT_URL) + ' changed to 100%')
    }
}

function markBadContent(domainInfo) {
    var badLinks = domainInfo.linkedDomains.filter(function(v) {
        return !!DATA.domains[v] && DATA.domains[v].rating < 0.3;
    });
    var o = {
      badLinks: badLinks
    };
    log('requesting bad content marking');
    chrome.tabs.sendMessage(CURRENT_TAB, {
        action: 'markBadContent',
        source: JSON.stringify(o)
    });
}

function addFakeBanner() {
    log('requesting fake news banner add');
    chrome.tabs.sendMessage(CURRENT_TAB, {
        action: 'addFakeBanner'
    });
}

function updatePopup() {
    log('requesting popup update');
    chrome.runtime.sendMessage.sendMessage({
        action: 'update'
    });
}

chrome.runtime.onMessage.addListener(function (request, _) {
    if (request.action == "pageLinks" && request.source) {
        var domainInfo = JSON.parse(request.source);
        CURRENT_RATING = ratePage(domainInfo).rating;
        markBadContent(domainInfo);
        if(CURRENT_RATING < 0.3) {
            addFakeBanner();
        }
        updatePopup();
    }
});

loadData(function (data) {
    DATA = JSON.parse(data);
    chrome.tabs.onUpdated.addListener(tabChangeWrapper);
    chrome.tabs.onCreated.addListener(tabChangeWrapper);
    chrome.tabs.onActivated.addListener(onTabActivated);
});