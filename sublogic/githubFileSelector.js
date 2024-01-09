function changeIframe(file) {
    const iframe = document.getElementById('iframeContent');
    if (file === 'none') {
        iframe.src = ''; // Set to an empty string or another default value
    } else {
        iframe.src = `https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2F0xInteger2%2Fi2sw%2Fblob%2Fmain%2F${file}&style=atom-one-dark&type=code&showLineNumbers=on&showFileMeta=on&showFullPath=on`;
    }
}