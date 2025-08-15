# Market Navigator Data Management Guide

This guide explains how to use the data management tools to easily add, remove, or modify Excel data files in the Market Navigator application.

## Quick Start

1. Double-click the `manage-data.bat` file in the project root directory
2. The data management console will open with several commands available

## Available Commands

### 1. `add` - Add new Excel files

Use this command to add new Excel files to the data directory. The command will prompt you to select a file from your computer to copy to the specified location.

```
add Amazon-Scrap data\New-Product.xlsx
```

### 2. `remove` - Remove Excel files

Use this command to remove Excel files from the data directory. The command will ask for confirmation before deleting the file.

```
remove Flipkart-Scrap data\Old-File.xlsx
```

### 3. `list` - List all Excel files

Use this command to list all Excel files in the data directory. It will show a summary by platform and the total number of files.

```
list
```

### 4. `watch` - Watch for file changes

Use this command to start watching for file changes in the data directory. When files are added, modified, or removed, the script will detect the changes and notify you to refresh your browser to see the updates.

```
watch
```

This command will also start the development server if it's not already running.

### 5. `help` - Display help information

Use this command to display help information about the available commands.

```
help
```

### 6. `exit` - Exit the script

Use this command to exit the script.

```
exit
```

## How It Works

The data management tools help you manage the Excel files in the `public/Real-data/Scrap data` directory. When you add, remove, or modify files in this directory, the changes will be reflected in the application when you refresh your browser.

The `watch` command starts a file watcher that monitors the data directory for changes. When changes are detected, it notifies you to refresh your browser to see the updates.

## Tips

1. Always use the `watch` command when making changes to Excel files to ensure the changes are detected
2. If you're adding new files, make sure they follow the same structure as the existing files
3. If you're modifying existing files, make sure you don't change the column names or structure
4. After making changes, refresh your browser to see the updates

## Troubleshooting

1. If the script doesn't start, make sure you have PowerShell installed on your computer
2. If the development server doesn't start, try running `npm run dev` manually
3. If changes aren't reflected in the application, try restarting the development server
4. If you encounter any other issues, check the console output for error messages