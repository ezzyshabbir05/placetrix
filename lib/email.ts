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
