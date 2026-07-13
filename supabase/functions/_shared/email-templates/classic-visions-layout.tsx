/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Column,
} from 'npm:@react-email/components@0.0.22'

interface ClassicVisionsEmailLayoutProps {
  preview: string
  title: React.ReactNode
  children: React.ReactNode
  eyebrow?: string
  unsubscribeUrl?: string
}

/**
 * Shared frame for every Supabase-rendered Classic Visions email. Content stays
 * in its owning template; this component owns the brand treatment and contact
 * footer so auth and transactional messages render consistently.
 */
export const ClassicVisionsEmailLayout = ({
  preview,
  title,
  children,
  eyebrow = 'Company Update',
  unsubscribeUrl,
}: ClassicVisionsEmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Row>
            <Column style={logoCell}>
              <Img
                alt="Classic Visions"
                height="44"
                src="https://classicvisions.net/favicon.ico"
                style={logo}
                width="44"
              />
            </Column>
            <Column style={wordmarkCell}>
              <Text style={brandName}>CLASSIC VISIONS</Text>
              <Text style={brandTagline}>OPTICAL · BARBADOS</Text>
            </Column>
          </Row>
        </Section>

        <Section style={content}>
          <Text style={eyebrowStyle}>{eyebrow}</Text>
          <Heading style={titleStyle}>{title}</Heading>
          <Section style={accent}>&nbsp;</Section>
          {children}
        </Section>

        <Section style={footer}>
          <Text style={footerBrand}>CLASSIC VISIONS</Text>
          <Text style={contact}>
            +1 246 433-4928 · +1 (246) 243-9703<br />
            <Link href="mailto:info@classicvisions.net" style={contactLink}>info@classicvisions.net</Link>
            {' · '}
            <Link href="https://www.classicvisions.net" style={contactLink}>www.classicvisions.net</Link>
          </Text>
          <Section style={footerRule} />
          <Text style={legal}>
            Classic Visions — wholesale optical supply, Barbados.<br />
            You are receiving this email as a valued Classic Visions trade partner. This message and any attachments are confidential.
          </Text>
          {unsubscribeUrl ? (
            <Text style={footerLinks}>
              <Link href={unsubscribeUrl} style={mutedLink}>Unsubscribe</Link>
            </Text>
          ) : null}
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#F4F2ED',
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  margin: '0',
  padding: '8px 14px',
}

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #ece9e0',
  borderRadius: '14px',
  boxShadow: '0 10px 40px -10px rgba(11,30,53,.18)',
  margin: '0 auto',
  maxWidth: '600px',
  overflow: 'hidden',
  width: '100%',
}

const header = { backgroundColor: '#ffffff', borderBottom: '2px solid #C89130', padding: '28px 44px 20px' }
const logoCell = { padding: '0 13px 0 0', verticalAlign: 'middle', width: '44px' }
const logo = { display: 'block', height: '44px', width: '44px' }
const wordmarkCell = { padding: '0', verticalAlign: 'middle' }
const brandName = { color: '#0B1E35', fontSize: '18px', fontWeight: '800' as const, letterSpacing: '0.04em', lineHeight: '1', margin: '0' }
const brandTagline = { color: '#1A8A9C', fontSize: '8.5px', fontWeight: '700' as const, letterSpacing: '0.3em', lineHeight: '1.4', margin: '6px 0 0' }
const content = { padding: '38px 44px 30px' }
const eyebrowStyle = { color: '#1A8A9C', fontSize: '11px', fontWeight: '700' as const, letterSpacing: '0.18em', lineHeight: '1', margin: '0 0 14px', textTransform: 'uppercase' as const }
const titleStyle = { color: '#0B1E35', fontSize: '27px', fontWeight: '800' as const, letterSpacing: '-0.02em', lineHeight: '1.12', margin: '0 0 14px' }
const accent = { backgroundColor: '#C89130', fontSize: '0', height: '3px', lineHeight: '0', margin: '0 0 22px', width: '44px' }
const footer = { backgroundColor: '#0B1E35', padding: '30px 44px 34px' }
const footerBrand = { color: '#F4F2ED', fontSize: '13px', fontWeight: '800' as const, letterSpacing: '0.05em', lineHeight: '1', margin: '0 0 12px' }
const contact = { color: '#9fb0c4', fontSize: '12.5px', fontWeight: '400' as const, lineHeight: '1.7', margin: '0' }
const contactLink = { color: '#3fb5c6', textDecoration: 'none' }
const footerRule = { backgroundColor: 'rgba(255,255,255,.13)', height: '1px', margin: '16px 0' }
const legal = { color: '#718498', fontSize: '11px', fontWeight: '400' as const, lineHeight: '1.6', margin: '0' }
const footerLinks = { fontSize: '11px', lineHeight: '1.6', margin: '9px 0 0' }
const mutedLink = { color: '#9fb0c4', textDecoration: 'underline' }
