casper = require('casper').create({
    verbose: false,
    logLevel: 'debug',
    pageSettings: {
        loadImages:  false,
        loadPlugins: false
    }
});
var fs = require('fs');

function errorCli(msg) {
    console.log("Error: " + msg);
    casper.exit();
}

function getAllPicLink() {
    var links = [];
    var linksSelectors = document.querySelectorAll("div._2z6nI > article > div > div > div > div > a");
    for (var i=0; i < linksSelectors.length; i++) {
        links.push(linksSelectors[i].href);
    }
    return links;
}

function getLikedBy() {
    var users = [];
    var usersSelectors = document.querySelectorAll("div.d7ByH > a");
    for (var i=0; i < usersSelectors.length; i++) {
        console.log(usersSelectors[i].text)
        users.push(usersSelectors[i].text);
    }
    return users;
}

function scrollPage() {
    casper.wait(1000, function() {
        casper.scrollToBottom();
        var newScrolled = casper.evaluate(function() {
            return window.scrollY;
        });
        scrollDelta = newScrolled - scrolled;
        scrolled = newScrolled;
    });
    casper.then(function() {
        if (scrollDelta != 0) {
            scrollPage();
        }
    });
};

function findIndex(array, attr, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][attr] === value)
            return i;
    }
    return -1;
}

function sortByScore(array) {
    var newArr = [];

    for (var i=0; i < array.length; i++) {
        for (var j=0; j < array[i].length; j++) {
            var value = array[i][j];
            var index = findIndex(newArr, 'username', value);
            if (index > 0)
                newArr[index].likes += 1; 
            else {
                newArr.push({username: value, likes: 1});
            }
        }
    }

    newArr.sort(function (a, b) {
        if (a.score < b.score) return 1;
        if (a.score > b.score) return -1;
        return 0;
    })
    return newArr;
}

/**********
    Start
***********/

var user = casper.cli.get('user');
var links = [];
var nbPics = 0;
var likedBy = [];
var scrolled = 0;
var scrollDelta = null;

if (!user)
    errorCli("You forget to add" + "--user=\[username\]");

console.log("/******************************");
console.log("  ✨ Let's scrape "+ user + " ✨");
console.log("******************************/\n");

casper.start('https://www.instagram.com/' + user, function() {
    if (!this.exists("div.nZSzR > h1"))
        errorCli("The page doesn't exist");
    
    scrollPage();     
    this.then(function () {
        links = this.evaluate(getAllPicLink);
        nbPics = links.length;
        var j = 1;
        for (var i=0; i < nbPics; i++) {
            console.log("Opening picture "+ (i + 1) + "...")
            this
                .thenOpen(links[i])
                .wait(1000)
                .then(function() {
                    this.click("section.EDfFK.ygqzn > div > div > a");
                })
                .wait(1000)
                .then(function() {
                    console.log("Getting likes of picture " + j +"...");
                    scrollPage();
                    j++;
                })
                .then(function() {
                    var likes = this.evaluate(getLikedBy);
                    console.log("Retrieved " + likes.length + " likes");
                    likedBy.push(likes);
                })
        }
    })
    .then(function() {
        var result = sortByScore(likedBy);
        fs.write("engagedFollowers.txt", JSON.stringify(result, null, 2), 'w');
        console.log("\n/***********************************************************");
        console.log("                       ✨  FINISH ! ✨");
        console.log(' Your data has been saved in the file "engagedFollowers.txt"');
        console.log("***********************************************************/\n");
    })
})

casper.run();