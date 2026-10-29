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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Bevestig je e-mailadres voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: 'bold' }}>CeritaProject</Text>
        <Heading style={h1}>Bevestig je e-mailadres</Heading>
        <Text style={text}>
          Welkom bij{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Bevestig je e-mailadres (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) met de knop hieronder:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Bevestig mijn e-mailadres
        </Button>
        <Text style={footer}>
          Heb je geen account aangemaakt? Dan kun je deze mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

