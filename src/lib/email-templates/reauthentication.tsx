import { emailStyles, darkModeCss } from './theme'
const { main, container, h1, text, footer, codeStyle } = emailStyles
import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je bevestigingscode voor CeritaProject</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...text, fontWeight: 'bold' }}>CeritaProject</Text>
        <Heading style={h1}>Bevestig dat jij het bent</Heading>
        <Text style={text}>Gebruik deze code om te bevestigen dat jij het bent:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Deze code is tijdelijk geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

