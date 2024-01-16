const options = {
    method: 'GET',
    headers: { accept: 'application/json', 'x-api-key': 'your-api-key' },
  };
  
  fetch('https://api.opensea.io/api/v2/collection/i2-surfworks/nfts?limit=50&next=%3E', options)
    .then(response => response.json())
    .then(response => {
      // Check if the response is an array and contains items
      if (Array.isArray(response.nfts) && response.nfts.length > 0) {
        // Reference the openseaItems div
        const openseaItemsDiv = document.getElementById('openseaItems');
  
        // Iterate through each 'nft' and create a div for each one inside openseaItems
        response.nfts.forEach((nft, index) => {
          createNftDiv(nft, index, openseaItemsDiv);
        });
      } else {
        console.error('No "nfts" found in the response array.');
      }
    })
    .catch(err => console.error(err));
  
  // Function to create a div for each 'nft' inside openseaItems
  function createNftDiv(nft, index, container) {
    // Create a new div element
    const nftDiv = document.createElement('div');
  
    // Set the content of the div (you can customize this based on the 'nft' properties)
    nftDiv.innerHTML = `

        <div class="nftDiv-img center-flex">
          <a class="openseaATag" href="${nft.opensea_url}" target="_blank">
              <img src="${nft.image_url}" alt="${nft.name}" >
          </a>
        </div>

        <div class="nftDiv-name center-flex">
            <h4>${nft.name}</h4>  
        </div>
      
    `;

    nftDiv.className = 'nft-div';
  
    // Append the nftDiv to the container (openseaItems div)
    container.appendChild(nftDiv);
  }