type CsvValue = string | number | boolean | null | undefined

type CsvRow = Record<string, CsvValue>

const escapeCsvCell = (value: CsvValue): string => {
  if (value === null || value === undefined) {
    return ''
  }

  const normalized =
    typeof value === 'boolean'
      ? value
        ? 'true'
        : 'false'
      : String(value)

  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return normalized
}

export const toCsv = (rows: CsvRow[]): string => {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const headerLine = headers.map((header) => escapeCsvCell(header)).join(',')

  const bodyLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(','))

  return [headerLine, ...bodyLines].join('\r\n')
}

export const downloadCsv = (filename: string, csvText: string): void => {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
