import nodemailer from "nodemailer"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"

export async function sendTicketEmail(ticketId: string): Promise<{ success: boolean; data?: any; error?: string; mock?: boolean }> {
  try {
    // 1. Initialize Supabase Admin Client
    const supabase = createAdminClient()

    // 2. Fetch the ticket with event details
    const { data: ticket, error: ticketError } = await (supabase as any)
      .from("event_tickets")
      .select(`
        id,
        status,
        candidate_id,
        event_id,
        events (
          title,
          date,
          venue,
          description,
          duration_minutes,
          speaker_name
        )
      `)
      .eq("id", ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      console.error("Error fetching ticket for email:", ticketError)
      return { success: false, error: ticketError?.message || "Ticket not found" }
    }

    const ticketData = ticket as any

    // Fetch candidate profile details
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("id", ticketData.candidate_id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error("Error fetching profile for ticket email:", profileError)
      return { success: false, error: profileError?.message || "Candidate profile not found" }
    }

    const profileData = profile as any
    const event = ticketData.events as any
    if (!event) {
      console.error("Event details not found for ticket:", ticketId)
      return { success: false, error: "Event details not found" }
    }

    const isConfirmed = ticketData.status === "Confirmed"
    
    // Generate QR Code as Data URL (base64)
    let qrCodeDataUrl: string | null = null
    if (isConfirmed) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
          width: 250,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        })
      } catch (qrErr) {
        console.error("Failed to generate QR Code for ticket email:", qrErr)
      }
    }

    const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    const subject = isConfirmed 
      ? `🎫 Ticket Confirmed: ${event.title}`
      : `⏳ Waitlisted: ${event.title}`

    const recipientName = profileData.full_name || `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Attendee"

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: none;
              width: 100% !important;
            }
            .wrapper {
              width: 100%;
              background-color: #f4f4f7;
              padding: 24px 0;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              border: 1px solid #e1e4e8;
            }
            .header {
              background-color: ${isConfirmed ? "#10b981" : "#f59e0b"};
              color: #ffffff;
              padding: 32px 24px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .header p {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 32px 24px;
            }
            .greeting {
              font-size: 15px;
              margin-top: 0;
              margin-bottom: 20px;
              line-height: 1.5;
              color: #334155;
            }
            .greeting strong {
              color: #0f172a;
            }
            .ticket-card {
              background-color: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              margin-bottom: 24px;
            }
            .event-title {
              font-size: 18px;
              font-weight: 700;
              margin: 0 0 8px 0;
              color: #0f172a;
            }
            .speaker {
              font-size: 14px;
              color: #475569;
              margin: 0 0 16px 0;
              font-style: italic;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .details-table td {
              padding: 6px 0;
              font-size: 13px;
              vertical-align: top;
            }
            .details-label {
              font-weight: 600;
              color: #64748b;
              width: 90px;
            }
            .details-value {
              font-weight: 500;
              color: #0f172a;
            }
            .qr-container {
              margin: 24px 0 12px 0;
              display: inline-block;
              background: #ffffff;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .qr-img {
              display: block;
              margin: 0 auto;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 11px;
              color: #64748b;
              margin-top: 8px;
            }
            .badge {
              display: inline-block;
              padding: 6px 12px;
              font-size: 11px;
              font-weight: 700;
              border-radius: 9999px;
              margin-bottom: 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge-confirmed {
              background-color: #d1fae5;
              color: #065f46;
            }
            .badge-waitlisted {
              background-color: #fef3c7;
              color: #92400e;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              margin-top: 32px;
              border-top: 1px solid #e2e8f0;
              padding-top: 24px;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <h1>${isConfirmed ? "RSVP Confirmed!" : "You're on the Waitlist"}</h1>
                <p>${isConfirmed ? "Your entry ticket is ready." : "We'll let you know if a spot opens up."}</p>
              </div>
              <div class="content">
                <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
                <p class="greeting">
                  ${isConfirmed 
                    ? `Your registration for <strong>${event.title}</strong> has been confirmed. Below is your event ticket detail.`
                    : `You have been added to the waitlist for <strong>${event.title}</strong>. If a seat becomes available due to a cancellation, you will be automatically promoted and notified via email.`
                  }
                </p>
                
                <div class="ticket-card">
                  <div class="badge ${isConfirmed ? "badge-confirmed" : "badge-waitlisted"}">
                    ${ticketData.status}
                  </div>
                  <h3 class="event-title">${event.title}</h3>
                  ${event.speaker_name ? `<p class="speaker">by ${event.speaker_name}</p>` : ""}
                  
                  <table class="details-table">
                    <tr>
                      <td class="details-label">Date:</td>
                      <td class="details-value">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td class="details-label">Venue:</td>
                      <td class="details-value">${event.venue}</td>
                    </tr>
                    ${event.duration_minutes ? `
                    <tr>
                      <td class="details-label">Duration:</td>
                      <td class="details-value">${event.duration_minutes} minutes</td>
                    </tr>
                    ` : ""}
                  </table>
                  
                  ${isConfirmed && qrCodeDataUrl ? `
                    <div class="qr-container">
                      <img src="cid:ticket_qr" alt="Ticket QR Code" width="160" height="160" class="qr-img" />
                    </div>
                    <div class="ticket-id">Ticket ID: ${ticketData.id}</div>
                  ` : ""}
                </div>
                
                <p class="greeting" style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
                  ${isConfirmed 
                    ? "Please keep this email handy or present the QR code at the event entrance for quick check-in check."
                    : "No action is needed from your end right now. We will update you if your status changes."
                  }
                </p>
                
                <div class="footer">
                  <p>This is an automated event confirmation email from Placetrix.</p>
                  <p>&copy; ${new Date().getFullYear()} Placetrix. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete in environment variables.")
      console.log("------------------ MOCK EMAIL LOG (SMTP FALLBACK) ------------------")
      console.log(`To: ${profileData.email}`)
      console.log(`Subject: ${subject}`)
      console.log(`Status: ${ticketData.status}`)
      console.log(`Event: ${event.title}`)
      console.log(`Attendee: ${recipientName}`)
      console.log(`Ticket ID: ${ticketData.id}`)
      console.log("--------------------------------------------------------------------")
      return { success: true, mock: true }
    }

    // 3. Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // True for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    // Setup attachments (CID inline image for QR code)
    const attachments: any[] = []
    if (isConfirmed && qrCodeDataUrl) {
      const base64Data = qrCodeDataUrl.split(",")[1]
      attachments.push({
        filename: "qrcode.png",
        content: Buffer.from(base64Data, "base64"),
        cid: "ticket_qr",
      })
    }

    // 4. Send email
    const mailOptions = {
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: profileData.email,
      subject,
      html,
      attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, data: info }
  } catch (err: any) {
    console.error("Failed to send email via SMTP:", err)
    return { success: false, error: err.message || "Internal error in sendTicketEmail via SMTP" }
  }
}

export async function sendNewSupportTicketNotification(ticket: {
  id: string;
  title: string;
  description: string;
  email: string;
  userName?: string;
}): Promise<{ success: boolean; error?: string; mock?: boolean }> {
  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"

    const subject = `🎫 New Support Ticket: ${ticket.title}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
              width: 100% !important;
            }
            .wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #e1e4e8;
            }
            .header {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              color: #ffffff;
              padding: 28px 28px 24px;
            }
            .header-badge {
              display: inline-block;
              background: rgba(255,255,255,0.12);
              border: 1px solid rgba(255,255,255,0.18);
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 9999px;
              margin-bottom: 12px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: -0.3px;
              line-height: 1.3;
            }
            .header p {
              margin: 6px 0 0;
              font-size: 13px;
              opacity: 0.65;
            }
            .content { padding: 28px; }
            .field {
              margin-bottom: 18px;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 5px;
            }
            .field-value {
              font-size: 14px;
              color: #0f172a;
              line-height: 1.55;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              word-break: break-word;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 12px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 12px;
              color: #475569;
              margin-bottom: 20px;
              display: block;
            }
            .cta {
              text-align: center;
              margin: 24px 0 8px;
            }
            .cta a {
              display: inline-block;
              background: #0f172a;
              color: #fff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              padding: 12px 28px;
              border-radius: 9999px;
              letter-spacing: 0.01em;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              padding: 20px 28px;
              border-top: 1px solid #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="header-badge">Support Ticket</div>
                <h1>New ticket submitted</h1>
                <p>A user has opened a new support request on PlaceTrix.</p>
              </div>
              <div class="content">
                <span class="ticket-id">Ticket ID: ${ticket.id}</span>

                <div class="field">
                  <div class="field-label">Subject</div>
                  <div class="field-value">${ticket.title}</div>
                </div>

                <div class="field">
                  <div class="field-label">Description</div>
                  <div class="field-value">${ticket.description.replace(/\n/g, "<br>")}</div>
                </div>

                <div class="field">
                  <div class="field-label">Submitted By</div>
                  <div class="field-value">${ticket.userName ? `${ticket.userName} &lt;${ticket.email}&gt;` : ticket.email}</div>
                </div>

                <div class="field">
                  <div class="field-label">Submitted At</div>
                  <div class="field-value">${new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</div>
                </div>

                <div class="cta">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"}/support/${ticket.id}">View Ticket in Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated notification from PlaceTrix Support System.</p>
                <p>&copy; ${new Date().getFullYear()} PlaceTrix. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete. Skipping notification email.")
      console.log("[MOCK] New support ticket notification:")
      console.log(`  To: 4grid.tech@gmail.com`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Ticket ID: ${ticket.id}`)
      return { success: true, mock: true }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: "4grid.tech@gmail.com",
      subject,
      html,
    })

    return { success: true }
  } catch (err: any) {
    console.error("[EMAIL SERVICE] Failed to send new ticket notification:", err)
    return { success: false, error: err.message || "Internal error in sendNewSupportTicketNotification" }
  }
}

export async function sendTicketCreatorConfirmation(ticket: {
  id: string;
  title: string;
  description: string;
  email: string;
  userName?: string;
}): Promise<{ success: boolean; error?: string; mock?: boolean }> {
  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"

    const recipientName = ticket.userName || "there"
    const subject = `✅ Support Ticket Received – ${ticket.title}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
              width: 100% !important;
            }
            .wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #e1e4e8;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: #ffffff;
              padding: 28px 28px 24px;
            }
            .header-badge {
              display: inline-block;
              background: rgba(255,255,255,0.15);
              border: 1px solid rgba(255,255,255,0.25);
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 9999px;
              margin-bottom: 12px;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.3px;
              line-height: 1.3;
            }
            .header p {
              margin: 6px 0 0;
              font-size: 13px;
              opacity: 0.75;
            }
            .content { padding: 28px; }
            .greeting {
              font-size: 15px;
              color: #334155;
              line-height: 1.6;
              margin: 0 0 20px;
            }
            .greeting strong { color: #0f172a; }
            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 18px 20px;
              margin-bottom: 20px;
            }
            .info-box .ticket-id-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 4px;
            }
            .info-box .ticket-id-value {
              font-family: monospace;
              font-size: 13px;
              color: #0f172a;
              font-weight: 600;
            }
            .divider {
              border: none;
              border-top: 1px solid #e2e8f0;
              margin: 14px 0;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 3px;
            }
            .field-value {
              font-size: 14px;
              color: #0f172a;
              line-height: 1.55;
              word-break: break-word;
              margin-bottom: 14px;
            }
            .note {
              font-size: 13px;
              color: #475569;
              line-height: 1.6;
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 24px;
            }
            .cta {
              text-align: center;
              margin: 4px 0 12px;
            }
            .cta a {
              display: inline-block;
              background: #10b981;
              color: #fff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              padding: 12px 28px;
              border-radius: 9999px;
              letter-spacing: 0.01em;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              padding: 20px 28px;
              border-top: 1px solid #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="header-badge">Ticket Received</div>
                <h1>We've got your request!</h1>
                <p>Our support team will get back to you shortly.</p>
              </div>
              <div class="content">
                <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
                <p class="greeting">
                  Thank you for reaching out. Your support ticket has been successfully created and is now in our queue.
                  We'll review it and respond as soon as possible.
                </p>

                <div class="info-box">
                  <div class="ticket-id-label">Ticket Reference</div>
                  <div class="ticket-id-value">${ticket.id}</div>
                  <hr class="divider">
                  <div class="field-label">Subject</div>
                  <div class="field-value">${ticket.title}</div>
                  <div class="field-label">Your Message</div>
                  <div class="field-value">${ticket.description.replace(/\n/g, "<br>")}</div>
                </div>

                <div class="note">
                  💡 You can track the status of your ticket and read any replies from our team by visiting your dashboard.
                </div>

                <div class="cta">
                  <a href="${siteUrl}/gethelp/${ticket.id}">Track Your Ticket</a>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated confirmation from PlaceTrix Support.</p>
                <p>Please do not reply directly to this email.</p>
                <p>&copy; ${new Date().getFullYear()} PlaceTrix. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete. Skipping creator confirmation email.")
      console.log("[MOCK] Ticket creator confirmation:")
      console.log(`  To: ${ticket.email}`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Ticket ID: ${ticket.id}`)
      return { success: true, mock: true }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: ticket.email,
      subject,
      html,
    })

    return { success: true }
  } catch (err: any) {
    console.error("[EMAIL SERVICE] Failed to send ticket creator confirmation:", err)
    return { success: false, error: err.message || "Internal error in sendTicketCreatorConfirmation" }
  }
}
