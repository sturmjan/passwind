Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)

  # rounded gradient background
  $r = $size * 0.24
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($size - $d, 0, $d, $d, 270, 90)
  $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
  $path.AddArc(0, $size - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $c1 = [System.Drawing.Color]::FromArgb(10, 132, 255)
  $c2 = [System.Drawing.Color]::FromArgb(0, 102, 230)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45
  $g.FillPath($brush, $path)

  # padlock: shackle
  $white = [System.Drawing.Color]::White
  $pen = New-Object System.Drawing.Pen $white, ([single]($size * 0.085))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawArc($pen, [single]($size * 0.33), [single]($size * 0.2), [single]($size * 0.34), [single]($size * 0.4), 180, 180)
  $g.DrawLine($pen, [single]($size * 0.33), [single]($size * 0.4), [single]($size * 0.33), [single]($size * 0.5))
  $g.DrawLine($pen, [single]($size * 0.67), [single]($size * 0.4), [single]($size * 0.67), [single]($size * 0.5))

  # padlock: body
  $bx = $size * 0.25; $by = $size * 0.46; $bw = $size * 0.5; $bh = $size * 0.32; $br = $size * 0.07
  $bp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bd = $br * 2
  $bp.AddArc($bx, $by, $bd, $bd, 180, 90)
  $bp.AddArc($bx + $bw - $bd, $by, $bd, $bd, 270, 90)
  $bp.AddArc($bx + $bw - $bd, $by + $bh - $bd, $bd, $bd, 0, 90)
  $bp.AddArc($bx, $by + $bh - $bd, $bd, $bd, 90, 90)
  $bp.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $white), $bp)

  # keyhole
  $kb = New-Object System.Drawing.SolidBrush $c1
  $kr = $size * 0.055
  $g.FillEllipse($kb, [single]($size * 0.5 - $kr), [single]($size * 0.58 - $kr), [single]($kr * 2), [single]($kr * 2))
  $g.FillRectangle($kb, [single]($size * 0.5 - $size * 0.022), [single]($size * 0.6), [single]($size * 0.044), [single]($size * 0.11))

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$dir = Join-Path $PSScriptRoot '..\icons'
foreach ($s in 16, 32, 48, 128) { New-Icon $s (Join-Path $dir "icon$s.png") }
