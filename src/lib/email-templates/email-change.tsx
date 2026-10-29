import { emailStyles, darkModeCss } from './theme'
const { main, container, h1, text, button, footer, link } = emailStyles
import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Bevestig je nieuwe e-mailadres voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: 'bold' }}>CeritaProject</Text>
        <Heading style={h1}>Bevestig je nieuwe e-mailadres</Heading>
        <Text style={text}>
          Je hebt gevraagd je e-mailadres voor {siteName} te wijzigen van{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          naar{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Bevestig deze wijziging met de knop hieronder:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Nieuw e-mailadres bevestigen
        </Button>
        <Text style={footer}>
          Heb je deze wijziging niet aangevraagd? Wijzig dan direct je wachtwoord.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

