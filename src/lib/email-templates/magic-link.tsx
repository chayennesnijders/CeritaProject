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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Je inloglink voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: 'bold' }}>CeritaProject</Text>
        <Heading style={h1}>Je inloglink</Heading>
        <Text style={text}>
          Met de knop hieronder log je in bij {siteName}. Deze link is tijdelijk geldig.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Inloggen
        </Button>
        <Text style={footer}>
          Heb je deze link niet aangevraagd? Dan kun je deze mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

