import { emailStyles, darkModeCss } from './theme'
const { main, container, h1, text, button, footer } = emailStyles
import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Kies een nieuw wachtwoord voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: 'bold' }}>CeritaProject</Text>
        <Heading style={h1}>Kies een nieuw wachtwoord</Heading>
        <Text style={text}>
          We kregen een verzoek om je wachtwoord te wijzigen voor {siteName}. Kies met de knop hieronder een nieuw wachtwoord.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Nieuw wachtwoord kiezen
        </Button>
        <Text style={footer}>
          Heb je dit niet aangevraagd? Negeer deze mail; je wachtwoord blijft hetzelfde.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

