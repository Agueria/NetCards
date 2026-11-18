# tools/make-icons.ps1 - draws simple "NC" PNG icons for the manifest (Windows, PowerShell 7+).
# Run from the project root:  pwsh -File tools/make-icons.ps1
# Replace the generated PNGs with your own artwork any time; only the file names matter.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-Icon([int]$size, [string]$path, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#1d4ed8'))
  # Maskable icons may be cropped to a circle by Android, so the letters stay inside the central "safe zone".
  $scale = if ($maskable) { 0.42 } else { 0.55 }
  $font = New-Object System.Drawing.Font 'Segoe UI', ([float]($size * $scale)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'
  $format.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $g.DrawString('NC', $font, [System.Drawing.Brushes]::White, $rect, $format)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon 192 (Join-Path $out 'icon-192.png') $false
New-Icon 512 (Join-Path $out 'icon-512.png') $false
New-Icon 512 (Join-Path $out 'maskable-512.png') $true
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') $false   # iOS ignores manifest icons and uses this one
Write-Host "Icons written to $out"
