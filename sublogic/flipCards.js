document.addEventListener("DOMContentLoaded", () => {
  // Select all flip cards
  const flipCards = document.querySelectorAll(".flip-card");

  // Iterate through each card
  flipCards.forEach((card) => {
    // Find both buttons inside the front and back side of the card
    const flipButtons = card.querySelectorAll(".flipCardButton");

    // Add click event listener to each button
    flipButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Apply the flip effect by toggling the transform
        if (card.style.transform === "rotateY(-180deg)") {
          card.style.transform = "rotateY(0deg)"; // Flip back to front
        } else {
          card.style.transform = "rotateY(-180deg)"; // Flip to back
        }
      });
    });
  });
});
