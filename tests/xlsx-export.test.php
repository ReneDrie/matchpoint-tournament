<?php

declare(strict_types=1);

use Matchpoint\Xlsx;

require dirname(__DIR__) . '/backend/src/Xlsx.php';

$path = tempnam(sys_get_temp_dir(), 'matchpoint-xlsx-test-');
if ($path === false) throw new RuntimeException('Testbestand kon niet worden aangemaakt.');

try {
    Xlsx::create(
        $path,
        'Deelnemers',
        ['Spelersnummer', 'Naam', 'Ingeschreven op'],
        [[12, '=ONVEILIG()', '2026-08-18 14:30:00']],
        [0 => 'number', 2 => 'datetime'],
        [14, 24, 21]
    );

    $zip = new ZipArchive();
    if ($zip->open($path) !== true) throw new RuntimeException('Gegenereerde XLSX kon niet worden geopend.');
    $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
    $workbook = $zip->getFromName('xl/workbook.xml');
    $styles = $zip->getFromName('xl/styles.xml');
    $zip->close();

    foreach ([$sheet, $workbook, $styles] as $xml) {
        if (!is_string($xml) || simplexml_load_string($xml) === false) {
            throw new RuntimeException('Gegenereerde XLSX bevat ongeldige XML.');
        }
    }
    if (!str_contains($sheet, '<autoFilter ref="A1:C2"/>')) throw new RuntimeException('Excel-filter ontbreekt.');
    if (!str_contains($sheet, 'state="frozen"')) throw new RuntimeException('Vaste kopregel ontbreekt.');
    if (!str_contains($sheet, '<c r="A2" s="0"><v>12</v></c>')) throw new RuntimeException('Spelersnummer is geen getal.');
    if (!str_contains($sheet, '<c r="C2" s="2"><v>')) throw new RuntimeException('Datum is niet getypeerd.');
    if (!str_contains($sheet, '=ONVEILIG()') || str_contains($sheet, '<f>')) throw new RuntimeException('Tekstveld is onveilig opgeslagen.');
    if (!str_contains($workbook, 'name="Deelnemers"')) throw new RuntimeException('Werkbladnaam ontbreekt.');

    echo "XLSX export test passed.\n";
} finally {
    if (is_file($path)) unlink($path);
}
