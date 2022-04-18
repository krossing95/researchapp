const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const OAuth2Client = new OAuth2(
    process.env.OAUTH_CLIENT, process.env.OAUTH_SECRET, process.env.OAUTH_REDIRECT_URL
)
OAuth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
})

const createChannel = async (next) => {
    try {
        const accessToken = await OAuth2Client.getAccessToken()

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: `${process.env.GMAIL_USER}@gmail.com`,
                clientId: process.env.OAUTH_CLIENT,
                clientSecret: process.env.OAUTH_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken
            },
            tls: {
                rejectUnauthorized: false
            }
        })

        return next(transporter)
    } catch (error) {
        return { status: false, error }
    }
}

module.exports = {
    authVerifier: async (receiver, link) => {
        await createChannel(async (transporter) => {
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
                        return { status: true, message: 'Message was successfully sent!' }
                    }
                    return { status: false }
                }
                return { status: false }
            }).catch(error => {
                return { status: false, error }
            })
            return mail
        })
        return null
    },
    passwordResetLink: async (receiver, link) => {
        await createChannel(async (transporter) => {
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
        })
        return null
    },
    userUpdateInformer: async (receiver, firstname, lastname, phone, story, gender, title) => {
        await createChannel(async (transporter) => {
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
                        ${story.length !== 0 ? `<p><b>About you: </b> ${story}</p>` : ''}
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
        })
        return null
    }
}