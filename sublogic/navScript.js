document.addEventListener('DOMContentLoaded', function () {
    let hasAnimated = false;

    function animateCog() {
        const container = document.querySelector('.nav-vector-container');
        const image1 = document.getElementById('nav-vector-innard');
        const image2 = document.getElementById('nav-vector-cog');

        if (!hasAnimated) {
            container.style.transform = 'scale(1.6)';
            image1.style.transform = 'scale(1.6)';
            image2.style.transform = 'rotate(90deg) scale(1.6) ';
        } else {
            container.style.transform = 'scale(1)';
            image1.style.transform = 'scale(1)';
            image2.style.transform = 'rotate(-90deg) scale(1) ';
        }

        hasAnimated = !hasAnimated;
    }

    function toggleOptionsMenu() {
        const optionsMenu = document.getElementById('optionsMenu');
        const navVectorContainer = document.querySelector('.nav-vector-container');
        const menuItems = document.querySelectorAll('.options-menu a');

        // Toggle display
        optionsMenu.style.display = (optionsMenu.style.display === 'block') ? 'none' : 'block';
       
        // Reset positioning and set initial opacity
        menuItems.forEach((menuItem) => {
            menuItem.style.position = 'static';
            menuItem.style.opacity = '0';
        });
    
        // If the menu is displayed, position menu items along the curve of the bottom right quadrant
        if (optionsMenu.style.display === 'block') {
            const containerRect = navVectorContainer.getBoundingClientRect();
            const containerCenterX = containerRect.left + containerRect.width / 32;
            const containerCenterY = containerRect.top + containerRect.height / 32;
    
            // Calculate angle between menu items
            const totalItems = menuItems.length;
            const angleIncrement = (Math.PI / 2) / (totalItems - 1);
    
            // Increase vertical spacing by adjusting the radius
            const verticalSpacing =80; // Adjust the spacing as needed
            const radius = containerRect.width / 2 + verticalSpacing;
    
            // Position menu items along the curve and gradually increase opacity
            menuItems.forEach((menuItem, index) => {
                const angle = (Math.PI / 2) - (angleIncrement * index); // Start from the top right
    
                const itemX = containerCenterX + radius * Math.cos(angle) - menuItem.clientWidth / 2;
                const itemY = containerCenterY + radius * Math.sin(angle) - menuItem.clientHeight / 2;
    
                menuItem.style.position = 'absolute';
                menuItem.style.left = `${itemX}px`;
                menuItem.style.top = `${itemY}px`;
                menuItem.style.opacity = '1';
            });
        }

    }

    


    document.querySelector('.nav-vector-container').addEventListener('click', function () {
        animateCog();
        toggleOptionsMenu();
    });
});