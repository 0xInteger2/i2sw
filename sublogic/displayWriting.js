function showWriting(writingClassName) {
    var contents = document.querySelectorAll('.writing-content');
    contents.forEach(function (content) { // Changed variable name from contents to content
        content.style.display = 'none';
    });

    var selectedContent = document.querySelector('.' + writingClassName);
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }
}

document.addEventListener("DOMContentLoaded", function() {
    showWriting('EVM-DBO');

    document.querySelector('.ecrButton').addEventListener('click', function () {
        showWriting('ECR'); // Corrected class name to match the content
    });

    document.querySelector('.fossButton').addEventListener('click', function () {
        showWriting('FOSS');
    });

    document.querySelector('.dltButton').addEventListener('click', function () {
        showWriting('DLT');
    });

    document.querySelector('.evm-dboButton').addEventListener('click', function () {
        showWriting('EVM-DBO');
    });

});
