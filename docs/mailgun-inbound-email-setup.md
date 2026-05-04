# Mailgun Inbound Email Setup — Helpdesk Tickets

Route incoming emails to `support@classicvisions.net` into the helpdesk
via Mailgun Routes.

## Prerequisites

- A Mailgun account with `classicvisions.net` added as a domain
- MX records pointed to Mailgun for receiving (see Step 1)

---

## Step 1 — Configure MX Records for Receiving

In your DNS provider, add these MX records so Mailgun receives mail for
`classicvisions.net`:

| Type | Name               | Priority | Value                  |
|------|--------------------|----------|------------------------|
| MX   | classicvisions.net | 10       | mxa.mailgun.org        |
| MX   | classicvisions.net | 10       | mxb.mailgun.org        |

> If you only want to route `support@` and keep other addresses on your
> current mail server, use a subdomain like `support.classicvisions.net`
> with MX records, then set the route match to
> `match_recipient("support@support.classicvisions.net")`.

---

## Step 2 — Create a Mailgun Route

Go to **Mailgun Dashboard → Receiving → Routes → Create Route**.

| Field       | Value |
|-------------|-------|
| **Priority**    | 0 |
| **Filter Expression** | `match_recipient("support@classicvisions.net")` |
| **Action — Forward** | `https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/helpdesk-inbound-email?token=YOUR_SECRET_HERE` |
| **Action — Stop** | ☑ checked (prevents further routes from firing) |

Replace `YOUR_SECRET_HERE` with the value of your `HELPDESK_INBOUND_SECRET`.

> **How auth works:** Mailgun POSTs `multipart/form-data`. The webhook
> reads the token from the `?token=` query parameter. Alternatively, you
> can omit `?token=` from the URL and instead include a hidden `token`
> field — but the query-param approach is simplest with Mailgun Routes.

---

## Step 3 — Verify

Send a test email to `support@classicvisions.net`. Within a few seconds
you should see a new ticket appear in Admin → Helpdesk.

Check the Mailgun **Logs** tab for delivery confirmation, and the edge
function logs for any errors.

---

## Mailgun Form Fields Mapping

Mailgun POSTs these fields (among others) which the edge function reads:

| Mailgun field    | Maps to           |
|------------------|-------------------|
| `sender`         | `from`            |
| `recipient`      | `to`              |
| `subject`        | `subject`         |
| `body-plain`     | `body_text`       |
| `body-html`      | `body_html`       |
| `Message-Id`     | `message_id`      |
| `Date`           | `date`            |

---

## Troubleshooting

- **401 Unauthorized** — Double-check the token in the URL matches your
  `HELPDESK_INBOUND_SECRET` exactly (no trailing spaces).
- **No emails arriving** — Verify MX records are propagated (`dig MX classicvisions.net`).
  Mailgun shows receiving status under **Domains → classicvisions.net**.
- **Duplicate emails** — The webhook deduplicates by `Message-Id`, so
  retries are safe.
