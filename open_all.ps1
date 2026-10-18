Get-ChildItem *.html | ForEach-Object { Invoke-Item $_.FullName }
Get-ChildItem *.png | ForEach-Object { Invoke-Item $_.FullName }
