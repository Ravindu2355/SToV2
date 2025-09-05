// Prevent copying from specific elements
function initCopyProtection() {
    const protectedElements = [
        '#subtitleDisplay',
        '#editorContainer',
        'h1','h2','h3','h4','h5','h6','span','p','button','label'
    ];
    
    protectedElements.forEach(id => {
        const elements = document.querySelectorAll(id);
        if (elements) {
           elements.forEach(element => {
            preventElementCopy(element);
          });
        }
    });
    
    // Also protect all subtitle items
    document.addEventListener('click', function() {
        document.querySelectorAll('.subtitle-item, .subtitle-text').forEach(element => {
            preventElementCopy(element);
        });
    });
}

function preventElementCopy(element) {
    // CSS protection
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.mozUserSelect = 'none';
    element.style.msUserSelect = 'none';
    
    // Event protection
    const events = ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart', 'mousedown'];
    events.forEach(event => {
        element.addEventListener(event, function(e) {
            e.preventDefault();
            return false;
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCopyProtection);
