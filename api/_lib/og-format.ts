export function formatOgAmount(amount: number, currency: string): string {
  const normalizedCurrency = (currency || 'VND').toUpperCase()
  const rounded = Math.round(amount)
  const absolute = Math.abs(rounded).toString()
  const withDots = absolute.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${rounded < 0 ? '-' : ''}${withDots} ${normalizedCurrency}`
}

export function formatOgDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
      return dateStr
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function sanitizeOgText(input: string): string {
  return input.replace(/[₫¥€£₹₩₪₱₴₸₺₼₽]/g, '').trim()
}
