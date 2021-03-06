
var BACKGROUND_PAGE  = chrome.extension.getBackgroundPage();


function renderBad() {
    document.getElementById('status').innerText = "So sad.";
}

function renderGood() {
    document.getElementById('status').innerText = "Big League!";
}

function renderOK() {
    document.getElementById('status').innerText = "I don't rate it.";
}

function renderRating() {
    var rating = BACKGROUND_PAGE.getRating();
    if(rating) {
        document.getElementById('rating').innerText = (rating * 100.0).toFixed(2) + '%';
        if(rating < 0.3) {
            renderBad();
        } else if(rating >= 0.7) {
            renderGood();
        } else {
            renderOK();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {

    var dumpBtn = document.getElementById('btnTrumpDump');
    var upRateBtn = document.getElementById('btnWhiteList');
    var downRateBtn = document.getElementById('btnBlackList');

    renderRating();

    dumpBtn.addEventListener('click', function() {
        BACKGROUND_PAGE.sendDump();
    });

    upRateBtn.addEventListener('click', function() {
        BACKGROUND_PAGE.upRate();
        renderRating();
    });

    downRateBtn.addEventListener('click', function() {
        BACKGROUND_PAGE.downRate();
        renderRating();
    });

    chrome.runtime.onMessage.addListener(function(message) {
        if (message.action === 'update') {
            renderRating();
        }
    });

});