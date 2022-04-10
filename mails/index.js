const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    secure: false,
    auth: {
        user: `${process.env.GMAIL_USER}@gmail.com`,
        pass: `${process.env.GMAIL_PASSWORD}`
    }
});

module.exports = {
    authVerifier: async (receiver, link) => {
        const mail = await transporter.sendMail({
            from: `"${process.env.APP_NAME}" ${process.env.GMAIL_USER}@gmail.com`,
            to: `${receiver}`,
            subject: "User Account Verification",
            html: `
                    <p>Welcome to ${process.env.APP_NAME}!. You may please click on the link below to get verified or ignore if you did not intend to register with us.</p>
                    <p><b>Due to security reasons, the link is only usable within one hour.</b></p>
                    <br />
                    <a style="text-decoration: none" href="${link}" target="_blank">VERIFY ACCOUNT</a>
                `,
        }).then(info => {
            if (info.accepted !== undefined) {
                if (info.accepted[0] === receiver) {
                    return { status: true, message: 'Message was successfully sent!', mailObj: info }
                }
                return { status: false }
            }
            return { status: false }
        }).catch(error => {
            return { status: false, error }
        });

        return mail;
    },
    passwordResetLink: async (receiver, link) => {
        const mail = await transporter.sendMail({
            from: `"${process.env.APP_NAME}" ${process.env.GMAIL_USER}@gmail.com`,
            to: `${receiver}`,
            subject: "User Password Reset",
            html: `
                    <p>We have received your request to change your password. Please click on the link below to execute the action.</p>
                    <p><b>Due to security reasons, the link is only usable within 30 minutes.</b></p>
                    <br />
                    <a style="text-decoration: none" href="${link}" target="_blank">REDIRECT ME TO PASSWORD RESET PAGE</a>
                `,
        }).then(info => {
            if (info.accepted !== undefined) {
                if (info.accepted[0] === receiver) {
                    return { status: true, message: 'Message was successfully sent!' }
                }
                return { status: false }
            }
            return { status: false }
        }).catch(error => {
            return { status: false, error }
        });

        return mail;
    },
    userUpdateInformer: async (receiver, firstname, lastname, phone, story, gender, title) => {
        const mail = await transporter.sendMail({
            from: `"${process.env.APP_NAME}" ${process.env.GMAIL_USER}@gmail.com`,
            to: `${receiver}`,
            subject: "Automatic User Update Informer",
            html: `
                    <p>We like to bring to your notice that your account has been updated. The following are your new account details;</p>
                    <p><b>Title: ${title}</b></p>
                    <p><b>Firstname: ${firstname}</b></p>
                    <p><b>Lastname: ${lastname}</b></p>
                    <p><b>Gender: ${gender}</b></p>
                    <p><b>Email: ${receiver}</b></p>
                    <p><b>Phone: ${phone}</b></p>
                    ${ story.length !==0 ? `<p><b>About you: </b> ${story}</p>` : '' }
                    <br />
                    <p>Please report to the administrator if the update was not in your prior notice or ignore if otherwise.</p>
                    <br />
                    <p>${process.env.APP_NAME} Team</p>
                `,
        }).then(info => {
            if (info.accepted !== undefined) {
                if (info.accepted[0] === receiver) {
                    return { status: true, message: 'Message was successfully sent!' }
                }
                return { status: false }
            }
            return { status: false }
        }).catch(error => {
            return { status: false, error }
        });

        return mail;
    }
}