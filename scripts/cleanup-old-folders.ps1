# Script untuk membersihkan folder lama setelah refactor ke struktur src/

Write-Host "🧹 Membersihkan folder lama..." -ForegroundColor Yellow
Write-Host ""

$foldersToRemove = @(
    "app",
    "components",
    "lib",
    "types"
)

foreach ($folder in $foldersToRemove) {
    $path = Join-Path $PSScriptRoot $folder
    if (Test-Path $path) {
        Write-Host "  ✓ Menghapus folder: $folder" -ForegroundColor Green
        Remove-Item -Path $path -Recurse -Force
    } else {
        Write-Host "  ⊗ Folder tidak ditemukan: $folder" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Selesai! Folder lama sudah dibersihkan." -ForegroundColor Green
Write-Host ""
Write-Host "📁 Struktur baru:" -ForegroundColor Cyan
Write-Host "  src/" -ForegroundColor White
Write-Host "    ├── app/" -ForegroundColor White
Write-Host "    ├── components/" -ForegroundColor White
Write-Host "    ├── lib/" -ForegroundColor White
Write-Host "    └── types/" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Jalankan 'npm run dev' untuk memulai aplikasi" -ForegroundColor Cyan
