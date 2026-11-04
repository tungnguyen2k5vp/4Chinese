$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$artifactRoot = Join-Path $projectRoot 'artifacts\v8-3-hanzi-memory'
$shots = Join-Path $artifactRoot 'screenshots'
$output = Join-Path $artifactRoot 'gallery'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$diagnostics = Join-Path $artifactRoot 'diagnostics'
New-Item -ItemType Directory -Force -Path $diagnostics | Out-Null
Get-ChildItem -LiteralPath $shots -Filter '00-*' | ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination (Join-Path $diagnostics $_.Name) -Force }
function Make-Sheet($items, $name, $title, $subtitle) {
  $columns = 4; $tileWidth = 216; $tileHeight = 438; $margin = 16; $top = 84
  $rows = [Math]::Ceiling($items.Count / $columns)
  $bitmap = New-Object Drawing.Bitmap(($columns * ($tileWidth + $margin) + $margin), ($rows * $tileHeight + $top + $margin))
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([Drawing.Color]::White)
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $font = New-Object Drawing.Font('Arial', 11)
  $heading = New-Object Drawing.Font('Arial', 18, [Drawing.FontStyle]::Bold)
  $graphics.DrawString($title, $heading, [Drawing.Brushes]::Black, 16, 12)
  $graphics.DrawString($subtitle, $font, [Drawing.Brushes]::DimGray, 16, 45)
  for ($i = 0; $i -lt $items.Count; $i++) {
    $source = [Drawing.Image]::FromFile($items[$i].FullName)
    $x = $margin + ($i % $columns) * ($tileWidth + $margin)
    $y = $top + [Math]::Floor($i / $columns) * $tileHeight
    $height = [Math]::Min(384, $tileWidth * $source.Height / $source.Width)
    $graphics.DrawImage($source, [float]$x, [float]$y, [float]$tileWidth, [float]$height)
    $source.Dispose()
    $rectangle = New-Object Drawing.RectangleF($x, ($y + 386), $tileWidth, 48)
    $graphics.DrawString($items[$i].BaseName, $font, [Drawing.Brushes]::Black, $rectangle)
  }
  $bitmap.Save((Join-Path $output $name), [Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $font.Dispose(); $heading.Dispose()
}
$images = @(Get-ChildItem -LiteralPath $shots -Filter '*.png' | Where-Object Name -NotLike '00-*' | Sort-Object Name)
for ($start = 0; $start -lt $images.Count; $start += 12) {
  $page = [Math]::Floor($start / 12) + 1
  $last = [Math]::Min($start + 11, $images.Count - 1)
  Make-Sheet @($images[$start..$last]) "after-$page.png" "V8.3 - Android QA ($page)" 'Isolated synthetic learner. Original PNGs are in screenshots/. Not a physical phone.'
}
$oldRoot = Join-Path $projectRoot 'artifacts\v8-2-chinese-redesign-2026-10-14\gallery-10-features'
$oldNames = @('01-overview\05-home-qa2.png', '03-learning-review\31-review-setup-empty.png', '03-learning-review\33-review-weak.png')
$before = @($oldNames | ForEach-Object { Get-Item -LiteralPath (Join-Path $oldRoot $_) })
Make-Sheet $before 'before-archive.png' 'V8.2 - archived reference screens' 'Historical captures from 2026-10-14. Different fixtures; not a same-device pixel comparison.'
$cards = foreach ($item in $images) { '<figure><a href="../screenshots/' + $item.Name + '"><img loading="lazy" src="../screenshots/' + $item.Name + '" alt="' + $item.BaseName + '"></a><figcaption>' + $item.BaseName + '</figcaption></figure>' }
$html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V8.3 Android QA</title><style>body{font:16px system-ui;margin:24px;background:#f4f6fa;color:#172033}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:20px}figure{margin:0;padding:12px;background:white;border-radius:14px}img{width:100%;height:auto}figcaption{overflow-wrap:anywhere}</style><h1>V8.3 · Củng cố trí nhớ</h1><p>Ảnh thật từ máy ảo Android, chỉ dùng dữ liệu giả lập. Bấm ảnh để mở PNG gốc. Các ảnh before là tư liệu V8.2, không phải so sánh cùng dữ liệu.</p><p><a href="before-archive.png">Trước V8.3</a> · <a href="after-1.png">Sau V8.3 (1)</a> · <a href="after-2.png">Sau V8.3 (2)</a> · <a href="after-3.png">Sau V8.3 (3)</a> · <a href="after-4.png">Sau V8.3 (4)</a></p><main>' + ($cards -join '') + '</main>'
[IO.File]::WriteAllText((Join-Path $output 'index.html'), $html, [Text.Encoding]::UTF8)
Compress-Archive -LiteralPath $shots, $output -DestinationPath (Join-Path $artifactRoot 'android-screenshots.zip') -Force
Write-Output "Screenshots: $($images.Count). Gallery: $output"
