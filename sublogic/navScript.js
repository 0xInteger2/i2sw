document.addEventListener('DOMContentLoaded', function () {
    let hasAnimated = false;

    const optionsMenu = document.getElementById('optionsMenu');
    const navVectorContainer = document.querySelector('.nav-vector-container');
    const menuItems = document.querySelectorAll('.options-menu a');
    const miniCogs = document.querySelectorAll('.mini-cog');

    
    const containerRect = navVectorContainer.getBoundingClientRect();
    const containerCenterX = containerRect.left + containerRect.width / 32;
    const containerCenterY = containerRect.top + containerRect.height / 32;

    const totalItems = menuItems.length;
    const angleIncrement = (Math.PI / 2) / 5;
    let radius = containerRect.width / 2 + 160;
    let currentCurve = 0;

    menuItems.forEach((menuItem, index) => {
        const angle = (Math.PI / 2) - (angleIncrement * (index % 6));

        if (index > 0 && index % 6 === 0) {
            radius += 70;
            currentCurve++;
        }

        const itemX = containerCenterX + radius * Math.cos(angle) - menuItem.clientWidth / 2;
        const itemY = containerCenterY + radius * Math.sin(angle) - menuItem.clientHeight / 2;

        menuItem.style.position = 'absolute';
        menuItem.style.left = `${itemX}px`;
        menuItem.style.top = `${itemY}px`;
    });

    function animateCogs() {
        const container = document.querySelector('.nav-vector-container');
        const image1 = document.getElementById('nav-vector-innard');
        const image2 = document.getElementById('nav-vector-cog');
        const miniCogs = document.querySelectorAll('.mini-cog');
    
        if (!hasAnimated) {
            container.style.transform = 'scale(1.6)';
            image1.style.transform = 'scale(1.6)';
            image2.style.transform = 'rotate(180deg) scale(1.6)';
            
            // Rotate mini-cogs the same as image2
            miniCogs.forEach((miniCog) => {
                miniCog.style.transform = 'rotate(-135deg)'; // Adjust rotation angle as needed
            });
        } else {
            container.style.transform = 'scale(1)';
            image1.style.transform = 'scale(1)';
            image2.style.transform = 'rotate(0deg) scale(1)';
            
            // Reset mini-cogs rotation
            miniCogs.forEach((miniCog) => {
                miniCog.style.transform = 'rotate(0deg)';
            });
        }
    
        hasAnimated = !hasAnimated;
    }
    

    function toggleOptionsMenu() {
        const currentVisibility = optionsMenu.style.visibility || 'hidden';
        optionsMenu.style.visibility = (currentVisibility === 'visible') ? 'hidden' : 'visible';
        optionsMenu.style.opacity = (currentVisibility === 'visible') ? '0' : '1';

        
    }

    document.querySelector('.nav-vector-container').addEventListener('click', function () {
        animateCogs();
        toggleOptionsMenu();
    });

    document.querySelector('.options-menu').addEventListener('click', function () {
        animateCogs();
        toggleOptionsMenu();
    });
});