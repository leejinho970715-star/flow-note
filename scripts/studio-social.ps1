$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$basePath=Split-Path -Parent $PSScriptRoot
$assetPath=Join-Path $basePath 'agencyflow/public/product-assets'
foreach($item in @(@('follonote','Follonote','다음 연락까지, 놓치지 않는 영업.','#137d71'),@('crewmemo','Crewmemo','오늘의 팀 업무를, 한곳에.','#3864d9'),@('studio','Flownote Studio','흩어진 일을 모아, 일이 흐르게.','#ed7834'))){
 $bitmap=New-Object System.Drawing.Bitmap 1200,630
 $g=[System.Drawing.Graphics]::FromImage($bitmap)
 $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#fcfbf9'))
 $accent=New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($item[3]))
 $ink=New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#292724'))
 $muted=New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#81766d'))
 $g.FillRectangle($accent,48,48,14,36)
 $g.DrawString($item[1],(New-Object System.Drawing.Font 'Arial',27,([System.Drawing.FontStyle]::Bold)),$ink,80,44)
 $g.DrawString($item[2],(New-Object System.Drawing.Font 'Malgun Gothic',32,([System.Drawing.FontStyle]::Bold)),$ink,48,133)
 $g.DrawString('고객 · 프로젝트 · 영업 · 팀 업무',(New-Object System.Drawing.Font 'Malgun Gothic',15),$muted,52,205)
 $screenName=if($item[0] -eq 'studio'){'flownote'}else{$item[0]}
 $screenPath=if($item[0] -eq 'studio'){Join-Path $basePath 'studio/assets/flownote-screen.jpg'}else{Join-Path $assetPath ($screenName+'-screen.jpg')}
 $screen=[System.Drawing.Image]::FromFile($screenPath)
 $g.FillRectangle($accent,48,270,1104,12)
 $g.DrawImage($screen,48,282,1104,690)
 $outPath=if($item[0] -eq 'studio'){Join-Path $basePath 'studio/assets/og-studio.png'}else{Join-Path $assetPath ($item[0]+'-og.png')}
 $bitmap.Save($outPath,[System.Drawing.Imaging.ImageFormat]::Png)
 $screen.Dispose();$g.Dispose();$bitmap.Dispose();$accent.Dispose();$ink.Dispose();$muted.Dispose()
}
foreach($kind in @('follonote','crewmemo')){Copy-Item -LiteralPath (Join-Path $assetPath ($kind+'-screen.jpg')) -Destination (Join-Path $basePath ('studio/assets/'+$kind+'-screen.jpg'))}
foreach($kind in @('follonote','crewmemo')){foreach($size in @(32,180)){
 $b=New-Object System.Drawing.Bitmap $size,$size
 $g=[System.Drawing.Graphics]::FromImage($b);$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $color=if($kind -eq 'follonote'){'#137d71'}else{'#3864d9'};$letter=if($kind -eq 'follonote'){'F'}else{'C'}
 $g.Clear([System.Drawing.ColorTranslator]::FromHtml($color));$font=New-Object System.Drawing.Font 'Arial',($size*.49),([System.Drawing.FontStyle]::Bold)
 $format=New-Object System.Drawing.StringFormat;$format.Alignment=[System.Drawing.StringAlignment]::Center;$format.LineAlignment=[System.Drawing.StringAlignment]::Center
 $g.DrawString($letter,$font,[System.Drawing.Brushes]::White,(New-Object System.Drawing.RectangleF 0,0,$size,$size),$format)
 $b.Save((Join-Path $assetPath ($kind+'-'+$size+'.png')),[System.Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$format.Dispose();$g.Dispose();$b.Dispose()
}}
Write-Output 'Studio and two product OG PNGs created at 1200x630.'
