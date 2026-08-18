<?php

declare(strict_types=1);

namespace Matchpoint;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;
use ZipArchive;

final class Xlsx
{
    /**
     * @param list<string> $headers
     * @param list<list<mixed>> $rows
     * @param array<int, 'number'|'datetime'> $columnTypes Zero-based column indexes.
     * @param list<float> $columnWidths
     */
    public static function create(
        string $path,
        string $sheetName,
        array $headers,
        array $rows,
        array $columnTypes = [],
        array $columnWidths = []
    ): void {
        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException('De PHP ZIP-extensie is vereist voor Excel-export.');
        }
        if ($headers === []) throw new RuntimeException('Een Excel-export heeft minimaal één kolom nodig.');

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Het tijdelijke Excel-bestand kon niet worden aangemaakt.');
        }

        $lastCell = self::columnName(count($headers)) . (count($rows) + 1);
        $zip->addFromString('[Content_Types].xml', self::contentTypes());
        $zip->addFromString('_rels/.rels', self::rootRelationships());
        $zip->addFromString('docProps/app.xml', self::appProperties());
        $zip->addFromString('docProps/core.xml', self::coreProperties());
        $zip->addFromString('xl/workbook.xml', self::workbook($sheetName));
        $zip->addFromString('xl/_rels/workbook.xml.rels', self::workbookRelationships());
        $zip->addFromString('xl/styles.xml', self::styles());
        $zip->addFromString(
            'xl/worksheets/sheet1.xml',
            self::worksheet($headers, $rows, $columnTypes, $columnWidths, $lastCell)
        );
        if (!$zip->close()) throw new RuntimeException('Het Excel-bestand kon niet worden afgerond.');
    }

    /** @param list<string> $headers @param list<list<mixed>> $rows @param array<int, string> $columnTypes @param list<float> $columnWidths */
    private static function worksheet(
        array $headers,
        array $rows,
        array $columnTypes,
        array $columnWidths,
        string $lastCell
    ): string {
        $columns = '';
        foreach ($headers as $index => $_header) {
            $width = $columnWidths[$index] ?? 18;
            $column = $index + 1;
            $columns .= '<col min="' . $column . '" max="' . $column . '" width="' . $width . '" customWidth="1"/>';
        }

        $sheetRows = '<row r="1" ht="24" customHeight="1">';
        foreach ($headers as $index => $header) {
            $sheetRows .= self::stringCell($index, 1, $header, 1);
        }
        $sheetRows .= '</row>';

        foreach ($rows as $rowIndex => $row) {
            $excelRow = $rowIndex + 2;
            $sheetRows .= '<row r="' . $excelRow . '">';
            foreach ($headers as $columnIndex => $_header) {
                $value = $row[$columnIndex] ?? null;
                $type = $columnTypes[$columnIndex] ?? 'string';
                if ($value === null || $value === '') {
                    $sheetRows .= self::stringCell($columnIndex, $excelRow, '');
                } elseif ($type === 'number' && is_numeric($value)) {
                    $sheetRows .= self::numberCell($columnIndex, $excelRow, (float)$value);
                } elseif ($type === 'datetime') {
                    $sheetRows .= self::dateCell($columnIndex, $excelRow, (string)$value);
                } else {
                    $sheetRows .= self::stringCell($columnIndex, $excelRow, (string)$value);
                }
            }
            $sheetRows .= '</row>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<dimension ref="A1:' . $lastCell . '"/>'
            . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            . '<sheetFormatPr defaultRowHeight="18"/>'
            . '<cols>' . $columns . '</cols>'
            . '<sheetData>' . $sheetRows . '</sheetData>'
            . '<autoFilter ref="A1:' . $lastCell . '"/>'
            . '</worksheet>';
    }

    private static function stringCell(int $columnIndex, int $row, string $value, int $style = 0): string
    {
        $reference = self::columnName($columnIndex + 1) . $row;
        return '<c r="' . $reference . '" t="inlineStr" s="' . $style . '"><is><t xml:space="preserve">'
            . self::xml(self::validXmlText($value)) . '</t></is></c>';
    }

    private static function numberCell(int $columnIndex, int $row, float $value): string
    {
        $reference = self::columnName($columnIndex + 1) . $row;
        return '<c r="' . $reference . '" s="0"><v>' . rtrim(rtrim(sprintf('%.10F', $value), '0'), '.') . '</v></c>';
    }

    private static function dateCell(int $columnIndex, int $row, string $value): string
    {
        try {
            $date = new DateTimeImmutable($value, new DateTimeZone('UTC'));
        } catch (\Throwable) {
            return self::stringCell($columnIndex, $row, $value);
        }
        $reference = self::columnName($columnIndex + 1) . $row;
        $excelEpoch = new DateTimeImmutable('1899-12-30 00:00:00', new DateTimeZone('UTC'));
        $serial = ((float)$date->format('U') - (float)$excelEpoch->format('U')) / 86400;
        return '<c r="' . $reference . '" s="2"><v>' . rtrim(rtrim(sprintf('%.10F', $serial), '0'), '.') . '</v></c>';
    }

    private static function columnName(int $number): string
    {
        $name = '';
        while ($number > 0) {
            $number--;
            $name = chr(65 + ($number % 26)) . $name;
            $number = intdiv($number, 26);
        }
        return $name;
    }

    private static function validXmlText(string $value): string
    {
        return preg_replace('/[^\x09\x0A\x0D\x20-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value) ?? '';
    }

    private static function xml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private static function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            . '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            . '</Types>';
    }

    private static function rootRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            . '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            . '</Relationships>';
    }

    private static function workbook(string $sheetName): string
    {
        $safeName = substr($sheetName, 0, 31);
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="' . self::xml($safeName) . '" sheetId="1" r:id="rId1"/></sheets></workbook>';
    }

    private static function workbookRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    private static function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd-mm-yyyy hh:mm"/></numFmts>'
            . '<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts>'
            . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF151515"/><bgColor indexed="64"/></patternFill></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>';
    }

    private static function appProperties(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Matchpoint Tournament</Application></Properties>';
    }

    private static function coreProperties(): string
    {
        $created = gmdate('Y-m-d\TH:i:s\Z');
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            . '<dc:creator>Matchpoint Tournament</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' . $created . '</dcterms:created></cp:coreProperties>';
    }
}
