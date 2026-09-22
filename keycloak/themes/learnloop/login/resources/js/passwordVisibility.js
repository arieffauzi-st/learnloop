// LearnLoop login theme — password show/hide toggle (same behaviour as base theme)
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
