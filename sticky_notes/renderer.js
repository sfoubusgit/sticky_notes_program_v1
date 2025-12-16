const { ipcRenderer } = require('electron');

let currentColor = 'yellow';
let noteData = { content: '', color: 'yellow' };

// Initialize note with saved content and color
function initializeNote(data) {
    noteData = data || { content: '', color: 'yellow' };
    
    const noteText = document.getElementById('noteText');
    const noteContainer = document.getElementById('noteContainer');
    
    noteText.value = noteData.content || '';
    currentColor = noteData.color || 'yellow';
    noteContainer.className = `note-container ${currentColor}`;
    
    // Update color button appearance
    updateColorButton();
}

// Listen for initialization data from main process
ipcRenderer.on('init-note', (event, data) => {
    initializeNote(data);
});

// Update color button to show current color
function updateColorButton() {
    const colorBtn = document.getElementById('colorBtn');
    const colors = {
        yellow: '#ffeb3b',
        white: '#ffffff',
        blue: '#2196f3',
        green: '#4caf50',
        pink: '#e91e63'
    };
    colorBtn.style.backgroundColor = colors[currentColor];
    colorBtn.style.border = currentColor === 'white' ? '1px solid #ddd' : 'none';
}

// Handle text changes
document.getElementById('noteText').addEventListener('input', (e) => {
    ipcRenderer.send('update-content', e.target.value);
});

// Handle delete button
document.getElementById('deleteBtn').addEventListener('click', () => {
    if (confirm('Delete this note?')) {
        ipcRenderer.send('delete-note');
    }
});

// Color picker functionality
const colorBtn = document.getElementById('colorBtn');
const colorPicker = document.createElement('div');
colorPicker.className = 'color-picker';
colorPicker.id = 'colorPicker';

const colors = ['yellow', 'white', 'blue', 'green', 'pink'];
colors.forEach(color => {
    const option = document.createElement('div');
    option.className = `color-option ${color}`;
    option.addEventListener('click', () => {
        currentColor = color;
        document.getElementById('noteContainer').className = `note-container ${currentColor}`;
        updateColorButton();
        colorPicker.classList.remove('show');
        ipcRenderer.send('update-color', color);
    });
    colorPicker.appendChild(option);
});

document.body.appendChild(colorPicker);

colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    colorPicker.classList.toggle('show');
});

// Close color picker when clicking outside
document.addEventListener('click', (e) => {
    if (!colorBtn.contains(e.target) && !colorPicker.contains(e.target)) {
        colorPicker.classList.remove('show');
    }
});

// Handle add note button
document.getElementById('addNoteBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    ipcRenderer.send('create-new-note');
});

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initializeNote();
});

