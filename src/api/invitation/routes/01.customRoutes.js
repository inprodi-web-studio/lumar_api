module.exports = {
    routes : [
      {
        method: "POST",
        path: "/invitations/resend/:uuid",
        handler: "invitation.resend",
      },
    ],
}