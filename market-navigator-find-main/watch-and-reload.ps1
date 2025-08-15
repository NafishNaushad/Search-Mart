# File Watcher and Auto-Reload Script for Market Navigator
# This script monitors changes to Excel files and other project files and automatically reloads the development server when needed

# Configuration
$projectRoot = "$PSScriptRoot"
$excelDataDir = "$projectRoot\public\Real-data\Scrap data"
$devServerPort = 8080

# Function to check if the development server is running
function Test-DevServerRunning {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient("localhost", $devServerPort)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to start the development server
function Start-DevServer {
    Write-Host "Starting development server..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; npm run dev"
}

# Function to display help information
function Show-Help {
    Write-Host "\nMarket Navigator File Watcher and Auto-Reload Script" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "This script helps you manage Excel data files and automatically reflects changes in the app.\n"
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  1. add    - Add new Excel files to the data directory"
    Write-Host "  2. remove - Remove Excel files from the data directory"
    Write-Host "  3. list   - List all Excel files in the data directory"
    Write-Host "  4. watch  - Start watching for file changes (auto-reload)"
    Write-Host "  5. help   - Display this help information"
    Write-Host "  6. exit   - Exit the script\n"
    Write-Host "Example usage:" -ForegroundColor Green
    Write-Host "  > add Amazon-Scrap data\New-Product.xlsx  - Add a new Excel file"
    Write-Host "  > remove Flipkart-Scrap data\Old-File.xlsx - Remove an Excel file"
    Write-Host "  > list                                    - List all Excel files"
    Write-Host "  > watch                                   - Start watching for changes\n"
}

# Function to add a new Excel file
function Add-ExcelFile {
    param (
        [string]$filePath
    )
    
    if ([string]::IsNullOrEmpty($filePath)) {
        Write-Host "Please specify a file path relative to the Scrap data directory." -ForegroundColor Yellow
        Write-Host "Example: add Amazon-Scrap data\New-Product.xlsx" -ForegroundColor Yellow
        return
    }
    
    $fullPath = Join-Path -Path $excelDataDir -ChildPath $filePath
    $directory = Split-Path -Path $fullPath -Parent
    
    # Create directory if it doesn't exist
    if (!(Test-Path -Path $directory)) {
        New-Item -Path $directory -ItemType Directory -Force | Out-Null
        Write-Host "Created directory: $directory" -ForegroundColor Green
    }
    
    # Check if file already exists
    if (Test-Path -Path $fullPath) {
        Write-Host "File already exists: $fullPath" -ForegroundColor Yellow
        return
    }
    
    # Prompt user to select a file to copy
    Write-Host "Please select an Excel file to copy to $fullPath" -ForegroundColor Cyan
    $openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
    $openFileDialog.Filter = "Excel Files (*.xlsx)|*.xlsx|All Files (*.*)|*.*"
    $openFileDialog.Title = "Select Excel File to Copy"
    
    if ($openFileDialog.ShowDialog() -eq 'OK') {
        Copy-Item -Path $openFileDialog.FileName -Destination $fullPath
        Write-Host "Added file: $fullPath" -ForegroundColor Green
    } else {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
    }
}

# Function to remove an Excel file
function Remove-ExcelFile {
    param (
        [string]$filePath
    )
    
    if ([string]::IsNullOrEmpty($filePath)) {
        Write-Host "Please specify a file path relative to the Scrap data directory." -ForegroundColor Yellow
        Write-Host "Example: remove Amazon-Scrap data\Old-File.xlsx" -ForegroundColor Yellow
        return
    }
    
    $fullPath = Join-Path -Path $excelDataDir -ChildPath $filePath
    
    # Check if file exists
    if (!(Test-Path -Path $fullPath)) {
        Write-Host "File does not exist: $fullPath" -ForegroundColor Red
        return
    }
    
    # Confirm deletion
    $confirmation = Read-Host "Are you sure you want to remove $fullPath? (y/n)"
    if ($confirmation -eq 'y') {
        Remove-Item -Path $fullPath -Force
        Write-Host "Removed file: $fullPath" -ForegroundColor Green
    } else {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
    }
}

# Function to list all Excel files
function List-ExcelFiles {
    $excelFiles = Get-ChildItem -Path $excelDataDir -Filter "*.xlsx" -Recurse
    
    if ($excelFiles.Count -eq 0) {
        Write-Host "No Excel files found in $excelDataDir" -ForegroundColor Yellow
        return
    }
    
    Write-Host "\nExcel Files in $excelDataDir:" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    $platformCounts = @{}
    
    foreach ($file in $excelFiles) {
        $relativePath = $file.FullName.Substring($excelDataDir.Length + 1)
        $platform = $relativePath.Split('\')[0]
        
        if (!$platformCounts.ContainsKey($platform)) {
            $platformCounts[$platform] = 0
        }
        $platformCounts[$platform]++
    }
    
    Write-Host "\nSummary by Platform:" -ForegroundColor Green
    foreach ($platform in $platformCounts.Keys | Sort-Object) {
        Write-Host "$platform: $($platformCounts[$platform]) files"
    }
    
    Write-Host "\nTotal Excel Files: $($excelFiles.Count)" -ForegroundColor Green
    
    $listAll = Read-Host "\nDo you want to see all files? (y/n)"
    if ($listAll -eq 'y') {
        foreach ($file in $excelFiles) {
            $relativePath = $file.FullName.Substring($excelDataDir.Length + 1)
            Write-Host $relativePath
        }
    }
}

# Function to watch for file changes
function Watch-FileChanges {
    # Check if development server is running, if not start it
    if (!(Test-DevServerRunning)) {
        Start-DevServer
        # Give the server some time to start
        Start-Sleep -Seconds 5
    }
    
    Write-Host "\nWatching for file changes in $excelDataDir..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop watching." -ForegroundColor Yellow
    
    try {
        # Create a FileSystemWatcher to monitor the Excel data directory
        $watcher = New-Object System.IO.FileSystemWatcher
        $watcher.Path = $excelDataDir
        $watcher.IncludeSubdirectories = $true
        $watcher.EnableRaisingEvents = $true
        $watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor 
                               [System.IO.NotifyFilters]::DirectoryName -bor 
                               [System.IO.NotifyFilters]::LastWrite
        
        # Define actions for file changes
        $action = {
            $path = $Event.SourceEventArgs.FullPath
            $changeType = $Event.SourceEventArgs.ChangeType
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            
            Write-Host "[$timestamp] $changeType: $path" -ForegroundColor Green
            
            # Refresh the browser using curl to trigger a reload
            # This works if the development server supports WebSocket connections for live reload
            if (Test-DevServerRunning) {
                Write-Host "Changes detected - refresh your browser to see updates" -ForegroundColor Cyan
            }
        }
        
        # Register event handlers
        $handlers = . {
            Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action
            Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action
            Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action
            Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action
        }
        
        # Keep the script running until Ctrl+C is pressed
        Write-Host "Watcher started. Open your browser to http://localhost:$devServerPort" -ForegroundColor Green
        while ($true) { Start-Sleep -Seconds 1 }
    }
    finally {
        # Clean up event handlers when script is stopped
        if ($handlers) {
            $handlers | ForEach-Object { Unregister-Event -SourceIdentifier $_.Name }
        }
        if ($watcher) {
            $watcher.EnableRaisingEvents = $false
            $watcher.Dispose()
        }
        Write-Host "Watcher stopped." -ForegroundColor Yellow
    }
}

# Load Windows Forms for file dialog
Add-Type -AssemblyName System.Windows.Forms

# Main script execution
Clear-Host
Write-Host "Market Navigator File Manager" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Type 'help' for available commands.\n" -ForegroundColor Yellow

# Command loop
while ($true) {
    $command = Read-Host "Enter command"
    $commandParts = $command -split ' ', 2
    $action = $commandParts[0].ToLower()
    $argument = if ($commandParts.Length -gt 1) { $commandParts[1] } else { "" }
    
    switch ($action) {
        "help" { Show-Help }
        "add" { Add-ExcelFile -filePath $argument }
        "remove" { Remove-ExcelFile -filePath $argument }
        "list" { List-ExcelFiles }
        "watch" { Watch-FileChanges }
        "exit" { 
            Write-Host "Exiting script." -ForegroundColor Yellow
            exit 
        }
        default { 
            Write-Host "Unknown command: $action" -ForegroundColor Red
            Write-Host "Type 'help' for available commands." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
}