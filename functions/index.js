const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// 1. Transactional Email helper (uses nodemailer + SMTP). Configure via
// `firebase functions:config:set smtp.host="..." smtp.port="..." smtp.secure="true|false" smtp.user="..." smtp.pass="..." mail.from="helpdesk@..."`
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  try {
    const cfg = functions.config().smtp || {};
    if (!cfg.host || !cfg.user || !cfg.pass) {
      console.warn('SMTP config not found; email will be logged only.');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: parseInt(cfg.port || '587', 10),
      secure: (cfg.secure === 'true' || cfg.secure === true),
      auth: {
        user: cfg.user,
        pass: cfg.pass
      }
    });
    return transporter;
  } catch (e) {
    console.warn('Failed to create transporter', e);
    return null;
  }
};

const sendEmail = async (to, subject, body) => {
  const mailFrom = (functions.config().mail && functions.config().mail.from) || 'helpdesk@university.edu.ng';
  const t = getTransporter();
  if (!t) {
    console.log('[EMAIL LOG] No SMTP configured — logging email:');
    console.log(`To: ${to}\nSubject: ${subject}\nBody: ${body}`);
    return;
  }

  await t.sendMail({
    from: mailFrom,
    to,
    subject,
    html: body
  });
};

// Trigger when ticket status changes
exports.notifyOnStatusChange = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    // Check if status changed
    if (newData.status !== oldData.status) {
      const message = {
        notification: {
          title: 'Ticket Status Updated',
          body: `${newData.id}: Status changed to ${newData.status}`
        }
      };

      // Callable function: send resolve email for a ticket (can be invoked from client)
      exports.sendResolveEmail = functions.https.onCall(async (data, context) => {
        const ticketId = data && data.ticketId;
        if (!ticketId) throw new functions.https.HttpsError('invalid-argument', 'Missing ticketId');

        // Optional: enforce authenticated callers
        // if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required');

        const ticketRef = db.collection('tickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) throw new functions.https.HttpsError('not-found', 'Ticket not found');
        const ticket = ticketSnap.data();

        const submitterDoc = await db.collection('users').doc(ticket.submittedById).get();
        let submitterEmail = null;
        let submitterName = null;
        if (submitterDoc.exists) {
          submitterEmail = submitterDoc.data().email;
          submitterName = submitterDoc.data().name;
        } else if (ticket.guestEmail) {
          submitterEmail = ticket.guestEmail;
          submitterName = ticket.guestName || 'Guest';
        }

        if (!submitterEmail) throw new functions.https.HttpsError('failed-precondition', 'No email available for ticket submitter');

        const discussion = (ticket.comments || []).filter(c => !c.isInternal).map(c => {
          const time = c.time || '';
          return `<div style="margin-bottom:0.5rem;"><strong>${c.author}</strong> <span style="color:#666;font-size:0.9rem;">${time}</span><div style="margin:0.25rem 0;">${c.text}</div></div>`;
        }).join('\n') || `<div>${ticket.description || ''}</div>`;

        const body = `
          <p>Hello ${submitterName || 'there'},</p>
          <p>Your ticket <strong>${ticket.id}</strong> has been updated to <strong>${ticket.status}</strong>.</p>
          <h4>Discussion / Latest Messages</h4>
          <div>${discussion}</div>
          <p style="margin-top:1rem;">Regards,<br/>UNIJOS ICT Helpdesk</p>
        `;

        await sendEmail(submitterEmail, `Your Ticket ${ticket.id} is now ${ticket.status}`, body);

        return { success: true };
      });
      
      // Notify submitter via Push or email
      const submitter = await db.collection('users').doc(newData.submittedById).get();
      let submitterEmail = null;
      let submitterName = null;
      let hasValidUser = false;

      if (submitter.exists) {
         const submitterData = submitter.data();
         submitterEmail = submitterData.email;
         submitterName = submitterData.name;
         hasValidUser = true;

         if (submitterData.notificationToken) {
           await admin.messaging().sendToDevice(
             submitterData.notificationToken,
             message
           );
         }
      } else if (newData.guestEmail) {
         submitterEmail = newData.guestEmail;
         submitterName = newData.guestName || 'Guest';
      }

      // 2. Transactional Email on Status Change
          if (submitterEmail && ['resolved', 'closed', 'in-progress'].includes(newData.status)) {
             // Build discussion/message body: include ticket summary and non-internal comments
             const discussion = (newData.comments || []).filter(c => !c.isInternal).map(c => {
               const time = c.time || '';
               return `<div style="margin-bottom:0.5rem;"><strong>${c.author}</strong> <span style="color:#666;font-size:0.9rem;">${time}</span><div style="margin:0.25rem 0;">${c.text}</div></div>`;
             }).join('\n') || `<div>${newData.description || ''}</div>`;

             const body = `
               <p>Hello ${submitterName || 'there'},</p>
               <p>Your ticket <strong>${newData.id}</strong> has been updated to <strong>${newData.status}</strong>.</p>
               <h4>Discussion / Latest Messages</h4>
               <div>${discussion}</div>
               <p style="margin-top:1rem;">Regards,<br/>UNIJOS ICT Helpdesk</p>
             `;

             await sendEmail(
               submitterEmail,
               `Your Ticket ${newData.id} is now ${newData.status}`,
               body
             );
          }

      // Create notification record only for registered user
      if (hasValidUser) {
        await db.collection('notifications')
          .doc(newData.submittedById)
          .collection('items')
          .add({
            type: 'status-change',
            title: 'Ticket Status Updated',
            message: `Ticket ${newData.id}: Status changed to ${newData.status}`,
            ticketId: newData.id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
      }
    }
  });

// Trigger when comment is added
exports.notifyOnComment = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (newData.comments.length > oldData.comments.length) {
      const newComment = newData.comments[newData.comments.length - 1];
      
      const notifyUsers = [newData.submittedById];
      if (newData.assignedId) notifyUsers.push(newData.assignedId);
      
      for (const userId of notifyUsers) {
        if (userId !== newComment.authorId) {
            await db.collection('notifications')
            .doc(userId)
            .collection('items')
            .add({
                type: 'comment',
                title: 'New Comment',
                message: `${newComment.author} commented on ${newData.id}`,
                ticketId: newData.id,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      }
    }
  });

// 3. SLA Escalation Timer (Scheduled every 15 minutes)
exports.checkSlaBreach = functions.pubsub.schedule('every 15 minutes').onRun(async (context) => {
    console.log('Running SLA Breach check...');
    
    const now = new Date();
    // Fetch tickets that are not resolved or closed
    const activeTickets = await db.collection('tickets')
        .where('status', 'in', ['open', 'in-progress'])
        .get();

    const slaLimitsHours = {
        low: 72,
        medium: 24,
        high: 4,
        critical: 1
    };

    const batch = db.batch();
    let breachesFound = 0;

    for (const doc of activeTickets.docs) {
        const ticket = doc.data();
        const priority = ticket.priority || 'medium';
        const limitHours = slaLimitsHours[priority] || 24;
        
        const createdAt = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed > limitHours) {
            // SLA Breached
            const docRef = db.collection('tickets').doc(doc.id);
            batch.update(docRef, { status: 'escalated', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            breachesFound++;
            
            // Generate notifications to admins
            console.log(`[SLA ESCALATION] Ticket ${ticket.id} breached SLA of ${limitHours}h`);
        }
    }

    if (breachesFound > 0) {
        await batch.commit();
        console.log(`Escalated ${breachesFound} tickets.`);
    }
    
    return null;
});
