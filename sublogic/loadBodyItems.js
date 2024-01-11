function showWidget(widgetClassName) {
    // Hide all widgets
    var widgets = document.querySelectorAll('.body-widget');
    widgets.forEach(function (widget) {
        widget.style.display = 'none';
    });

    // Show the selected widget
    var selectedWidget = document.querySelector('.' + widgetClassName);
    if (selectedWidget) {
        selectedWidget.style.display = 'flex';
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Hide all widgets initially
    var widgets = document.querySelectorAll('.body-widget');
    widgets.forEach(function (widget) {
        widget.style.display = 'none';
    });

    // Add click event listeners to each navigation link
    document.querySelector('.nftsLink').addEventListener('click', function () {
        showWidget('nfts-widget');
    });

    document.querySelector('.musicLink').addEventListener('click', function () {
        showWidget('music-widget');
    });

    document.querySelector('.duneLink').addEventListener('click', function () {
        showWidget('dune-widget');
    });

    document.querySelector('.gitLink').addEventListener('click', function () {
        showWidget('git-widget');
    });

    document.querySelector('.discordLink').addEventListener('click', function () {
        showWidget('discord-widget');
    });

    document.querySelector('.twitterLink').addEventListener('click', function () {
        showWidget('twitter-widget');
    });

    
});