// Email-safe equivalents of the app's semantic palette (mail clients cannot use CSS variables).
export const emailColors = {
  background: '#ffffff',
  ink: '#211c1a',
  blush: '#efa8c1',
  cocoa: '#674536',
  cream: '#faf2e6',
}

export const emailStyles = {
  main: { backgroundColor: emailColors.background, fontFamily: 'Arial, sans-serif' },
  container: { maxWidth: '520px', padding: '32px 24px', borderTop: `6px solid ${emailColors.blush}` },
  h1: { fontSize: '24px', fontWeight: 'bold' as const, color: emailColors.ink, margin: '0 0 24px' },
  text: { fontSize: '16px', color: emailColors.cocoa, lineHeight: '1.6', margin: '0 0 24px' },
  link: { color: emailColors.cocoa, textDecoration: 'underline' },
  button: { backgroundColor: emailColors.ink, color: emailColors.blush, fontSize: '16px', fontWeight: 'bold' as const, border: `2px solid ${emailColors.ink}`, borderRadius: '8px', padding: '14px 24px', textDecoration: 'none' },
  footer: { fontSize: '13px', color: emailColors.cocoa, lineHeight: '1.5', margin: '32px 0 0' },
  codeStyle: { fontFamily: 'monospace', fontSize: '28px', fontWeight: 'bold' as const, color: emailColors.ink, backgroundColor: emailColors.cream, padding: '16px', margin: '0 0 24px' },
}

export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: ${emailColors.blush} !important; color: ${emailColors.ink} !important; }
  }
  [data-ogsc] .dm-btn { background-color: ${emailColors.blush} !important; color: ${emailColors.ink} !important; }
  [data-ogsb] .dm-btn { background-color: ${emailColors.blush} !important; color: ${emailColors.ink} !important; }
`