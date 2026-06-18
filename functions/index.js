const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// 1. Transactional Email Stub (using generic console log or mailgun stub)
const sendEmail = async (to, subject, body) => {
    // In a real environment, you would use:
    // const mailgun = require('mailgun-js')({apiKey: functions.config().mailgun.key, domain: functions.config().mailgun.domain});
    // await mailgun.messages().send({from: 'helpdesk@university.edu.ng', to, subject, html: body});
    console.log(`[EMAIL SEND STUB] To: ${to} | Subject: ${subject}`);
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
      
      // Notify submitter via Push
      const submitter = await db.collection('users').doc(newData.submittedById).get();
      
      if (submitter.exists) {
         if (submitter.data().notificationToken) {
           await admin.messaging().sendToDevice(
             submitter.data().notificationToken,
             message
           );
         }
         
         // 2. Transactional Email on Status Change
         if (['resolved', 'closed', 'in-progress'].includes(newData.status)) {
             await sendEmail(
                 submitter.data().email, 
                 `Your Ticket ${newData.id} is now ${newData.status}`, 
                 `<p>Hello ${submitter.data().name},</p><p>Your ticket has been updated to <strong>${newData.status}</strong>.</p>`
             );
         }
      }
      
      // Create notification record
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
