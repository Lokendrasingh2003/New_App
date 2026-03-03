const padTwoDigits = (value: number) => String(value).padStart(2, '0')

export const toLocalDateISO = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = padTwoDigits(date.getMonth() + 1)
  const day = padTwoDigits(date.getDate())
  return `${year}-${month}-${day}`
}

export const buildCsvFilename = (base: string, filtered: boolean, dateISO: string) => {
  const suffix = filtered ? '_filtered' : ''
  return `${base}${suffix}_${dateISO}.csv`
}
