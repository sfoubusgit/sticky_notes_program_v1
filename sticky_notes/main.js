const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let noteWindows = new Map();
const dataPath = path.join(app.getPath('userData'), 'notes-data.json');

// Load saved notes data
function loadNotesData() {
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading notes data:', error);
  }
  return [];
}

// Save notes data
function saveNotesData() {
  try {
    const notesData = Array.from(noteWindows.values()).map(win => ({
      id: win.id,
      x: win.getBounds().x,
      y: win.getBounds().y,
      width: win.getBounds().width,
      height: win.getBounds().height,
      content: win.content || '',
      color: win.color || 'yellow'
    }));
    fs.writeFileSync(dataPath, JSON.stringify(notesData, null, 2));
  } catch (error) {
    console.error('Error saving notes data:', error);
  }
}

// Create a new note window
function createNoteWindow(noteData = null) {
  const id = noteData ? noteData.id : Date.now().toString();
  
  const defaultBounds = {
    width: 250,
    height: 200,
    x: noteData ? noteData.x : 100,
    y: noteData ? noteData.y : 100
  };

  const win = new BrowserWindow({
    width: defaultBounds.width,
    height: defaultBounds.height,
    x: defaultBounds.x,
    y: defaultBounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.id = id;
  win.content = noteData ? noteData.content : '';
  win.color = noteData ? noteData.color : 'yellow';

  win.loadFile('note.html');

  // Save position when window is moved
  win.on('moved', () => {
    saveNotesData();
  });

  // Save position when window is resized
  win.on('resized', () => {
    saveNotesData();
  });

  // Remove from map when closed
  win.on('closed', () => {
    noteWindows.delete(id);
    saveNotesData();
  });

  // Send initial data to renderer
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('init-note', {
      content: win.content,
      color: win.color
    });
  });

  // Handle content updates from renderer
  ipcMain.on('update-content', (event, content) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.content = content;
      saveNotesData();
    }
  });

  // Handle color changes
  ipcMain.on('update-color', (event, color) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.color = color;
      saveNotesData();
    }
  });

  // Handle delete request
  ipcMain.on('delete-note', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      noteWindows.delete(window.id);
      window.close();
      saveNotesData();
    }
  });

  noteWindows.set(id, win);
  return win;
}

// Handle create new note request from any note window
ipcMain.on('create-new-note', (event) => {
  // Get the position of the current window to offset the new one
  const currentWindow = BrowserWindow.fromWebContents(event.sender);
  let newX = 100;
  let newY = 100;
  
  if (currentWindow) {
    const bounds = currentWindow.getBounds();
    // Position new note slightly offset from current note
    newX = bounds.x + 30;
    newY = bounds.y + 30;
  }
  
  createNoteWindow({
    x: newX,
    y: newY,
    width: 250,
    height: 200,
    content: '',
    color: 'yellow'
  });
});

// Create system tray
function createTray() {
  const { nativeImage } = require('electron');
  
  let iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple 16x16 icon using a minimal PNG data URL (yellow square)
    // This is a 1x1 yellow pixel scaled up
    const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    try {
      trayIcon = nativeImage.createFromDataURL(iconData);
      // Scale it to a reasonable size
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } catch (error) {
      // Fallback: use the path anyway and let Electron handle it
      trayIcon = iconPath;
    }
  }
  
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'New Note',
      click: () => {
        createNoteWindow();
      }
    },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Sticky Notes');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    createNoteWindow();
  });
}

app.whenReady().then(() => {
  // Create system tray
  createTray();

  // Register global shortcut (Ctrl+Shift+N)
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    createNoteWindow();
  });

  // Load saved notes
  const savedNotes = loadNotesData();
  if (savedNotes.length > 0) {
    savedNotes.forEach(noteData => {
      createNoteWindow(noteData);
    });
  } else {
    // Create first note if no saved notes
    createNoteWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createNoteWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed (keep tray running)
  // app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  saveNotesData();
});

