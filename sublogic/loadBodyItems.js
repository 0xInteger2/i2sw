function showWidget(widgetClassName) {
  // Hide all widgets
  var widgets = document.querySelectorAll(".body-widget");
  widgets.forEach(function (widget) {
    widget.style.display = "none";
  });

  // Show the selected widget
  var selectedWidget = document.querySelector("." + widgetClassName);
  if (selectedWidget) {
    selectedWidget.style.display = "flex";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Show the home-widget by default
  showWidget("home-widget");

  // Define widget links and their corresponding class names
  const widgetLinks = {
    homeLink: "home-widget",
    nftsLink: "nfts-widget",
    musicLink: "music-widget",
    duneLink: "tardfolio-widget",
    gitLink: "git-widget",
    writingLink: "writing-widget",
  };

  // Loop through each link and add an event listener
  Object.keys(widgetLinks).forEach(function (linkClass) {
    document
      .querySelector("." + linkClass)
      .addEventListener("click", function () {
        showWidget(widgetLinks[linkClass]);
      });
  });
});
