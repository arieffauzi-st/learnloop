// LearnLoop login theme — password show/hide toggle (same behaviour as base theme)

// Ensure mobile devices render the real responsive layout (base template lacks
// a viewport meta on some pages → phone shows desktop layout zoomed out).
if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1';
    document.head.appendChild(meta);
}

const buttons = document.querySelectorAll('[data-password-toggle]');
for (const button of buttons) {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'));
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.setAttribute('aria-label', showing ? button.dataset.labelShow : button.dataset.labelHide);
        const icon = button.querySelector('i');
        if (icon) icon.textContent = showing ? button.dataset.iconShow : button.dataset.iconHide;
    });
}
