Set oWS = WScript.CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")
sScriptDir = oFSO.GetParentFolderName(WScript.ScriptFullName)
sLinkFile = oWS.SpecialFolders("Desktop") & "\Sticky Notes.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "wscript.exe"
oLink.Arguments = """" & sScriptDir & "\launch.vbs"""
oLink.WorkingDirectory = sScriptDir
oLink.IconLocation = "shell32.dll,21"
oLink.Description = "Launch Sticky Notes Application"
oLink.WindowStyle = 7
oLink.Save
WScript.Echo "Shortcut created on Desktop: Sticky Notes.lnk"

