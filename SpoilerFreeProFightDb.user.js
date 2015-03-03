// ==UserScript==
// @name        SpoilerFreeProFightDb
// @namespace   http://something.org/
// @description Removes the results from matches listed on http://www.profightdb.com/.
// @include     http://www.profightdb.com/*
// @version     1
// @grant       none
// ==/UserScript==

// method stolen from the internet
var shuffle = function (array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

// 50% chance of swapping the elements of an array with 2 items
var swapRandomly = function (array) {
    if (Math.random() > 0.5) {
        return [array[1], array[0]];
    }
    else {
        return array;
    }
};

var arrayise = function (htmlCollection) {
    return Array.prototype.slice.call(htmlCollection);
};

var extractParticipantsFromTopMatchesRow = function (row) {
    // get all tds
    var tds = row.getElementsByTagName('td');

    // get all links in the 4th td
    var winners = arrayise(tds[3].getElementsByTagName('a'));

    // remove the "dark-blue" class from the winners
    winners.forEach(function (x) {
        x.className = x.className.replace(/(?:^|\s)dark-blue(?!\S)/g, '');
    });

    // get all links in the 5th td
    var losers = arrayise(tds[4].getElementsByTagName('a'));

    var participants = [winners, losers];

    return participants;
};

var extractParticipantsFromCardRow = function (row) {
    // get all tds
    var tds = row.getElementsByTagName('td');

    // get all links in the 2nd td
    var winners = arrayise(tds[1].getElementsByTagName('a'));

    // get all links in the 4th td
    var losers = arrayise(tds[3].getElementsByTagName('a'));

    var participants = [winners, losers];

    return participants;
};

var collectParticipants = function (table, extractParticipantsFunc) {
    var allParticipants;

    var rows = table.getElementsByTagName('tr');

    allParticipants = new Array(rows.length - 1);

    for (i = 0; i < rows.length - 1; i++) {
        allParticipants[i] = extractParticipantsFunc(rows[i + 1]);
    }

    return allParticipants;
};

var shuffleTeamsAndDisplayWithVs = function (input) {
    var output = '';

    var currentParticipants = swapRandomly(input);
    var team1 = currentParticipants[0];
    var team2 = currentParticipants[1];

    team1.forEach(function (x) {
        output += x.outerHTML + ', ';
    });

    output = output.slice(0, output.length - 2);

    output += ' vs ';

    team2.forEach(function (x) {
        output += x.outerHTML + ', ';
    });

    return output.slice(0, output.length - 2);
};

var setInnerHtmlToParticipants = function (cell, participants) {
    var finalParticipants = '';

    // if the numbers are equal on both sides (winners and losers) then we can display the teams without spoilers
    if (participants[0].length === participants[1].length) {
        finalParticipants = shuffleTeamsAndDisplayWithVs(participants);
    }
    else {
        // else if there is only one winner and multiple losers (for example) then we have to just shuffle all participants
        currentParticipants = shuffle(participants[0].concat(participants[1]));

        currentParticipants.forEach(function (x) {
            finalParticipants += x.outerHTML + ', ';
        });

        finalParticipants = finalParticipants.slice(0, finalParticipants.length - 2);
    }

    cell.innerHTML = finalParticipants;
    cell.style.textTransform = 'none';
};

var alterTopMatchesTable = function (table) {
    var allParticipants = collectParticipants(table, extractParticipantsFromTopMatchesRow);

    // rename "winners" to "participants"
    table.rows[0].cells[3].innerHTML = 'participants';

    // delete all the 5th column, the losers column
    for (i = 0; i < table.rows.length; i++) {
        table.rows[i].deleteCell(4);
    }

    for (i = 0; i < table.rows.length - 1; i++) {
        setInnerHtmlToParticipants(table.rows[i + 1].cells[3], allParticipants[i]);
    }
};

var alterCardTable = function (table) {
    var allParticipants = collectParticipants(table, extractParticipantsFromCardRow);

    // rename the 2nd column of the 1st row to participants
    table.rows[0].cells[1].innerHTML = 'participants';

    // also reset it's colspan to 1
    table.rows[0].cells[1].removeAttribute('colspan');

    // delete the 3rd and 4th columns of the other rows
    for (i = 1; i < table.rows.length; i++) {
        table.rows[i].deleteCell(2);
        table.rows[i].deleteCell(2); // The 4th column will now be the 3rd column after we just deleted it
    }

    for (i = 0; i < table.rows.length - 1; i++) {
        setInnerHtmlToParticipants(table.rows[i + 1].cells[1], allParticipants[i]);
    }
};

var checkIfTopMatchesTable = function (table) {
    // @param {Table} table This is a table.

    if (table.rows[0].cells.length === 6) {
        if (table.rows[0].cells[0].innerHTML == 'rating' && table.rows[0].cells[1].innerHTML == 'date' && table.rows[0].cells[2].innerHTML == 'card name') {
            return true;
        }
    }

    return false;
};

var checkIfCardTable = function (table) {
    // @param {Table} table This is a table.

    if (table.rows[0].cells.length === 6) {
        if (table.rows[0].cells[0].innerHTML == 'no.' && table.rows[0].cells[1].innerHTML == 'match' && table.rows[0].cells[2].innerHTML == 'duration') {
            return true;
        }
    }

    return false;
};

var spoileriseTableIfNecessary = function (table) {
    if (checkIfTopMatchesTable(table)) {
        console.info('top matches table found');
        alterTopMatchesTable(table);
    }
    else if (checkIfCardTable(table)) {
        console.info('card table found');
        alterCardTable(table);
    }
};

// CHAMPIONS SECTION

var getAllChampionGroupedElements = function () {
    var groups = [];
    
    var elements = document.getElementsByClassName('left-content');    

    if (elements.length > 0) {
        var groupsCount = 0;

        var htmlCollection = elements[0].children;

        for (i = 0; i < htmlCollection.length - 2; i++) {
            if (htmlCollection[i].tagName === 'IMG' && htmlCollection[i + 1].tagName === 'A' && htmlCollection[i + 2].tagName === 'FONT') {
                groups[groupsCount] = [htmlCollection[i], htmlCollection[i + 1], htmlCollection[i + 2]];
                groupsCount++;
                i = i + 2;
            }
        }
    }

    return groups;
};

var getElementWithInnerText = function (htmlCollection, searchText) {
    for (i = 0; i < htmlCollection.length; i++) {
        if (htmlCollection[i].textContent == searchText) {
            return htmlCollection[i];
        }
    }

    return undefined;
};

var revealChampions = function () {
    var champs = getAllChampionGroupedElements();

    champs.forEach(function (x) {
        x.forEach(function (y) {
            y.style.visibility = "visible";
        });
    });
};

var hideChampionsBehindButton = function (champs) {
    var h1CurrentChampions = getElementWithInnerText(document.getElementsByTagName('h1'), 'Current Champions');

    var elem = document.getElementsByTagName('h1')[0];

    // create a button to unhide spoilers
    var button = document.createElement('input');
    button.type = 'button';
    button.value = 'Show Champions';
    button.onclick = revealChampions;

    h1CurrentChampions.parentNode.insertBefore(button, h1CurrentChampions.nextSibling);

    button.parentNode.insertBefore(document.createElement('br'), button.nextSibling);

    champs.forEach(function (x) {
        x.forEach(function (y) {
            y.style.visibility = "hidden";
        });
    });
};

var spoileriseCurrentChampions = function () {
    var allChampionGroupedElements = getAllChampionGroupedElements();

    hideChampionsBehindButton(allChampionGroupedElements);
};

// END OF CHAMPIONS SECTION

var tables = arrayise(document.getElementsByTagName('table'));

tables.forEach(spoileriseTableIfNecessary);

spoileriseCurrentChampions();